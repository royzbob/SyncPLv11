import React, { useState } from "react";
import {
  CreditCard,
  Crown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Lock,
} from "lucide-react";
import { UserProfile } from "../../types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface BillingSettingsTabProps {
  profile: UserProfile | null;
  currentUser: any;
  subscriptionState: {
    isPremium: boolean;
    daysRemaining: number;
    isExpired: boolean;
    status: string;
  };
  onOpenCheckoutModal?: () => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function BillingSettingsTab({
  profile,
  currentUser,
  subscriptionState,
  onOpenCheckoutModal,
  triggerToast,
}: BillingSettingsTabProps) {
  const [cancellingDeskId, setCancellingDeskId] = useState<string | null>(null);

  const formatSubscriptionDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCancelDeskSubscription = async (roomId: string) => {
    if (!currentUser?.uid) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your paid pass for room #${roomId}? You will lose access to its paid course & private room streams.`
    );
    if (!confirmCancel) return;

    setCancellingDeskId(roomId);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentDeskSubs = data.roomSubscriptions || {};
        delete currentDeskSubs[roomId];

        await updateDoc(userRef, {
          roomSubscriptions: currentDeskSubs,
        });

        if (triggerToast) {
          triggerToast("Pass Cancelled", `Room #${roomId} pass has been removed from your active billing.`, "info");
        } else {
          alert(`Room #${roomId} pass has been removed from your active billing.`);
        }
      }
    } catch (err) {
      console.error("Failed to cancel room pass", err);
      if (triggerToast) {
        triggerToast("Error", "Could not process pass cancellation at this time.", "error");
      } else {
        alert("Could not process pass cancellation at this time.");
      }
    } finally {
      setCancellingDeskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subscription & Premium Billing Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-[#2A2D31] space-y-6 shadow-xl relative overflow-hidden bg-gradient-to-r from-[#121417] to-[#1e2023]">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-[#5865F2]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#5865F2]/10 rounded-xl text-[#5865F2] border border-[#5865F2]/20 shadow-inner">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  Subscription & Workspace Billing
                  {subscriptionState.isPremium ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> Active Pro Plan
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      Free Community Tier
                    </span>
                  )}
                </h4>
                <p className="text-xs text-[#8E9297] mt-0.5">
                  Manage your subscription tier, billing invoices, and premium workspace perks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {subscriptionState.isPremium ? (
              <button
                type="button"
                onClick={() => onOpenCheckoutModal?.()}
                className="w-full lg:w-auto bg-[#1E2023] hover:bg-[#25282E] text-white border border-[#2A2D31] font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Manage Billing & Invoices</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenCheckoutModal?.()}
                className="w-full lg:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Upgrade to Pro ($25/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Pricing Box & Membership Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Card 1: Status Details */}
          <div className="p-5 rounded-xl bg-[#0E1012] border border-[#2A2D31] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Current Status
                </span>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  ${subscriptionState.isPremium ? "25.00" : "0.00"} USD / month
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                {subscriptionState.isPremium
                  ? "SyncPL Trader Pro Membership"
                  : "SyncPL Free Community Trader"}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {subscriptionState.isPremium
                  ? `Your account has uninterrupted access to all real-time voice, AI Co-Pilot, and course channels. Valid through ${formatSubscriptionDate(
                      profile?.subscriptionEndDate
                    )}.`
                  : "Unlock unlimited AI vocal speech advisors, bespoke theme skins, unlimited channels, and private monetization hubs."}
              </p>
            </div>

            <div className="pt-2 border-t border-[#2A2D31]/70 flex items-center justify-between text-xs text-gray-400">
              <span>Next Renewal:</span>
              <span className="font-mono text-gray-200">
                {formatSubscriptionDate(profile?.subscriptionEndDate)}
              </span>
            </div>
          </div>

          {/* Card 2: Pro Privileges */}
          <div className="p-5 rounded-xl bg-[#0E1012] border border-[#2A2D31] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Pro Workspace Privileges
            </span>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unlimited Gemini Voice Co-Pilot Speech Queries</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>High-Fidelity Realtime Audio Streaming Rooms</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bespoke Solar Gold & Cyber Emerald Theme Skins</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct Stripe Connect Workspace Monetization</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Enrolled Private Desk Subscriptions & Cancellation Manager */}
        {profile?.roomSubscriptions && Object.keys(profile.roomSubscriptions).length > 0 && (
          <div className="pt-4 border-t border-[#2A2D31] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Enrolled Private Workspace Subscriptions
              </span>
              <span className="text-[10px] text-gray-400">
                {Object.keys(profile.roomSubscriptions).length} Active Room Passes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(profile.roomSubscriptions).map(([rId, subData]: [string, any]) => (
                <div
                  key={rId}
                  className="p-3.5 bg-[#0E1012] border border-[#2A2D31] rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">#{rId}</span>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Enrolled: {formatSubscriptionDate(subData?.enrolledAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={cancellingDeskId === rId}
                    onClick={() => handleCancelDeskSubscription(rId)}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {cancellingDeskId === rId ? "Cancelling..." : "Cancel Pass"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
