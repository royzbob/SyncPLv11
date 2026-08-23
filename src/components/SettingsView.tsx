import React, { useState } from "react";
import {
  User,
  Globe,
  Mic,
  CreditCard,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Channel, Room, UserProfile } from "../types";
import { ChatNotificationSound } from "../utils/audio";
import BroadcastUpdateModal from "./BroadcastUpdateModal";
import ProfileSettingsTab from "./settings/ProfileSettingsTab";
import WorkspaceSettingsTab from "./settings/WorkspaceSettingsTab";
import AudioSettingsTab from "./settings/AudioSettingsTab";
import BillingSettingsTab from "./settings/BillingSettingsTab";

export type SettingsTabType = "profile" | "workspace" | "audio" | "billing";

interface SettingsViewProps {
  profile: UserProfile | null;
  activeRoom: Room;
  channels: Channel[];
  onUpdateProfile: (
    username: string,
    color: "indigo" | "pink" | "emerald" | "amber" | "sky",
    type: "emoji" | "url",
    val: string
  ) => Promise<void>;
  onAddChannel: (name: string, type: "text" | "voice") => Promise<void>;
  onDeleteChannel: (id: string, name: string) => Promise<void>;
  onRenameChannel: (id: string, name: string) => void;
  onSetChannelPin: (id: string, pin: string) => Promise<void>;
  onMoveChannel?: (id: string, direction: "up" | "down") => Promise<void>;
  onCopyRoomCode: () => void;
  onJoinRoomCode: (code: string) => Promise<void>;
  onCreateNewRoom: () => Promise<void>;
  isCreatorOrMod: boolean;
  onConsultAiAdvisor: () => void;
  voiceName: string;
  setVoiceName: (val: string) => void;
  vocalPrompt: string;
  setVocalPrompt: (val: string) => void;
  chatSoundEnabled?: boolean;
  onToggleChatSound?: (enabled: boolean) => void;
  chatSoundType?: ChatNotificationSound;
  onChangeChatSoundType?: (type: ChatNotificationSound) => void;
  chatSoundVolume?: number;
  onChangeChatSoundVolume?: (vol: number) => void;
  subscriptionState: {
    isPremium: boolean;
    daysRemaining: number;
    isExpired: boolean;
    status: string;
  };
  stripeConfig: {
    stripeConfigured: boolean;
    publishableKey: string;
  };
  onSubscribe: () => Promise<void>;
  onManageBilling: () => Promise<void>;
  onUpdateSubscriptionTier?: (tier: "free" | "pro" | "elite") => Promise<void>;
  onUpdateRoomMonetization?: (
    isPaid: boolean,
    price: number,
    paypalLink?: string,
    venmoUsername?: string,
    cashappTag?: string,
    stripePaymentLink?: string,
    customPaymentInstructions?: string
  ) => Promise<void>;
  onUpdateStripeConnect?: (linked: boolean, accountId?: string) => Promise<void>;
  onUpdateDiscordWebhook?: (url: string) => Promise<void>;
  isRoomOwner?: boolean;
  currentUser?: any;
  isAppOwner?: boolean;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
  onUnsubscribeFromRoom?: (roomId: string) => Promise<void>;
  userRooms?: Room[];
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
}

