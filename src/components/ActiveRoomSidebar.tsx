import React, { useState } from "react";
import {
  LayoutDashboard,
  MessageSquareCode,
  Trophy,
  History,
  SlidersHorizontal,
  PlusCircle,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  VolumeOff,
  PhoneOff,
  Sparkles,
  Bot,
  Crown,
  Shield,
  Plus,
  MessageSquare,
  Activity,
  ListTodo,
  Lock,
  Headphones,
  Settings,
  Wifi,
  Users,
  User,
  Banknote,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
  Monitor,
  Radio,
  ShieldAlert,
  Target,
  Share2,
  Flame,
  BookOpen,
} from "lucide-react";
import { Room, Channel, VoiceUser, UserProfile } from "../types";
import { isImageAvatar } from "../utils/presence";

interface ActiveRoomSidebarProps {
  activeRoom: Room;
  channels: Channel[];
  activeChannelName: string;
  onSelectChannel: (chanName: string, type: "text" | "voice") => void;
  activeVoiceChannel: string | null;
  onToggleVoiceRoom: (chanName: string) => void;
  voiceUsers: VoiceUser[];
  profile: UserProfile | null;
  activeTab: string;
  onSwitchTab: (tab: string) => void;
  onOpenLogModal: () => void;
  onOpenTiltGuardModal?: () => void;
  onOpenFlexModal?: () => void;
  onOpenGuide?: () => void;
  onDisconnectVoice: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  isMutedAll: boolean;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
  onToggleMuteAll: () => void;
  onConsultAiAdvisor: () => void;
  isCreatorOrMod: boolean;
  onKickVoiceUser?: (userId: string, username: string) => void;
  onAddChannelClick: (type: "text" | "voice") => void;
  onMoveChannel?: (id: string, direction: "up" | "down") => Promise<void>;
  onCopyRoomCode: () => void;
  isChatSidePanelOpen?: boolean;
  globalVolume: number;
  onChangeGlobalVolume: (vol: number) => void;
  inputVolume: number;
  onChangeInputVolume: (vol: number) => void;
  mutedUsers: Record<string, boolean>;
  onToggleMuteUser: (userId: string) => void;
  userVolumes: Record<string, number>;
  onChangeUserVolume: (userId: string, vol: number) => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onOpenScreenShareModal?: (uid?: string) => void;
  remoteScreenStreams?: Map<string, MediaStream>;
  onUnsubscribeFromRoom?: (roomId: string) => Promise<void>;
  currentUser?: any;
  unreadPmCount?: number;
}

