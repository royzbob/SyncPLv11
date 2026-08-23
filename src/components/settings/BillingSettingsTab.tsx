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
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function BillingSettingsTab({
  profile,
  currentUser,
  subscriptionState,
  onOpenCheckoutModal,
  onOpenUpgradeModal,
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
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shadow-inner">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  Membership & Desk Billing
                  {subscriptionState.isPremium ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> Active Pro Plan
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      Free Community Tier
                    </span>
                  )}
                </h4>
                <p className="text-xs text-[#8E9297] mt-0.5">
                  Manage your subscription tier, uncap trading ledger limits, and configure workspace passes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {subscriptionState.isPremium ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenUpgradeModal) onOpenUpgradeModal("general");
                  else if (onOpenCheckoutModal) onOpenCheckoutModal();
                }}
                className="w-full lg:w-auto bg-[#1E2023] hover:bg-[#25282E] text-white border border-[#2A2D31] font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Manage Billing & Plan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onOpenUpgradeModal) onOpenUpgradeModal("general");
                  else if (onOpenCheckoutModal) onOpenCheckoutModal();
                }}
                className="w-full lg:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-black" />
                <span>Upgrade to Pro ($25/mo via Stripe)</span>
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
                  Current Tier
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
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
                  ? `Your account has uninterrupted access to unlimited ledger logs, real-time AI Co-Pilot voice scans, custom desk skins, and monetized desk hubs. Valid through ${formatSubscriptionDate(
                      profile?.subscriptionEndDate
                    )}.`
                  : "Free tier is limited to 10 trade records and 2 AI voice scans per day. Upgrade to uncap full trading desk power."}
              </p>
            </div>

            <div className="pt-2 border-t border-[#2A2D31]/70 flex items-center justify-between text-xs text-gray-400">
              <span>{subscriptionState.isPremium ? "Next Renewal:" : "Free Tier Limits:"}</span>
              <span className="font-mono text-gray-200">
                {subscriptionState.isPremium
                  ? formatSubscriptionDate(profile?.subscriptionEndDate)
                  : "10 Trades / 2 Scans"}
              </span>
            </div>
          </div>

          {/* Card 2: Pro Privileges */}
          <div className="p-5 rounded-xl bg-[#0E1012] border border-[#2A2D31] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> SyncPL Pro Perks Included
            </span>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">Unlimited Trade Logging & Historical Ledger CSV</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unlimited Real-Time Gemini AI Voice Co-Pilot Scans</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Solar Gold, Cyber Emerald & Neon Theme Skins</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Charge Monthly Passes & Collect MRR with Stripe Connect</span>
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Glowing Gold Crown PRO Badge in Chat & Leaderboards</span>
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
