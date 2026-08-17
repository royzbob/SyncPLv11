import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = 3000;

// Initialize Firebase Admin
let adminDb: Firestore | null = null;
try {
  if (getApps().length === 0) {
    initializeApp({
      projectId: "syncpl-fe47a",
    });
  }
  adminDb = getFirestore("ai-studio-syncpltradingdas-0abcfe65-6185-44e8-a1d7-a23a3b273fce");
  console.log("Firebase Admin successfully initialized.");
} catch (e) {
  console.error("Firebase Admin initialization failed. Server will continue with graceful fallback:", e);
}

// Lazy Stripe initializer
let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      stripeClient = new Stripe(secretKey, {
        apiVersion: "2025-01-27.acacia" as any,
      });
    }
  }
  return stripeClient;
}

// Helper to update subscription in Firestore
async function updateSubscriptionInDb(userId: string, data: any) {
  if (!adminDb) {
    console.warn("Cannot update DB: Firebase Admin DB is not initialized.");
    return;
  }
  try {
    const userRef = adminDb.collection("users").doc(userId).collection("profile").doc("info");
    await userRef.set(data, { merge: true });
    console.log(`Updated Firestore subscription metadata for user ${userId}:`, data);
  } catch (e) {
    console.error(`Error updating Firestore subscription for user ${userId}:`, e);
  }
}

// Helper to auto-create products and prices in Stripe
async function getOrCreatePrice(stripe: Stripe): Promise<string> {
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find((p) => p.name === "SyncPL Premium Subscription");
  if (!product) {
    product = await stripe.products.create({
      name: "SyncPL Premium Subscription",
      description: "Unlock full access to SyncPL Trading Workspace and voice copilot diagnostics.",
    });
  }

  const prices = await stripe.prices.list({ product: product.id });
  let price = prices.data.find((p) => p.unit_amount === 2500 && p.recurring?.interval === "month");
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2500,
      currency: "usd",
      recurring: { interval: "month" },
    });
  }
  return price.id;
}

async function startServer() {
  const app = express();

  // 1. Stripe Webhook (MUST be defined before express.json() to capture raw body)
  app.post("/api/payment/webhook", express.raw({ type: "application/json" }), async (req: any, res: any) => {
    const stripe = getStripe();
    if (!stripe) {
      console.warn("Stripe is not configured. Webhook ignored.");
      return res.status(400).send("Stripe not configured");
    }

    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        // Fallback for local testing/environments without a webhook secret signature verification
        console.log("No webhook secret configured. Parsing unverified payload.");
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received Stripe Webhook Event: ${event.type}`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          if (userId) {
            await updateSubscriptionInDb(userId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: "active",
              subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // fallback
            });
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          // Find matching user in metadata or search customers
          let userId = sub.metadata?.userId;
          if (!userId && typeof sub.customer === "string") {
            const customer = await stripe.customers.retrieve(sub.customer) as Stripe.Customer;
            userId = customer.metadata?.userId;
          }

          if (userId) {
            await updateSubscriptionInDb(userId, {
              stripeCustomerId: sub.customer as string,
              stripeSubscriptionId: sub.id,
              subscriptionStatus: sub.status === "active" || sub.status === "trialing" ? "active" : sub.status,
              subscriptionPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          let userId = sub.metadata?.userId;
          if (!userId && typeof sub.customer === "string") {
            const customer = await stripe.customers.retrieve(sub.customer) as Stripe.Customer;
            userId = customer.metadata?.userId;
          }

          if (userId) {
            await updateSubscriptionInDb(userId, {
              stripeSubscriptionId: "",
              subscriptionStatus: "none",
              subscriptionPeriodEnd: "",
            });
          }
          break;
        }
      }
    } catch (dbErr) {
      console.error("Error handling stripe webhook DB update:", dbErr);
    }

    res.json({ received: true });
  });

  // 1.5. CORS Middleware for desktop clients (Tauri)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // 2. Standard parsers for subsequent API routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Check Stripe Configuration Status
  app.get("/api/payment/config", (req, res) => {
    res.json({
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    });
  });

  // Create Stripe Checkout Session
  app.post("/api/payment/create-checkout-session", async (req: any, res: any) => {
    try {
      const { userId, userEmail } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({
          error: "Stripe keys are not configured. Set STRIPE_SECRET_KEY in your environment to unlock billing.",
        });
      }

      // 1. Get or create product/price
      const priceId = await getOrCreatePrice(stripe);

      // 2. Find or create stripe customer
      let customerId: string;
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Ensure metadata contains userId
        if (customers.data[0].metadata?.userId !== userId) {
          await stripe.customers.update(customerId, { metadata: { userId } });
        }
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      // 3. Setup dynamic origin url
      const origin = req.headers.referer || req.headers.origin || "http://localhost:3000";

      // 4. Create checkout session with a 30-day (1 month) free trial
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 30, // First Month Free!
          metadata: { userId },
        },
        metadata: { userId },
        success_url: `${origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (e: any) {
      console.error("Error creating checkout session:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Verify Stripe Checkout Session (for client-side/in-app synchronization without webhooks)
  app.post("/api/payment/verify-checkout-session", async (req: any, res: any) => {
    try {
      const { sessionId, userId } = req.body;
      if (!sessionId || !userId) {
        return res.status(400).json({ error: "sessionId and userId are required" });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      console.log(`Verifying checkout session: ${sessionId} for user: ${userId}`);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;

      let subscriptionStatus = "active";
      let subscriptionPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          subscriptionStatus = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;
          subscriptionPeriodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
        } catch (subErr) {
          console.error("Failed to retrieve subscription detail from stripe during verification:", subErr);
        }
      }

      await updateSubscriptionInDb(userId, {
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionPeriodEnd,
      });

      res.json({
        success: true,
        subscriptionStatus,
        subscriptionPeriodEnd,
        stripeCustomerId,
      });
    } catch (e: any) {
      console.error("Error verifying checkout session:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Create Stripe Customer Portal Session
  app.post("/api/payment/portal-session", async (req: any, res: any) => {
    try {
      const { stripeCustomerId, userId, userEmail } = req.body;
      
      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      let finalCustomerId = stripeCustomerId;

      // Self-healing: if customer ID is not provided but we have an email, search Stripe
      if (!finalCustomerId && userEmail) {
        console.log(`Searching Stripe for customer email: ${userEmail}`);
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          finalCustomerId = customers.data[0].id;
          console.log(`Found Stripe customer: ${finalCustomerId} for email ${userEmail}`);
          
          if (userId) {
            await updateSubscriptionInDb(userId, {
              stripeCustomerId: finalCustomerId,
            });
          }
        }
      }

      if (!finalCustomerId) {
        return res.status(400).json({ 
          error: "Stripe Customer ID could not be found. Please subscribe or check your account email." 
        });
      }

      const origin = req.headers.referer || req.headers.origin || "http://localhost:3000";

      const session = await stripe.billingPortal.sessions.create({
        customer: finalCustomerId,
        return_url: origin,
      });

      res.json({ url: session.url });
    } catch (e: any) {
      console.error("Error creating customer portal session:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware or production build output fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
