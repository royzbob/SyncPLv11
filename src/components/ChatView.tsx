import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Shield,
  ShieldPlus,
  ShieldAlert,
  Bot,
  User,
  TrendingUp,
  Menu,
  Trash2,
  Lock,
  Hash,
  UserPlus,
  UserCheck,
  Check,
  Clock,
  Sparkles,
  X,
  MessageSquare,
  Copy,
  Activity,
  Award,
} from "lucide-react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { ChatMessage, Room, UserProfile, Channel } from "../types";
import { formatCurrency } from "../utils/helpers";

interface ChatViewProps {
  activeRoom: Room;
  activeChannelName: string;
  chatMessages: ChatMessage[];
  roomTraders: UserProfile[]; // Derived profiles in the room
  userId: string;
  onSendChatMessage: (text: string) => Promise<void>;
  onDeleteChatMessage: (id: string) => Promise<void>;
  roomAdminId: string;
  roomMods: string[];
  isCreatorOrMod: boolean;
  onToggleModRole: (targetUid: string, username: string) => Promise<void>;
  onOpenSidebar?: () => void;
  channels?: Channel[];
  onSelectChannel?: (name: string, type: "text" | "voice") => void;
  profile?: UserProfile | null;
  currentUser?: FirebaseUser | null;
  db?: any;
  triggerToast?: (title: string, body: string, type: "success" | "error" | "info") => void;
}