export default function ActiveRoomSidebar({
  activeRoom,
  channels,
  activeChannelName,
  onSelectChannel,
  activeVoiceChannel,
  onToggleVoiceRoom,
  voiceUsers,
  profile,
  activeTab,
  onSwitchTab,
  onOpenLogModal,
  onOpenTiltGuardModal,
  onOpenFlexModal,
  onOpenGuide,
  onDisconnectVoice,
  isMuted,
  isDeafened,
  isMutedAll,
  onToggleMic,
  onToggleDeafen,
  onToggleMuteAll,
  onConsultAiAdvisor,
  isCreatorOrMod,
  onKickVoiceUser,
  onAddChannelClick,
  onMoveChannel,
  onCopyRoomCode,
  isChatSidePanelOpen = false,
  globalVolume,
  onChangeGlobalVolume,
  inputVolume,
  onChangeInputVolume,
  mutedUsers,
  onToggleMuteUser,
  userVolumes,
  onChangeUserVolume,
  isScreenSharing = false,
  onToggleScreenShare,
  onOpenScreenShareModal,
  remoteScreenStreams,
  onUnsubscribeFromRoom,
  currentUser,
  unreadPmCount = 0,
}: ActiveRoomSidebarProps) {
  const [voiceTheme, setVoiceTheme] = useState<"classic-dark" | "terminal-green" | "high-contrast-blue">(() => {
    try {
      const stored = localStorage.getItem("syncpl_voice_theme");
      return (stored as any) || "classic-dark";
    } catch {
      return "classic-dark";
    }
  });

  const [activeUserPopover, setActiveUserPopover] = useState<string | null>(null);
  const [isReorderingText, setIsReorderingText] = useState(false);
  const [isReorderingVoice, setIsReorderingVoice] = useState(false);
  const [draggedChanId, setDraggedChanId] = useState<string | null>(null);
  const [dragOverChanId, setDragOverChanId] = useState<string | null>(null);

  const handleThemeChange = (theme: "classic-dark" | "terminal-green" | "high-contrast-blue") => {
    setVoiceTheme(theme);
    try {
      localStorage.setItem("syncpl_voice_theme", theme);
    } catch (e) {
      console.warn(e);
    }
  };

  const themeStyles = {
    "classic-dark": {
      panelBg: "bg-[#0B0C0E] border-t border-[#2A2D31]",
      connectedPill: "bg-emerald-500/5 border border-emerald-500/10 text-emerald-400",
      channelText: "text-gray-300",
      channelIcon: "text-[#72767D]",
      speakerBg: "bg-gray-900/30 border border-white/5",
      speakerName: "text-gray-400",
      speakerActiveName: "text-emerald-400 font-semibold",
      speakerIndicatorDot: "bg-emerald-400",
      waveformBar: "bg-emerald-400",
      controlBtnActive: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20",
      controlBtnInactive: "bg-[#1E2023] hover:bg-[#2A2D31] hover:text-white text-gray-300 border-[#2A2D31]/50",
      consultBtn: "bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/25 text-indigo-400",
      chatBtn: "bg-[#5865F2]/5 hover:bg-[#5865F2]/10 border border-[#5865F2]/10 hover:border-[#5865F2]/20 text-indigo-400 hover:text-white",
      fontClass: "font-sans",
    },
    "terminal-green": {
      panelBg: "bg-[#010903] border-t-2 border-emerald-500/40",
      connectedPill: "bg-emerald-950/30 border border-emerald-500/30 text-emerald-400",
      channelText: "text-emerald-400 font-bold",
      channelIcon: "text-emerald-500/60",
      speakerBg: "bg-black border border-emerald-500/20",
      speakerName: "text-emerald-600",
      speakerActiveName: "text-emerald-400 font-bold animate-pulse",
      speakerIndicatorDot: "bg-emerald-500",
      waveformBar: "bg-emerald-400",
      controlBtnActive: "bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border-rose-500/40",
      controlBtnInactive: "bg-black hover:bg-emerald-950/50 hover:text-emerald-300 text-emerald-500 border-emerald-500/20",
      consultBtn: "bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-emerald-400",
      chatBtn: "bg-emerald-950/10 hover:bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300",
      fontClass: "font-mono",
    },
    "high-contrast-blue": {
      panelBg: "bg-[#040D1D] border-t-2 border-blue-500",
      connectedPill: "bg-blue-500/10 border border-blue-500/40 text-blue-400",
      channelText: "text-blue-200 font-bold tracking-tight",
      channelIcon: "text-blue-400",
      speakerBg: "bg-[#08152E] border border-blue-500/30",
      speakerName: "text-blue-300/85",
      speakerActiveName: "text-blue-200 font-extrabold shadow-[0_0_8px_rgba(59,130,246,0.3)]",
      speakerIndicatorDot: "bg-blue-400",
      waveformBar: "bg-blue-400",
      controlBtnActive: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20",
      controlBtnInactive: "bg-[#0B1A3A] hover:bg-[#122550] hover:text-white text-blue-300 border-blue-500/35",
      consultBtn: "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300",
      chatBtn: "bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white hover:text-white",
      fontClass: "font-sans",
    },
  };

  // Navigation button class
  const getNavBtnClass = (tabName: string) => {
    const isSelected = activeTab === tabName;
    return `w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition duration-150 border ${
      isSelected
        ? "bg-[#2A2D31] text-white border-[#2A2D31]"
        : "text-[#8E9297] border-transparent hover:bg-[#1E2023] hover:text-[#DCDDDE]"
    }`;
  };

  const textChans = channels.filter((c) => c.type === "text");
  const voiceChans = channels.filter((c) => c.type === "voice");

  return (
    <aside className="w-60 bg-[#121417] border-r border-[#2A2D31] flex flex-col shrink-0 z-20 relative">
      {activeUserPopover !== null && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setActiveUserPopover(null)}
        />
      )}
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2A2D31] bg-[#08090A]/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[9px] text-[#72767D] font-extrabold tracking-widest uppercase">
              Active Workspace
            </span>
            {activeRoom.name && (
              <span className="text-sm font-extrabold text-white truncate max-w-[150px]" title={activeRoom.name}>
                {activeRoom.name}
              </span>
            )}
            <span
              onClick={onCopyRoomCode}
              className={`text-indigo-400 tracking-wider font-mono cursor-pointer hover:text-indigo-300 transition flex items-center gap-1.5 ${
                activeRoom.name ? "text-xs font-bold" : "text-base font-black"
              }`}
              title="Copy Invite Code"
            >
              #{activeRoom.id}
            </span>
          </div>
          <button
            onClick={onCopyRoomCode}
            className="p-1.5 bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-indigo-400 rounded transition cursor-pointer shrink-0"
            title="Copy invite code"
          >
            <span className="text-[10px] font-bold">Copy</span>
          </button>
        </div>

        {/* Paid Workspace Status & Unsubscribe Action */}
        {activeRoom.isPaid && (
          <div className="pt-1 border-t border-[#2A2D31]/40 flex items-center justify-between text-[9px]">
            {activeRoom.creatorId === currentUser?.uid || currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" || profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ? (
              <span className="font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                👑 {currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" || profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ? "App Creator & Owner" : `Desk Owner ($${(activeRoom.monthlyPrice || 29).toFixed(2)}/mo)`}
              </span>
            ) : activeRoom.subscribers?.includes(currentUser?.uid) ? (
              <div className="w-full flex items-center justify-between">
                <span className="font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Subscribed Member
                </span>
                {onUnsubscribeFromRoom && (
                  <button
                    type="button"
                    onClick={() => onUnsubscribeFromRoom(activeRoom.id)}
                    className="text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer transition"
                    title="Cancel monthly subscription to this desk"
                  >
                    Unsubscribe
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-400 font-mono">
                Price: ${(activeRoom.monthlyPrice || 29).toFixed(2)}/mo
              </span>
            )}
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-3 border-b border-[#2A2D31] space-y-1 bg-[#0F1113]/10">
        <button
          id="nav-my-dashboard"
          onClick={() => onSwitchTab("dashboard")}
          className={getNavBtnClass("dashboard")}
        >
          <div className="flex items-center space-x-2.5">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="font-bold">My Dashboard</span>
          </div>
          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">
            YOU
          </span>
        </button>

        <button
          id="nav-desk-dashboard"
          onClick={() => onSwitchTab("group-dashboard")}
          className={getNavBtnClass("group-dashboard")}
        >
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">Desk Dashboard</span>
          </div>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
            ROOM
          </span>
        </button>

        <button
          id="nav-chat"
          onClick={() => onSwitchTab("chat")}
          className={getNavBtnClass("chat")}
        >
          <div className="flex items-center space-x-2.5">
            <MessageSquareCode className="w-4 h-4 text-indigo-400" />
            <span className="font-bold">Trading Desk Chat</span>
          </div>
          {activeTab !== "chat" && isChatSidePanelOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Side Panel Open" />
          )}
        </button>

        <button
          id="nav-leaderboard"
          onClick={() => onSwitchTab("leaderboard")}
          className={getNavBtnClass("leaderboard")}
        >
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-4 h-4" />
            <span>Leaderboard Board</span>
          </div>
        </button>

        <button
          id="nav-challenges"
          onClick={() => onSwitchTab("challenges")}
          className={getNavBtnClass("challenges")}
        >
          <div className="flex items-center space-x-2.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="flex items-center gap-1.5">
              <span>Co-Op Desk Goals</span>
              <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-500/30">
                STREAKS
              </span>
            </span>
          </div>
        </button>

        <button
          id="nav-payouts"
          onClick={() => onSwitchTab("payouts")}
          className={getNavBtnClass("payouts")}
        >
          <div className="flex items-center space-x-2.5">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span className="flex items-center gap-1.5">
              <span>Payout Leaderboard</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.2 rounded border border-emerald-500/30">
                NEW
              </span>
            </span>
          </div>
        </button>

        <button
          id="nav-logs"
          onClick={() => onSwitchTab("logs")}
          className={getNavBtnClass("logs")}
        >
          <div className="flex items-center space-x-2.5">
            <History className="w-4 h-4" />
            <span>Ledger Records</span>
          </div>
        </button>

        <button
          id="nav-checklist"
          onClick={() => onSwitchTab("checklist")}
          className={getNavBtnClass("checklist")}
        >
          <div className="flex items-center space-x-2.5">
            <ListTodo className="w-4 h-4" />
            <span>Trading Checklist</span>
          </div>
        </button>

        <button
          id="nav-friends"
          onClick={() => onSwitchTab("friends")}
          className={getNavBtnClass("friends")}
        >
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Friends & Co-Traders</span>
          </div>
        </button>

        <button
          id="nav-pms"
          onClick={() => onSwitchTab("pms")}
          className={getNavBtnClass("pms")}
        >
          <div className="flex items-center space-x-2.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="flex items-center gap-1.5">
              <span>Direct Messages</span>
              <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black px-1.5 py-0.2 rounded border border-indigo-500/30">
                PM
              </span>
            </span>
          </div>
          {unreadPmCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[9px] rounded-full animate-bounce shadow">
              {unreadPmCount > 9 ? "9+" : unreadPmCount}
            </span>
          )}
        </button>

        <button
          id="nav-partners"
          onClick={() => onSwitchTab("partners")}
          className={getNavBtnClass("partners")}
        >
          <div className="flex items-center space-x-2.5">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Workspace Settings</span>
          </div>
        </button>

        {onOpenGuide && (
          <button
            id="nav-quick-start-guide"
            onClick={onOpenGuide}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-300/90 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition cursor-pointer mt-1 shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Getting Started Guide</span>
            </div>
            <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded shadow">
              HELP
            </span>
          </button>
        )}
      </div>

      {/* Channels List Section */}
      <div id="channels-section" className="flex-grow overflow-y-auto p-3 space-y-4">
        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Text Channels
            </span>
            {isCreatorOrMod && (
              <div className="flex items-center gap-1">
                {textChans.length > 1 && onMoveChannel && (
                  <button
                    onClick={() => setIsReorderingText(!isReorderingText)}
                    className={`transition cursor-pointer p-0.5 rounded ${
                      isReorderingText
                        ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        : "text-gray-500 hover:text-white"
                    }`}
                    title={isReorderingText ? "Finish Reordering" : "Reorder Channels"}
                  >
                    {isReorderingText ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => onAddChannelClick("text")}
                  className="text-gray-500 hover:text-white transition cursor-pointer p-0.5"
                  title="Create Text Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {textChans.map((chan, idx) => {
              const isSelected = (activeTab === "chat" || isChatSidePanelOpen) && activeChannelName === chan.name;
              const isFirst = idx === 0;
              const isLast = idx === textChans.length - 1;
              const isBeingDragged = draggedChanId === chan.id;
              const isDraggedOver = dragOverChanId === chan.id;

              return (
                <div
                  key={chan.id}
                  draggable={isCreatorOrMod && (isReorderingText || true)}
                  onDragStart={(e) => {
                    setDraggedChanId(chan.id);
                    e.dataTransfer.setData("text/plain", chan.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedChanId && draggedChanId !== chan.id) {
                      setDragOverChanId(chan.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverChanId === chan.id) setDragOverChanId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverChanId(null);
                    setDraggedChanId(null);
                    const sourceId = e.dataTransfer.getData("text/plain");
                    if (sourceId && sourceId !== chan.id && onMoveChannel) {
                      const sourceIdx = textChans.findIndex((c) => c.id === sourceId);
                      if (sourceIdx !== -1) {
                        const dir = sourceIdx < idx ? "down" : "up";
                        onMoveChannel(sourceId, dir);
                      }
                    }
                  }}
                  className={`group relative flex items-center justify-between px-2 py-1.5 rounded text-xs font-semibold transition-all duration-150 border ${
                    isDraggedOver ? "border-indigo-500 bg-indigo-500/10" : ""
                  } ${
                    isBeingDragged ? "opacity-40" : "opacity-100"
                  } ${
                    isSelected
                      ? "bg-[#2A2D31] text-white border-[#2A2D31]"
                      : "text-[#8E9297] hover:bg-[#1E2023] hover:text-white border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectChannel(chan.name, "text");
                    }}
                    className="flex items-center space-x-2 truncate flex-1 text-left cursor-pointer"
                  >
                    {isReorderingText && (
                      <GripVertical className="w-3.5 h-3.5 text-gray-500 shrink-0 cursor-grab" />
                    )}
                    <span className="text-indigo-400/50 font-black text-sm shrink-0">#</span>
                    <span className="truncate">{chan.name}</span>
                    {chan.pin && (
                      <Lock className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0 ml-1" title="PIN Protected" />
                    )}
                  </button>

                  {/* Reordering Controls */}
                  {isCreatorOrMod && onMoveChannel && (
                    <div className={`items-center gap-0.5 shrink-0 ${isReorderingText ? "flex" : "hidden group-hover:flex"}`}>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveChannel(chan.id, "up");
                        }}
                        className={`p-0.5 rounded transition ${
                          isFirst
                            ? "text-gray-600 cursor-not-allowed opacity-30"
                            : "text-gray-400 hover:text-white hover:bg-[#32353B] cursor-pointer"
                        }`}
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveChannel(chan.id, "down");
                        }}
                        className={`p-0.5 rounded transition ${
                          isLast
                            ? "text-gray-600 cursor-not-allowed opacity-30"
                            : "text-gray-400 hover:text-white hover:bg-[#32353B] cursor-pointer"
                        }`}
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Voice Rooms
            </span>
            {isCreatorOrMod && (
              <div className="flex items-center gap-1">
                {voiceChans.length > 1 && onMoveChannel && (
                  <button
                    onClick={() => setIsReorderingVoice(!isReorderingVoice)}
                    className={`transition cursor-pointer p-0.5 rounded ${
                      isReorderingVoice
                        ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        : "text-gray-500 hover:text-white"
                    }`}
                    title={isReorderingVoice ? "Finish Reordering" : "Reorder Voice Rooms"}
                  >
                    {isReorderingVoice ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => onAddChannelClick("voice")}
                  className="text-gray-500 hover:text-white transition cursor-pointer p-0.5"
                  title="Create Voice Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {voiceChans.map((chan, idx) => {
              const isConnected = activeVoiceChannel === chan.name;
              const chanUsers = voiceUsers.filter((v) => v.channel === chan.name);
              const count = chanUsers.length;
              const isAi =
                chan.name.includes("🤖") || chan.name.toLowerCase().includes("ai");
              const isFirst = idx === 0;
              const isLast = idx === voiceChans.length - 1;
              const isBeingDragged = draggedChanId === chan.id;
              const isDraggedOver = dragOverChanId === chan.id;

              return (
                <div key={chan.id} className="space-y-0.5">
                  <div
                    draggable={isCreatorOrMod && (isReorderingVoice || true)}
                    onDragStart={(e) => {
                      setDraggedChanId(chan.id);
                      e.dataTransfer.setData("text/plain", chan.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedChanId && draggedChanId !== chan.id) {
                        setDragOverChanId(chan.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverChanId === chan.id) setDragOverChanId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverChanId(null);
                      setDraggedChanId(null);
                      const sourceId = e.dataTransfer.getData("text/plain");
                      if (sourceId && sourceId !== chan.id && onMoveChannel) {
                        const sourceIdx = voiceChans.findIndex((c) => c.id === sourceId);
                        if (sourceIdx !== -1) {
                          const dir = sourceIdx < idx ? "down" : "up";
                          onMoveChannel(sourceId, dir);
                        }
                      }
                    }}
                    className={`group relative flex items-center justify-between px-2 py-1.5 rounded text-xs font-semibold transition-all duration-150 border ${
                      isDraggedOver ? "border-emerald-500 bg-emerald-500/10" : ""
                    } ${
                      isBeingDragged ? "opacity-40" : "opacity-100"
                    } ${
                      isConnected
                        ? isAi
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/10 hover:bg-indigo-500/15"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/15"
                        : "text-[#8E9297] hover:bg-[#1E2023]/60 hover:text-white border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleVoiceRoom(chan.name)}
                      className="flex items-center space-x-2 truncate flex-1 text-left cursor-pointer"
                    >
                      {isReorderingVoice && (
                        <GripVertical className="w-3.5 h-3.5 text-gray-500 shrink-0 cursor-grab" />
                      )}
                      {isAi ? (
                        <Bot className={`w-3.5 h-3.5 ${isConnected ? "animate-pulse text-indigo-400" : "text-gray-500"}`} />
                      ) : (
                        <Volume2 className={`w-3.5 h-3.5 ${isConnected ? "text-emerald-400" : "text-gray-500"}`} />
                      )}
                      <span className="truncate">{chan.name}</span>
                      {chan.pin && (
                        <Lock className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0" title="PIN Protected" />
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {isCreatorOrMod && onMoveChannel && (
                        <div className={`items-center gap-0.5 shrink-0 ${isReorderingVoice ? "flex" : "hidden group-hover:flex"}`}>
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveChannel(chan.id, "up");
                            }}
                            className={`p-0.5 rounded transition ${
                              isFirst
                                ? "text-gray-600 cursor-not-allowed opacity-30"
                                : "text-gray-400 hover:text-white hover:bg-[#32353B] cursor-pointer"
                            }`}
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveChannel(chan.id, "down");
                            }}
                            className={`p-0.5 rounded transition ${
                              isLast
                                ? "text-gray-600 cursor-not-allowed opacity-30"
                                : "text-gray-400 hover:text-white hover:bg-[#32353B] cursor-pointer"
                            }`}
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <span className="text-[10px] bg-[#1E2023] px-2 py-0.5 rounded-full text-gray-400 font-medium border border-[#2A2D31]/30 shrink-0">
                        {count}
                      </span>
                    </div>
                  </div>

                  {/* Render players joined underneath this voice room */}
                  {count > 0 && (
                    <div className="pl-5 pr-1 py-1 space-y-1">
                      {chanUsers.map((user) => {
                        const initials = user.username.substring(0, 2).toUpperCase();
                        const avatarBgClass =
                          user.avatarColor === "pink"
                            ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
                            : user.avatarColor === "emerald"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : user.avatarColor === "amber"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : user.avatarColor === "sky"
                            ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#1E2023]/40 transition-all duration-150 text-[10px]"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              {isImageAvatar(user.avatarType, user.avatarVal) ? (
                                <div className={`w-4.5 h-4.5 rounded border overflow-hidden flex items-center justify-center bg-[#08090A] shrink-0 transition-all duration-200 ${
                                  user.speaking
                                    ? "ring-1.5 ring-emerald-500 border-emerald-500"
                                    : "border-[#2A2D31]"
                                }`}>
                                  <img
                                    src={user.avatarVal}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0 transition-all duration-200 ${
                                    user.speaking
                                      ? "ring-1.5 ring-emerald-500 border-emerald-500 text-emerald-400"
                                      : "border-white/10"
                                  } ${avatarBgClass}`}
                                >
                                  {typeof user.avatarVal === "string" && user.avatarVal.length < 8 ? user.avatarVal : initials}
                                </div>
                              )}
                              <span className={`font-medium truncate transition-colors duration-150 ${user.speaking ? "text-emerald-400" : "text-[#DCDDDE]"}`}>
                                {user.username}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 relative">
                              {user.speaking && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                              )}
                              {/* Live Screen Sharing Stream Badge */}
                              {((isScreenSharing && (user.id === profile?.id || user.userId === profile?.id)) || (remoteScreenStreams && remoteScreenStreams.has(user.userId || user.id))) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenScreenShareModal) {
                                      onOpenScreenShareModal(user.userId || user.id);
                                    }
                                  }}
                                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition cursor-pointer animate-pulse shrink-0 shadow-sm"
                                  title="Click to watch live screen stream"
                                >
                                  <Radio className="w-2.5 h-2.5 text-rose-400" />
                                  <span>LIVE</span>
                                </button>
                              )}
                              {user.muted && <MicOff className="w-2.5 h-2.5 text-rose-400/80" title="Muted" />}
                              {user.deafened && <VolumeX className="w-2.5 h-2.5 text-rose-400/80" title="Deafened" />}

                              {/* Discord-style User volume control button */}
                              <button
                                id={`chan-vol-btn-${user.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveUserPopover(activeUserPopover === user.id ? null : user.id);
                                }}
                                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                  mutedUsers[user.id] 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20" 
                                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                                }`}
                                title="Adjust User Volume"
                              >
                                {mutedUsers[user.id] ? (
                                  <VolumeX className="w-3 h-3 text-rose-400" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                                <span>
                                  {mutedUsers[user.id] ? "Muted" : `${userVolumes[user.id] !== undefined ? userVolumes[user.id] : 100}%`}
                                </span>
                              </button>

                              {/* Admin/Mod disconnect user button */}
                              {isCreatorOrMod && onKickVoiceUser && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onKickVoiceUser(user.userId || user.id, user.username);
                                  }}
                                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                                  title={`Remove ${user.username} from voice channel`}
                                >
                                  <PhoneOff className="w-2.5 h-2.5" />
                                </button>
                              )}

                              {/* Discord-style User Volume Popover */}
                              {activeUserPopover === user.id && (
                                <div 
                                  className="absolute right-0 bottom-7 z-50 bg-[#1e1f22] border border-[#2b2d31] rounded-lg p-3 shadow-2xl w-48 space-y-2.5 text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-[#949ba4]">
                                    <span>User Volume</span>
                                    <span className="font-mono text-[#f2f3f5]">
                                      {mutedUsers[user.id] ? "0%" : `${userVolumes[user.id] !== undefined ? userVolumes[user.id] : 100}%`}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="200"
                                      value={userVolumes[user.id] !== undefined ? userVolumes[user.id] : 100}
                                      onChange={(e) => onChangeUserVolume(user.id, Number(e.target.value))}
                                      disabled={!!mutedUsers[user.id]}
                                      className="w-full h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#5865f2] disabled:opacity-40"
                                    />
                                  </div>
                                  <div className="border-t border-[#2b2d31] pt-2 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-[#949ba4] uppercase tracking-wider">Mute Locally</span>
                                    <input
                                      type="checkbox"
                                      checked={!!mutedUsers[user.id]}
                                      onChange={() => onToggleMuteUser(user.id)}
                                      className="accent-[#5865f2] w-3.5 h-3.5 rounded border-gray-600 cursor-pointer"
                                    />
                                  </div>

                                  {/* Admin Disconnect Option */}
                                  {isCreatorOrMod && onKickVoiceUser && (
                                    <div className="border-t border-[#2b2d31] pt-2 flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Disconnect User</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveUserPopover(null);
                                          onKickVoiceUser(user.userId || user.id, user.username);
                                        }}
                                        className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] font-extrabold rounded transition cursor-pointer flex items-center gap-1"
                                      >
                                        <PhoneOff className="w-2.5 h-2.5" /> Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Status Panel & Discord-style Profile Bar */}
      <div className="shrink-0 flex flex-col mt-auto border-t border-[#2A2D31]/50 relative">
        {/* Voice Connected Bar (Discord Style) */}
        {activeVoiceChannel && (() => {
          const style = themeStyles[voiceTheme] || themeStyles["classic-dark"];
          return (
            <div className={`p-2 flex items-center justify-between border-b border-[#2b2d31]/50 ${style.panelBg} ${style.fontClass}`}>
              <div className="flex items-center min-w-0">
                <div className="p-1.5 rounded bg-[#23a55a]/10 text-[#23a55a] mr-2 shrink-0 animate-pulse">
                  <Wifi className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[#23a55a] font-extrabold text-[11px] leading-tight flex items-center gap-1">
                    Voice Connected
                  </span>
                  <span className="text-[#949ba4] text-[10px] font-semibold truncate max-w-[110px]" title={`${activeVoiceChannel} / Workspace`}>
                    {activeVoiceChannel}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {/* Audio wave dynamic visual indicator */}
                <div className="flex items-center space-x-[1.5px] h-3 px-1">
                  <div className="w-[1.5px] h-2 bg-[#23a55a] rounded animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-[1.5px] h-3 bg-[#23a55a] rounded animate-bounce [animation-delay:0.3s]"></div>
                  <div className="w-[1.5px] h-1 bg-[#23a55a] rounded animate-bounce [animation-delay:0.5s]"></div>
                </div>
                {/* Screen Share Button in Voice Connected Bar */}
                {onToggleScreenShare && (
                  <button
                    onClick={onToggleScreenShare}
                    className={`p-1.5 rounded-md border transition cursor-pointer flex items-center gap-1 ${
                      isScreenSharing
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30 animate-pulse shadow-sm"
                        : "text-[#949ba4] hover:text-[#dbdee1] bg-[#1e1f22] hover:bg-[#35373c] border-[#2b2d31]"
                    }`}
                    title={isScreenSharing ? "Stop Screen Share" : "Share Screen (Peer-to-Peer Live Stream)"}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    {isScreenSharing && <span className="text-[9px] font-extrabold text-rose-400">LIVE</span>}
                  </button>
                )}
                <button
                  onClick={onDisconnectVoice}
                  className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/25 rounded-md transition cursor-pointer"
                  title="Disconnect Voice Room"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* User Profile Bar (Always Visible at bottom of sidebar, Discord Style) */}
        {(() => {
          const initials = profile?.username ? profile.username.substring(0, 2).toUpperCase() : "U";
          const avatarBgClass =
            profile?.avatarColor === "pink"
              ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
              : profile?.avatarColor === "emerald"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : profile?.avatarColor === "amber"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : profile?.avatarColor === "sky"
              ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";

          const getDotColor = (presence?: string) => {
            switch (presence) {
              case "active":
                return "bg-[#23a55a]";
              case "idle":
                return "bg-[#f0b232]";
              case "dnd":
                return "bg-[#f23f43]";
              case "offline":
                return "bg-[#80848e]";
              default:
                return "bg-[#23a55a]";
            }
          };

          const getStatusText = (presence?: string, customStatus?: string) => {
            if (activeVoiceChannel) {
              return "🎙️ In Voice";
            }
            if (customStatus) {
              return customStatus;
            }
            switch (presence) {
              case "active":
                return "🟢 Active";
              case "idle":
                return "🟡 AFK";
              case "dnd":
                return "🔴 DND";
              case "offline":
                return "⚫ Invisible";
              default:
                return "🟢 Online";
            }
          };

          return (
            <div id="user-profile-bar" className="bg-[#1e1f22] p-2 flex items-center justify-between h-[52px] select-none relative">
              <div className="flex items-center min-w-0 space-x-2">
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  {isImageAvatar(profile?.avatarType, profile?.avatarVal) ? (
                    <div className="w-8 h-8 rounded-full border border-[#2b2d31] overflow-hidden flex items-center justify-center bg-[#08090A]">
                      <img
                        src={profile.avatarVal}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs ${avatarBgClass}`}>
                      {typeof profile?.avatarVal === "string" && profile.avatarVal.length < 8 ? profile.avatarVal : initials}
                    </div>
                  )}
                  {/* Status Indicator Dot */}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1e1f22] ${
                    activeVoiceChannel ? `${getDotColor(profile?.marketPresence)} animate-pulse` : getDotColor(profile?.marketPresence)
                  }`} />
                </div>

                {/* Username and subtext */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#f2f3f5] truncate max-w-[85px]" title={profile?.username || "You"}>
                    {profile?.username || "You"}
                  </span>
                  <span className="text-[10px] text-[#949ba4] font-medium leading-tight truncate max-w-[85px]" title={getStatusText(profile?.marketPresence, profile?.customStatus)}>
                    {getStatusText(profile?.marketPresence, profile?.customStatus)}
                  </span>
                </div>
              </div>

              {/* Mic, Deafen, Screen Share, and Gear settings buttons */}
              <div className="flex items-center space-x-0.5 shrink-0">
                <button
                  onClick={onToggleMic}
                  className={`p-1.5 rounded hover:bg-[#35373c] transition cursor-pointer ${
                    isMuted ? "text-rose-500" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={onToggleDeafen}
                  className={`p-1.5 rounded hover:bg-[#35373c] transition cursor-pointer ${
                    isDeafened ? "text-rose-500" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  }`}
                  title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
                >
                  {isDeafened ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Headphones className="w-4 h-4" />}
                </button>

                {activeVoiceChannel && onToggleScreenShare && (
                  <button
                    onClick={onToggleScreenShare}
                    className={`p-1.5 rounded hover:bg-[#35373c] transition cursor-pointer ${
                      isScreenSharing ? "text-rose-400 animate-pulse bg-rose-500/10" : "text-[#b5bac1] hover:text-[#dbdee1]"
                    }`}
                    title={isScreenSharing ? "Stop Screen Share" : "Share Live Trading Screen"}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveUserPopover(activeUserPopover === "self-settings" ? null : "self-settings");
                  }}
                  className={`p-1.5 rounded hover:bg-[#35373c] transition cursor-pointer ${
                    activeUserPopover === "self-settings" ? "text-white bg-[#35373c]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  }`}
                  title="Voice & Visual Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Discord-style Voice/Visual Settings Popover */}
              {activeUserPopover === "self-settings" && (
                <div
                  className="absolute right-1 bottom-14 z-50 bg-[#1e1f22] border border-[#2b2d31] rounded-lg p-3.5 shadow-2xl w-56 space-y-3.5 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Title */}
                  <div className="flex items-center justify-between pb-1 border-b border-[#2b2d31]">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#949ba4]">Voice Settings</span>
                    <Settings className="w-3.5 h-3.5 text-[#949ba4]" />
                  </div>

                  {/* Input Volume slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#949ba4]">
                      <span className="flex items-center gap-1">
                        <Mic className="w-3 h-3 text-[#23a55a]" />
                        Input Volume
                      </span>
                      <span className="font-mono text-[#23a55a] font-black">{inputVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={inputVolume}
                      onChange={(e) => onChangeInputVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#23a55a]"
                    />
                  </div>

                  {/* Volume slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#949ba4]">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-[#5865f2]" />
                        Output Volume
                      </span>
                      <span className="font-mono text-[#5865f2] font-black">{globalVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={globalVolume}
                      onChange={(e) => onChangeGlobalVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#4e5058] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>

                  {/* Visual Theme */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#949ba4] block">Aesthetic Theme</span>
                    <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded border border-[#2A2D31]/40">
                      <button
                        type="button"
                        onClick={() => handleThemeChange("classic-dark")}
                        className={`flex-1 py-1 rounded-[3px] text-[8.5px] font-bold transition-all cursor-pointer ${
                          voiceTheme === "classic-dark"
                            ? "bg-[#2A2D31] text-white"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeChange("terminal-green")}
                        className={`flex-1 py-1 rounded-[3px] text-[8.5px] font-bold transition-all cursor-pointer ${
                          voiceTheme === "terminal-green"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                            : "text-gray-500 hover:text-emerald-400"
                        }`}
                      >
                        Green
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeChange("high-contrast-blue")}
                        className={`flex-1 py-1 rounded-[3px] text-[8.5px] font-bold transition-all cursor-pointer ${
                          voiceTheme === "high-contrast-blue"
                            ? "bg-blue-600/30 text-blue-400 border border-blue-500/30"
                            : "text-gray-500 hover:text-blue-400"
                        }`}
                      >
                        Blue
                      </button>
                    </div>
                  </div>

                  {/* Open Voice Chat button */}
                  <button
                    onClick={() => {
                      onSelectChannel("voice-general-chat", "text");
                      onSwitchTab("chat");
                      setActiveUserPopover(null);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[9px] font-bold tracking-wider uppercase bg-[#4e5058]/30 hover:bg-[#4e5058]/50 text-[#f2f3f5] border border-[#2b2d31] transition cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Open Voice Chat</span>
                  </button>

                  {/* AI Risk Advisor Button */}
                  <button
                    onClick={() => {
                      onConsultAiAdvisor();
                      setActiveUserPopover(null);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[9px] font-bold tracking-wider uppercase bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/20 transition cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI Risk Advisor</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Action Buttons at Bottom */}
      <div className="p-3 border-t border-[#2A2D31] bg-[#08090A] space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {onOpenTiltGuardModal && (
            <button
              onClick={onOpenTiltGuardModal}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Desk Tilt Guard & Risk Contract"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Tilt Guard</span>
            </button>
          )}

          {onOpenFlexModal && (
            <button
              onClick={onOpenFlexModal}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Generate Verified Clean Flex Card"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Flex Card</span>
            </button>
          )}
        </div>

        <button
          onClick={onOpenLogModal}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log New Trade</span>
        </button>
      </div>
    </aside>
  );
}
