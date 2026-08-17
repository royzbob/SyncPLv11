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
  Banknote,
} from "lucide-react";
import { Room, Channel, VoiceUser, UserProfile } from "../types";

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
      <div className="p-4 border-b border-[#2A2D31] flex items-center justify-between bg-[#08090A]/30">
        <div className="flex flex-col">
          <span className="text-[9px] text-[#72767D] font-extrabold tracking-widest uppercase">
            Active Workspace
          </span>
          <span
            onClick={onCopyRoomCode}
            className="text-base font-black text-indigo-400 tracking-wider font-mono cursor-pointer hover:text-indigo-300 transition flex items-center gap-1.5"
            title="Copy Invite Code"
          >
            {activeRoom.id}
          </span>
        </div>
        <button
          onClick={onCopyRoomCode}
          className="p-1.5 bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-indigo-400 rounded transition"
          title="Copy invite code"
        >
          <span className="text-[10px] font-bold">Copy</span>
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-3 border-b border-[#2A2D31] space-y-1 bg-[#0F1113]/10">
        <button
          onClick={() => onSwitchTab("dashboard")}
          className={getNavBtnClass("dashboard")}
        >
          <div className="flex items-center space-x-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </div>
        </button>

        <button
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
          onClick={() => onSwitchTab("leaderboard")}
          className={getNavBtnClass("leaderboard")}
        >
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-4 h-4" />
            <span>Leaderboard Board</span>
          </div>
        </button>

        <button
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
          onClick={() => onSwitchTab("logs")}
          className={getNavBtnClass("logs")}
        >
          <div className="flex items-center space-x-2.5">
            <History className="w-4 h-4" />
            <span>Ledger Records</span>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab("checklist")}
          className={getNavBtnClass("checklist")}
        >
          <div className="flex items-center space-x-2.5">
            <ListTodo className="w-4 h-4" />
            <span>Trading Checklist</span>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab("friends")}
          className={getNavBtnClass("friends")}
        >
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Friends & Co-Traders</span>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab("partners")}
          className={getNavBtnClass("partners")}
        >
          <div className="flex items-center space-x-2.5">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Workspace Settings</span>
          </div>
        </button>
      </div>

      {/* Channels List Section */}
      <div className="flex-grow overflow-y-auto p-3 space-y-4">
        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Text Channels
            </span>
            {isCreatorOrMod && (
              <button
                onClick={() => onAddChannelClick("text")}
                className="text-gray-500 hover:text-white transition cursor-pointer"
                title="Create Text Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {textChans.map((chan) => {
              const isSelected = (activeTab === "chat" || isChatSidePanelOpen) && activeChannelName === chan.name;
              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    onSelectChannel(chan.name, "text");
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 border ${
                    isSelected
                      ? "bg-[#2A2D31] text-white border-[#2A2D31]"
                      : "text-[#8E9297] hover:bg-[#1E2023] hover:text-white border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-indigo-400/50 font-black text-sm">#</span>
                    <span className="truncate">{chan.name}</span>
                  </div>
                  {chan.pin && (
                    <Lock className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0 ml-1.5" title="PIN Protected" />
                  )}
                </button>
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
              <button
                onClick={() => onAddChannelClick("voice")}
                className="text-gray-500 hover:text-white transition cursor-pointer"
                title="Create Voice Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {voiceChans.map((chan) => {
              const isConnected = activeVoiceChannel === chan.name;
              const chanUsers = voiceUsers.filter((v) => v.channel === chan.name);
              const count = chanUsers.length;
              const isAi =
                chan.name.includes("🤖") || chan.name.toLowerCase().includes("ai");

              return (
                <div key={chan.id} className="space-y-0.5">
                  <button
                    onClick={() => onToggleVoiceRoom(chan.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 border cursor-pointer ${
                      isConnected
                        ? isAi
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/10 hover:bg-indigo-500/15"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/15"
                        : "text-[#8E9297] hover:bg-[#1E2023]/60 hover:text-white border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {isAi ? (
                        <Bot className={`w-3.5 h-3.5 ${isConnected ? "animate-pulse text-indigo-400" : "text-gray-500"}`} />
                      ) : (
                        <Volume2 className={`w-3.5 h-3.5 ${isConnected ? "text-emerald-400" : "text-gray-500"}`} />
                      )}
                      <span className="truncate">{chan.name}</span>
                      {chan.pin && (
                        <Lock className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0" title="PIN Protected" />
                      )}
                    </div>
                    <span className="text-[10px] bg-[#1E2023] px-2 py-0.5 rounded-full text-gray-400 font-medium border border-[#2A2D31]/30">
                      {count}
                    </span>
                  </button>

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
                              {user.avatarType === "url" && user.avatarVal ? (
                                <div className={`w-4.5 h-4.5 rounded border overflow-hidden flex items-center justify-center bg-[#08090A] shrink-0 transition-all duration-200 ${
                                  user.speaking
                                    ? "ring-1.5 ring-emerald-500 border-emerald-500"
                                    : "border-[#2A2D31]"
                                }`}>
                                  <img
                                    src={user.avatarVal}
                                    alt=""
                                    className="w-full h-full object-cover"
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
                                  {user.avatarVal || initials}
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
            <div className="bg-[#1e1f22] p-2 flex items-center justify-between h-[52px] select-none relative">
              <div className="flex items-center min-w-0 space-x-2">
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  {profile?.avatarType === "url" && profile?.avatarVal ? (
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
                      {profile?.avatarVal || initials}
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

              {/* Mic, Deafen, and Gear settings buttons */}
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

      {/* Log Trade Button at Bottom */}
      <div className="p-3 border-t border-[#2A2D31] bg-[#08090A]">
        <button
          onClick={onOpenLogModal}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2.5 px-4 rounded shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log New Trade</span>
        </button>
      </div>
    </aside>
  );
}