export default function ChatView({
  activeRoom,
  activeChannelName,
  chatMessages,
  roomTraders,
  userId,
  onSendChatMessage,
  onDeleteChatMessage,
  roomAdminId,
  roomMods,
  isCreatorOrMod,
  onToggleModRole,
  onOpenSidebar,
  channels = [],
  onSelectChannel,
  profile = null,
  currentUser = null,
  db = null,
  triggerToast,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const messageStreamRef = useRef<HTMLDivElement>(null);

  // Selected partner modal state
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "accepted" | "self" | "loading">("loading");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    if (!selectedPartner) return;
    
    if (profile && selectedPartner.username.toLowerCase() === profile.username?.toLowerCase()) {
      setFriendshipStatus("self");
      return;
    }

    setFriendshipStatus("loading");

    const checkStatus = async () => {
      if (!currentUser || !db) {
        setFriendshipStatus("none");
        return;
      }

      try {
        const friendshipsRef = collection(db, "friendships");
        const snap = await getDocs(friendshipsRef);
        let matchStatus: "none" | "pending" | "accepted" = "none";

        snap.docs.forEach((d) => {
          const data = d.data();
          const isSelfSender = data.senderId === currentUser.uid;
          const isSelfReceiver = data.receiverId === currentUser.uid;
          const otherUsername = isSelfSender ? data.receiverName : data.senderName;

          if ((isSelfSender || isSelfReceiver) && otherUsername?.toLowerCase() === selectedPartner.username.toLowerCase()) {
            matchStatus = data.status === "accepted" ? "accepted" : "pending";
          }
        });

        setFriendshipStatus(matchStatus);
      } catch (err) {
        console.error("Error checking friendship status:", err);
        setFriendshipStatus("none");
      }
    };

    checkStatus();
  }, [selectedPartner, currentUser?.uid, db, profile]);

  const handleAddPartnerAsFriend = async () => {
    if (!selectedPartner || !currentUser || !profile || !db) return;
    setIsSendingRequest(true);

    try {
      const cleanUsername = selectedPartner.username.trim();

      // Find user in /users collection if registered
      const usersCol = collection(db, "users");
      const querySnap = await getDocs(usersCol);
      const matchedDoc = querySnap.docs.find((d) => {
        const u = d.data();
        return u.username && u.username.toLowerCase() === cleanUsername.toLowerCase();
      });

      const targetUid = matchedDoc ? matchedDoc.id : `user_${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const targetUser = matchedDoc ? matchedDoc.data() : null;

      const friendshipId = `friend_${currentUser.uid}_${targetUid}`;
      await setDoc(doc(db, "friendships", friendshipId), {
        id: friendshipId,
        senderId: currentUser.uid,
        senderName: profile.username || "Trader",
        senderAvatarColor: profile.avatarColor || "indigo",
        senderAvatarVal: profile.avatarVal || "🐂",
        receiverId: targetUid,
        receiverName: selectedPartner.username,
        receiverAvatarColor: targetUser?.avatarColor || selectedPartner.avatarColor || "indigo",
        receiverAvatarVal: targetUser?.avatarVal || selectedPartner.avatarVal || "🐂",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setFriendshipStatus("pending");
      if (triggerToast) {
        triggerToast("Request Dispatched", `Sent a co-trader friend request to ${selectedPartner.username}.`, "success");
      }
    } catch (err: any) {
      console.error("Failed to add partner as friend:", err);
      if (triggerToast) {
        triggerToast("Error", err.message || "Failed to dispatch friend request.", "error");
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const getPresenceIndicatorColor = (presence?: string) => {
    switch (presence) {
      case "active":
        return "bg-emerald-500";
      case "idle":
        return "bg-amber-500";
      case "dnd":
        return "bg-rose-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-emerald-400";
    }
  };

  const getPresenceLabel = (presence?: string, customStatus?: string) => {
    if (customStatus) {
      return customStatus;
    }
    switch (presence) {
      case "active":
        return "Active";
      case "idle":
        return "AFK";
      case "dnd":
        return "DND";
      case "offline":
        return "Invisible";
      default:
        return "Active";
    }
  };

  // Auto scroll down
  useEffect(() => {
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
    }
  }, [chatMessages, activeChannelName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msg = inputText.trim();
    setInputText("");
    await onSendChatMessage(msg);
  };

  // Filter messages for current active channel
  const currentChanMessages = chatMessages.filter(
    (msg) => msg.channel === activeChannelName
  );

  const textChannels = channels.filter((c) => c.type === "text");

  return (
    <div className="flex-grow flex-1 h-full min-h-0 min-w-0 flex w-full bg-[#1E2023] relative overflow-hidden">
      {/* Middle Chat Panel */}
      <div className="flex-grow flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile Horizontal Text Channels Scrollbar */}
        {textChannels.length > 0 && (
          <div className="md:hidden flex items-center bg-[#121417]/95 border-b border-[#2A2D31]/40 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar gap-1.5 shadow-md">
            <span className="text-[9px] font-black uppercase text-[#72767D] tracking-wider select-none pr-1 whitespace-nowrap">
              Desk Nodes:
            </span>
            {textChannels.map((chan) => {
              const isSelected = activeChannelName === chan.name;
              return (
                <button
                  key={chan.id}
                  onClick={() => onSelectChannel && onSelectChannel(chan.name, "text")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 border select-none cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-[#2A2D31]/40 border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <span className={isSelected ? "text-indigo-400 font-bold" : "text-[#72767D]"}>#</span>
                  <span>{chan.name}</span>
                  {chan.pin && (
                    <Lock className={`w-2.5 h-2.5 shrink-0 ${isSelected ? "text-indigo-400" : "text-amber-500"}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Message Stream */}
        <div
          ref={messageStreamRef}
          className="flex-grow p-2.5 sm:p-4 md:p-6 overflow-y-auto space-y-3 no-scrollbar bg-[#1E2023]"
        >
          {currentChanMessages.length > 0 ? (
            currentChanMessages.map((msg, idx) => {
              const isSystemEmbed = msg.isEmbed === true;
              const isMe = msg.userId === userId;
              const msgTime = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              if (isSystemEmbed) {
                // High-End Glowing Trade Ledger Embed
                const amount = msg.amount || 0;
                const isProfit = amount >= 0;
                return (
                  <div
                    key={`${msg.id}_${idx}`}
                    className="flex items-start space-x-0 sm:space-x-3 max-w-lg mx-auto py-1 animate-in fade-in zoom-in-95 duration-200 w-full group"
                  >
                    <div className="hidden sm:flex w-8 h-8 rounded bg-[#2A2D31] items-center justify-center text-white shrink-0 shadow">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-[10px] text-[#8E9297] uppercase tracking-widest">
                          SyncPL Ledger Node
                        </span>
                        <span className="text-[9px] text-[#72767D] font-mono font-bold">
                          {msgTime}
                        </span>
                        {(isMe || isCreatorOrMod) && (
                          <button
                            onClick={() => onDeleteChatMessage(msg.id)}
                            className="text-gray-500 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition cursor-pointer ml-1"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`mt-1.5 p-2.5 sm:p-3.5 bg-[#121417] border ${
                          isProfit
                            ? "border-emerald-500/20 shadow-emerald-500/5"
                            : "border-red-500/20 shadow-red-500/5"
                        } rounded relative overflow-hidden shadow-md`}
                      >
                        {/* Background flare */}
                        <div
                          className={`absolute top-0 right-0 w-20 h-20 rounded-full ${
                            isProfit ? "bg-emerald-500/5" : "bg-red-500/5"
                          } filter blur-xl`}
                        />

                        <div className="flex items-center justify-between relative z-10">
                          <div className="space-y-1">
                            <span className="block text-[8px] text-[#72767D] uppercase tracking-widest font-black">
                              TRADER
                            </span>
                            <span className="font-bold text-gray-200 text-xs">
                              {msg.username}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] text-[#72767D] uppercase tracking-widest font-black">
                              ROOM CONTRACT
                            </span>
                            <span className="font-mono text-xs font-extrabold text-indigo-400">
                              {activeRoom.id}
                            </span>
                          </div>
                        </div>

                        <div className="my-2.5 border-t border-[#2A2D31] relative z-10" />

                        <div className="flex items-center justify-between gap-4 relative z-10">
                          <span className="px-2 py-0.5 rounded bg-[#1E2023] text-[9px] font-mono font-black text-indigo-300 border border-[#2A2D31] uppercase tracking-wider">
                            {msg.asset}
                          </span>
                          <span
                            className={`font-black text-sm font-mono flex items-center gap-1 ${
                              isProfit ? "text-[#43B581]" : "text-[#F04747]"
                            }`}
                          >
                            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            {formatCurrency(amount)}
                          </span>
                        </div>

                        {msg.notes && (
                          <div className="mt-2.5 p-2 bg-[#08090A]/40 border border-[#2A2D31]/40 rounded relative z-10">
                            <p className="text-[10px] text-[#8E9297] leading-relaxed italic">
                              "{msg.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard Chat message
              const initials = msg.username.substring(0, 2).toUpperCase();
              const avatarBgClass =
                msg.avatarColor === "pink"
                  ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                  : msg.avatarColor === "emerald"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : msg.avatarColor === "amber"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : msg.avatarColor === "sky"
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";

               return (
                <div
                  key={`${msg.id}_${idx}`}
                  className="flex w-full py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 justify-start group"
                >
                  <div className="flex items-start space-x-2 sm:space-x-2.5 max-w-[92%] sm:max-w-[85%]">
                    {/* Avatar */}
                    {msg.avatarType === "url" && msg.avatarVal ? (
                      <div className="w-8 h-8 rounded border border-[#2A2D31] overflow-hidden flex items-center justify-center bg-[#08090A] shrink-0">
                        <img
                          src={msg.avatarVal}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-8 h-8 rounded border border-[#2A2D31] flex items-center justify-center font-bold text-xs ${avatarBgClass} shrink-0`}
                      >
                        {msg.avatarVal || initials}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className={`font-bold text-[11px] tracking-wide ${
                          isMe ? "text-indigo-400" : "text-[#B9BBBE]"
                        }`}>
                          {msg.username}
                        </span>
                        {(() => {
                          const traderProfile = roomTraders?.find((t) => t.username === msg.username) || (isMe ? profile : null);
                          const isTraderPremium = traderProfile?.subscriptionStatus === "active" || traderProfile?.subscriptionStatus === "trialing" || traderProfile?.subscriptionTier === "premium" || traderProfile?.subscriptionTier === "elite" || traderProfile?.subscriptionTier === "pro";
                          if (isTraderPremium) {
                            return (
                              <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded-full scale-90">
                                <Crown className="w-2.5 h-2.5 text-indigo-400 animate-pulse" /> Premium
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {isMe && (
                          <span className="text-[8px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-1 py-0.2 rounded font-black uppercase tracking-wider scale-90">
                            Me
                          </span>
                        )}
                        <span className="text-[9px] text-[#72767D] font-mono font-bold">
                          {msgTime}
                        </span>
                        {(isMe || isCreatorOrMod) && (
                          <button
                            onClick={() => onDeleteChatMessage(msg.id)}
                            className="text-gray-500 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition cursor-pointer ml-1"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className={`p-2 sm:p-2.5 border rounded text-xs font-semibold leading-relaxed break-all text-gray-200 shadow-sm ${
                        isMe
                          ? "border-indigo-500/25 bg-indigo-950/15"
                          : "border-[#2A2D31]/50 bg-[#121417]/40"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] py-16 text-[#72767D] w-full">
              <Bot className="w-12 h-12 text-[#2A2D31] mb-2 animate-pulse shrink-0" />
              <p className="text-sm font-bold">#{activeChannelName} is empty</p>
              <p className="text-xs text-center px-4 max-w-sm mt-1.5 leading-relaxed">
                Send a secure sync packet to initiate trading discussions inside this room node!
              </p>
            </div>
          )}
        </div>

        {/* Message Input Form */}
        {activeChannelName === "pnl-flex" ? (
          <div className="p-4 border-t border-[#2A2D31] shrink-0 bg-[#121417] text-center flex items-center justify-center text-xs font-bold text-[#8E9297] gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>#pnl-flex is a read-only channel. Verified trade ledgers are automatically posted here.</span>
          </div>
        ) : (
          <div className="p-2 sm:p-3 border-t border-[#2A2D31] shrink-0 bg-[#1E2023]">
            <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2">
              <input
                type="text"
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Sync to #${activeChannelName}...`}
                className="flex-grow flex-1 min-w-0 bg-[#08090A] border border-[#2A2D31] rounded px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-medium placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs p-2 sm:px-4 rounded transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 w-9 h-9 sm:w-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Sidebar: Active Members list */}
      <div className="hidden lg:flex w-52 bg-[#121417] border-l border-[#2A2D31] flex-col shrink-0 text-gray-300 h-full min-h-0">
        <div className="p-4 space-y-3 overflow-y-auto flex-grow no-scrollbar">
          <div className="px-1 mb-2">
            <span className="text-[10px] font-black text-[#8E9297] uppercase tracking-widest">
              Active Partners — {roomTraders.length}
            </span>
          </div>
          {roomTraders.map((trader) => {
            const cleanName = trader.username.trim().toLowerCase();
            const creatorNameClean = activeRoom.creatorName?.trim().toLowerCase();
            const currentProfileNameClean = profile?.username?.trim().toLowerCase();

            const isCreator = Boolean(
              (creatorNameClean && cleanName === creatorNameClean) ||
              (userId && activeRoom.creatorId && userId === activeRoom.creatorId && cleanName === currentProfileNameClean) ||
              (trader.id && activeRoom.creatorId && trader.id === activeRoom.creatorId) ||
              trader.role === "admin" ||
              trader.role === "owner"
            );
            const isMod = roomMods.some((m) => m.trim().toLowerCase() === cleanName) || trader.role === "mod";
            const showModButton = userId === activeRoom.creatorId;

            const initials = trader.username.substring(0, 2).toUpperCase();
            const avatarBgClass =
              trader.avatarColor === "pink"
                ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                : trader.avatarColor === "emerald"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : trader.avatarColor === "amber"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : trader.avatarColor === "sky"
                ? "bg-sky-400/10 border-sky-400/30 text-sky-400"
                : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";

            return (
              <div
                key={trader.username}
                onClick={() => setSelectedPartner(trader)}
                className="flex items-center justify-between p-1.5 hover:bg-[#1E2023] rounded transition group cursor-pointer border border-transparent hover:border-[#2A2D31]/50"
                title={`Click to view ${trader.username}'s profile & add friend`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="relative">
                    {trader.avatarType === "url" && trader.avatarVal ? (
                      <div className="w-7 h-7 rounded border border-[#2A2D31] overflow-hidden flex items-center justify-center bg-[#08090A] shrink-0">
                        <img
                          src={trader.avatarVal}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 rounded border border-[#2A2D31] flex items-center justify-center font-bold text-xs ${avatarBgClass} shrink-0`}
                      >
                        {trader.avatarVal || initials}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ${getPresenceIndicatorColor(trader.marketPresence)} ring-1 ring-gray-950`}></span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-200 block truncate group-hover:text-indigo-400 transition-colors">
                        {trader.username}
                      </span>
                      {isCreator ? (
                        <span className="text-[9px] font-extrabold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-0.5 shrink-0" title="Room Owner / Admin">
                          <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          Admin
                        </span>
                      ) : isMod ? (
                        <span className="text-[9px] font-extrabold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 rounded flex items-center gap-0.5 shrink-0" title="Moderator">
                          <Shield className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                          Mod
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[8px] text-[#72767D] block truncate font-mono">
                      {getPresenceLabel(trader.marketPresence, trader.customStatus)}
                    </span>
                  </div>
                </div>

                {/* Mod Toggles inside Creator's panel */}
                {showModButton && !isCreator && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleModRole(trader.username, trader.username);
                    }}
                    className="p-1 hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition duration-150"
                    title={isMod ? "Remove Mod Role" : "Grant Mod Role"}
                  >
                    {isMod ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ShieldPlus className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Partner Profile Modal */}
      {selectedPartner && (
        <div 
          className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPartner(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#121417] border border-[#2A2D31] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="h-24 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/80 relative border-b border-[#2A2D31]/50 p-3 flex justify-end items-start">
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-1.5 bg-black/40 hover:bg-black/70 text-gray-300 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar & Profile Info */}
            <div className="px-5 pb-5 pt-0 relative">
              {/* Avatar position floating over header */}
              <div className="-mt-10 mb-3 flex items-end justify-between">
                <div className="relative">
                  {selectedPartner.avatarType === "url" && selectedPartner.avatarVal ? (
                    <div className="w-16 h-16 rounded-2xl border-4 border-[#121417] overflow-hidden bg-[#08090A] shadow-lg">
                      <img src={selectedPartner.avatarVal} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl border-4 border-[#121417] bg-indigo-600/30 border-indigo-500/40 flex items-center justify-center text-2xl font-black text-indigo-300 shadow-lg">
                      {selectedPartner.avatarVal || selectedPartner.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full ${getPresenceIndicatorColor(selectedPartner.marketPresence)} ring-4 ring-[#121417]`}></span>
                </div>

                {/* Tier Badge */}
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  {selectedPartner.subscriptionTier ? selectedPartner.subscriptionTier.toUpperCase() : "PRO TRADER"}
                </span>
              </div>

              {/* Username & Badges */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white tracking-wide">{selectedPartner.username}</h3>
                  {(() => {
                    const cleanName = selectedPartner.username.trim().toLowerCase();
                    const creatorNameClean = activeRoom.creatorName?.trim().toLowerCase();
                    const currentProfileNameClean = profile?.username?.trim().toLowerCase();

                    const isPartnerAdmin = Boolean(
                      (creatorNameClean && cleanName === creatorNameClean) ||
                      (currentUser?.uid && activeRoom.creatorId && currentUser.uid === activeRoom.creatorId && cleanName === currentProfileNameClean) ||
                      (selectedPartner.id && activeRoom.creatorId && selectedPartner.id === activeRoom.creatorId) ||
                      selectedPartner.role === "admin" ||
                      selectedPartner.role === "owner"
                    );

                    const isPartnerMod = roomMods.some((m) => m.trim().toLowerCase() === cleanName) || selectedPartner.role === "mod";

                    if (isPartnerAdmin) {
                      return (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          ADMIN
                        </span>
                      );
                    }
                    if (isPartnerMod) {
                      return (
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <Shield className="w-3 h-3 text-sky-400 shrink-0" />
                          MODERATOR
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-800/40 border border-gray-700/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                        MEMBER
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8E9297]">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${getPresenceIndicatorColor(selectedPartner.marketPresence)}`}></span>
                    {getPresenceLabel(selectedPartner.marketPresence, selectedPartner.customStatus)}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[10px] text-gray-400">Node: #{activeRoom.id}</span>
                </div>
              </div>

              {/* Status Box */}
              {selectedPartner.customStatus && (
                <div className="bg-[#1E2023] border border-[#2A2D31] rounded-xl p-3 mb-4 text-xs text-gray-300 leading-relaxed italic">
                  "{selectedPartner.customStatus}"
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {friendshipStatus === "self" ? (
                  <div className="text-center text-xs text-[#8E9297] bg-[#1E2023] p-2.5 rounded-xl border border-[#2A2D31] font-semibold">
                    This is your profile node
                  </div>
                ) : friendshipStatus === "accepted" ? (
                  <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2.5 px-3 rounded-xl shadow-inner">
                    <UserCheck className="w-4 h-4" /> Co-Trader Linked
                  </div>
                ) : friendshipStatus === "pending" ? (
                  <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold py-2.5 px-3 rounded-xl shadow-inner">
                    <Clock className="w-4 h-4 animate-spin" /> Friend Request Pending
                  </div>
                ) : (
                  <button
                    onClick={handleAddPartnerAsFriend}
                    disabled={isSendingRequest || friendshipStatus === "loading"}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isSendingRequest ? "Sending Request..." : "Add as Friend / Co-Trader"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setInputText((prev) => `${prev} @${selectedPartner.username} `);
                    setSelectedPartner(null);
                  }}
                  className="w-full bg-[#1E2023] hover:bg-[#2A2D31] text-gray-200 font-bold text-xs py-2 rounded-xl border border-[#2A2D31] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Mention in #{activeChannelName}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