export default function SettingsView({
  profile,
  activeRoom,
  channels,
  onUpdateProfile,
  onAddChannel,
  onDeleteChannel,
  onRenameChannel,
  onSetChannelPin,
  onMoveChannel,
  onCopyRoomCode,
  onJoinRoomCode,
  onCreateNewRoom,
  isCreatorOrMod,
  onConsultAiAdvisor,
  voiceName,
  setVoiceName,
  vocalPrompt,
  setVocalPrompt,
  chatSoundEnabled = true,
  onToggleChatSound,
  chatSoundType = "chime",
  onChangeChatSoundType,
  chatSoundVolume = 0.6,
  onChangeChatSoundVolume,
  subscriptionState,
  stripeConfig,
  onSubscribe,
  onManageBilling,
  onUpdateSubscriptionTier,
  onUpdateRoomMonetization,
  onUpdateStripeConnect,
  onUpdateDiscordWebhook,
  isRoomOwner,
  currentUser,
  isAppOwner,
  triggerToast,
  onUnsubscribeFromRoom,
  userRooms,
  onOpenUpgradeModal,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("profile");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isStripeOnboardingOpen, setIsStripeOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const isAppOwnerUser = Boolean(
    isAppOwner ||
    currentUser?.email === "1NathanDrew6@gmail.com" ||
    currentUser?.email === "1nathandrew6@gmail.com" ||
    profile?.email === "1NathanDrew6@gmail.com" ||
    profile?.email === "1nathandrew6@gmail.com"
  );

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full text-[#DCDDDE] pb-24">
      {/* Top Header with title and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-2xl text-white tracking-tight flex items-center gap-2.5">
            Settings & Hub Controls
            {subscriptionState?.isPremium && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> PRO
              </span>
            )}
          </h3>
          <p className="text-xs text-[#8E9297] mt-0.5">
            Configure your trader identity, room channels, audio alerts, and subscription billing.
          </p>
        </div>

        {/* Quick status indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121417] border border-[#2A2D31] text-[11px] font-mono shadow-inner">
            <span className="text-gray-400">Desk:</span>
            <span className="text-indigo-400 font-bold">#{activeRoom?.id}</span>
          </div>
          {isRoomOwner && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold">
              <span>Owner Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-[#121417] border border-[#2A2D31] rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === "profile"
              ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25"
              : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Appearance</span>
        </button>

        {/* Workspace & Channels Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === "workspace"
              ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25"
              : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Rooms & Channels</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              activeTab === "workspace" ? "bg-white/20 text-white" : "bg-[#1E2023] text-gray-400"
            }`}
          >
            {channels.length}
          </span>
        </button>

        {/* Voice & Audio Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === "audio"
              ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25"
              : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Voice & Audio</span>
          {chatSoundEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Audio alerts enabled" />
          )}
        </button>

        {/* Billing & Passes Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === "billing"
              ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25"
              : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Billing & Passes</span>
          {subscriptionState?.isPremium && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                activeTab === "billing"
                  ? "bg-emerald-400 text-black"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              PRO
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Profile & Appearance */}
      {activeTab === "profile" && (
        <ProfileSettingsTab
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          subscriptionState={subscriptionState}
          isAppOwnerUser={isAppOwnerUser}
          onOpenBroadcastModal={() => setShowBroadcastModal(true)}
          triggerToast={triggerToast}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      )}

      {/* Tab 2: Rooms & Channels */}
      {activeTab === "workspace" && (
        <WorkspaceSettingsTab
          activeRoom={activeRoom}
          channels={channels}
          isCreatorOrMod={isCreatorOrMod}
          isRoomOwner={isRoomOwner}
          profile={profile}
          currentUser={currentUser}
          onCopyRoomCode={onCopyRoomCode}
          onJoinRoomCode={onJoinRoomCode}
          onCreateNewRoom={onCreateNewRoom}
          onAddChannel={onAddChannel}
          onDeleteChannel={onDeleteChannel}
          onRenameChannel={onRenameChannel}
          onSetChannelPin={onSetChannelPin}
          onMoveChannel={onMoveChannel}
          onUpdateRoomMonetization={onUpdateRoomMonetization}
          onOpenStripeConnectOnboarding={() => setIsStripeOnboardingOpen(true)}
          triggerToast={triggerToast}
        />
      )}

      {/* Tab 3: Voice & Audio */}
      {activeTab === "audio" && (
        <AudioSettingsTab
          voiceName={voiceName}
          setVoiceName={setVoiceName}
          vocalPrompt={vocalPrompt}
          setVocalPrompt={setVocalPrompt}
          onConsultAiAdvisor={onConsultAiAdvisor}
          chatSoundEnabled={chatSoundEnabled}
          onToggleChatSound={onToggleChatSound}
          chatSoundType={chatSoundType}
          onChangeChatSoundType={onChangeChatSoundType}
          chatSoundVolume={chatSoundVolume}
          onChangeChatSoundVolume={onChangeChatSoundVolume}
          triggerToast={triggerToast}
        />
      )}

      {/* Tab 4: Billing & Passes */}
      {activeTab === "billing" && (
        <BillingSettingsTab
          profile={profile}
          currentUser={currentUser}
          subscriptionState={subscriptionState}
          onOpenCheckoutModal={subscriptionState.isPremium ? onManageBilling : onSubscribe}
          triggerToast={triggerToast}
        />
      )}

      {/* Modals rendered universally */}
      {/* Stripe Express Onboarding Simulator Modal */}
      {isStripeOnboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#2A2D31] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2D31]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-white text-sm">Stripe Connect Express</h5>
                  <p className="text-[10px] text-gray-400">Direct creator payout onboarding</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStripeOnboardingOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {onboardingStep === 1 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Stripe Connect links your checking or debit account so student subscription dues deposit directly to your bank in real-time.
                  </p>
                  <div className="p-3 bg-[#0F1113] rounded-xl border border-[#2A2D31] space-y-2 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span className="text-emerald-400 font-bold font-mono">0.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stripe Processing:</span>
                      <span className="text-gray-200 font-mono">2.9% + 30¢</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payout Schedule:</span>
                      <span className="text-indigo-400 font-bold">Daily Rolling</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    Continue to Merchant Setup →
                  </button>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Business or Legal Name
                    </label>
                    <input
                      type="text"
                      defaultValue={profile?.username ? `${profile.username} Trading Desk` : "Trading Academy LLC"}
                      className="w-full bg-[#0F1113] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Payout Routing (Routing / Account)
                    </label>
                    <input
                      type="text"
                      placeholder="**** **** **** 4242"
                      className="w-full bg-[#0F1113] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(1)}
                      className="flex-1 py-2 bg-[#1E2023] hover:bg-[#25282E] text-gray-300 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setOnboardingStep(3);
                        await new Promise((r) => setTimeout(r, 1000));
                        if (onUpdateStripeConnect) {
                          const newAcctId = "acct_link_" + Math.random().toString(36).substr(2, 9).toUpperCase();
                          await onUpdateStripeConnect(true, newAcctId);
                        }
                        setIsStripeOnboardingOpen(false);
                        setOnboardingStep(1);
                      }}
                      className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-black transition cursor-pointer shadow"
                    >
                      Link Account & Finish ✓
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <div className="space-y-1">
                    <h6 className="text-xs font-black text-white uppercase tracking-wider">
                      Verifying KYC Protocols...
                    </h6>
                    <p className="text-[10px] text-gray-400 max-w-xs">
                      Connecting with the Stripe Connect Identity API gateway to authorize your instant-settlement bank routing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Update Broadcast Modal (Owner Only) */}
      <BroadcastUpdateModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        currentUsername={profile?.username || "Nathan (App Owner)"}
        currentUserId={profile?.activeGroupId || "admin"}
        isAppOwner={isAppOwnerUser}
        triggerToast={triggerToast}
      />
    </div>
  );
}
