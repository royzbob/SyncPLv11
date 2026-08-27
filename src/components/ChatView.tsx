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
  Image as ImageIcon,
  Camera,
  UploadCloud,
  Maximize2,
  Download,
  Users,
  Search,
  Circle,
  Eye,
  Loader2,
  UserX,
  CheckCircle2,
  Monitor,
  MonitorPlay,
  MonitorX,
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  PhoneOff,
  Radio,
  Tv,
} from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { ChatMessage, Room, UserProfile, Channel } from "../types";
import { formatCurrency } from "../utils/helpers";
import { compressImage } from "../utils/imageCompressor";

interface ChatViewProps {
  activeRoom: Room;
  activeChannelName: string;
  chatMessages: ChatMessage[];
  roomTraders: UserProfile[]; // Derived profiles in the room with real presence
  userId: string;
  onSendChatMessage: (text: string, imageUrl?: string) => Promise<void>;
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
  activeVoiceChannel?: string | null;
  onToggleVoiceRoom?: (channelName: string) => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onOpenScreenShareModal?: (targetUid?: string) => void;
  remoteScreenStreams?: Map<string, MediaStream>;
  voiceUsers?: Array<any>;
  isMuted?: boolean;
  isDeafened?: boolean;
  onToggleMic?: () => void;
  onToggleDeafen?: () => void;
  onDisconnectVoice?: () => void;
  onOpenPmWithUser?: (partnerId: string) => void;
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
  activeVoiceChannel = null,
  onToggleVoiceRoom,
  isScreenSharing = false,
  onToggleScreenShare,
  onOpenScreenShareModal,
  remoteScreenStreams = new Map(),
  voiceUsers = [],
  isMuted = false,
  isDeafened = false,
  onToggleMic,
  onToggleDeafen,
  onDisconnectVoice,
  onOpenPmWithUser,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messageStreamRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo attachment states
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ sizeKb: number; originalKb: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; username?: string; time?: string } | null>(null);

  // Mobile member drawer state & member filter
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Selected partner modal state
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "incoming_pending" | "outgoing_pending" | "accepted" | "self" | "loading">("loading");
  const [matchingFriendshipId, setMatchingFriendshipId] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Process and compress image file
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      if (triggerToast) triggerToast("Invalid File", "Please select a valid image file (PNG, JPG, WEBP).", "error");
      return;
    }

    setIsCompressing(true);
    try {
      const result = await compressImage(file, 1280, 0.78);
      setAttachedImage(result.dataUrl);
      setImageMeta({
        sizeKb: result.compressedSizeKb,
        originalKb: result.originalSizeKb,
      });
      if (triggerToast) {
        triggerToast(
          "Image Attached",
          `Optimized chart photo (${result.compressedSizeKb} KB - compressed from ${result.originalSizeKb} KB)`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Failed to compress image:", err);
      if (triggerToast) triggerToast("Compression Failed", "Could not process image.", "error");
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
    // Reset file input value so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Clipboard paste listener for screenshots (Ctrl+V / Cmd+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          await processImageFile(blob);
          return;
        }
      }
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processImageFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (!selectedPartner) {
      setMatchingFriendshipId(null);
      return;
    }
    
    if (profile && selectedPartner.username.toLowerCase() === profile.username?.toLowerCase()) {
      setFriendshipStatus("self");
      setMatchingFriendshipId(null);
      return;
    }

    setFriendshipStatus("loading");
    if (!currentUser || !db) {
      setFriendshipStatus("none");
      setMatchingFriendshipId(null);
      return;
    }

    const friendshipsRef = collection(db, "friendships");
    const myUsernameLower = profile?.username?.toLowerCase() || "";
    const partnerUsernameLower = selectedPartner.username.toLowerCase();

    // Listen in real-time to friendships so any accept/decline reflects instantly
    const unsub = onSnapshot(friendshipsRef, (snap) => {
      let matchStatus: "none" | "incoming_pending" | "outgoing_pending" | "accepted" = "none";
      let matchId: string | null = null;

      snap.docs.forEach((d) => {
        const data = d.data();
        const isSelfSender = data.senderId === currentUser.uid || (myUsernameLower && data.senderName?.toLowerCase() === myUsernameLower);
        const isSelfReceiver = data.receiverId === currentUser.uid || (myUsernameLower && data.receiverName?.toLowerCase() === myUsernameLower);

        const isPartnerReceiver = data.receiverId === (selectedPartner as any).uid || data.receiverId === (selectedPartner as any).id || data.receiverName?.toLowerCase() === partnerUsernameLower;
        const isPartnerSender = data.senderId === (selectedPartner as any).uid || data.senderId === (selectedPartner as any).id || data.senderName?.toLowerCase() === partnerUsernameLower;

        if (isSelfSender && isPartnerReceiver) {
          matchId = d.id;
          matchStatus = data.status === "accepted" ? "accepted" : "outgoing_pending";
        } else if (isSelfReceiver && isPartnerSender) {
          matchId = d.id;
          matchStatus = data.status === "accepted" ? "accepted" : "incoming_pending";
        }
      });

      setFriendshipStatus(matchStatus);
      setMatchingFriendshipId(matchId);
    }, (err) => {
      console.error("Error listening to friendship status:", err);
      setFriendshipStatus("none");
      setMatchingFriendshipId(null);
    });

    return () => unsub();
  }, [selectedPartner, currentUser?.uid, db, profile?.username]);

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

      const targetUid = matchedDoc ? matchedDoc.id : ((selectedPartner as any).uid || (selectedPartner as any).id || `user_${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
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

      setMatchingFriendshipId(friendshipId);
      setFriendshipStatus("outgoing_pending");
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

  const handleAcceptPartnerRequest = async () => {
    if (!matchingFriendshipId || !db) return;
    try {
      const friendshipRef = doc(db, "friendships", matchingFriendshipId);
      const updatePayload: any = {
        status: "accepted",
      };
      if (currentUser?.uid) {
        updatePayload.receiverId = currentUser.uid;
      }
      await updateDoc(friendshipRef, updatePayload);
      setFriendshipStatus("accepted");
      if (triggerToast) {
        triggerToast("Co-Trader Linked", `You and ${selectedPartner?.username} are now synchronized!`, "success");
      }
    } catch (err: any) {
      console.error("Failed to accept friend request:", err);
      if (triggerToast) {
        triggerToast("Accept Error", err.message || "Could not accept request.", "error");
      }
    }
  };

  const handleDeclinePartnerRequest = async () => {
    if (!matchingFriendshipId || !db) return;
    try {
      await deleteDoc(doc(db, "friendships", matchingFriendshipId));
      setFriendshipStatus("none");
      setMatchingFriendshipId(null);
      if (triggerToast) {
        triggerToast("Request Declined", `Declined co-trader request from ${selectedPartner?.username}.`, "info");
      }
    } catch (err: any) {
      console.error("Failed to decline friend request:", err);
      if (triggerToast) {
        triggerToast("Decline Error", err.message || "Could not decline request.", "error");
      }
    }
  };

  const handleCancelPartnerRequest = async () => {
    if (!matchingFriendshipId || !db) return;
    try {
      await deleteDoc(doc(db, "friendships", matchingFriendshipId));
      setFriendshipStatus("none");
      setMatchingFriendshipId(null);
      if (triggerToast) {
        triggerToast("Request Cancelled", `Cancelled friend request to ${selectedPartner?.username}.`, "info");
      }
    } catch (err: any) {
      console.error("Failed to cancel friend request:", err);
      if (triggerToast) {
        triggerToast("Cancel Error", err.message || "Could not cancel request.", "error");
      }
    }
  };

  const handleRemovePartnerFriendship = async () => {
    if (!matchingFriendshipId || !db) return;
    try {
      await deleteDoc(doc(db, "friendships", matchingFriendshipId));
      setFriendshipStatus("none");
      setMatchingFriendshipId(null);
      if (triggerToast) {
        triggerToast("Co-Trader Unlinked", `Removed ${selectedPartner?.username} from friends list.`, "info");
      }
    } catch (err: any) {
      console.error("Failed to remove friend:", err);
      if (triggerToast) {
        triggerToast("Error", err.message || "Could not remove friend link.", "error");
      }
    }
  };

  // Presence indicator helpers
  const getPresenceIndicatorColor = (presence?: string) => {
    switch (presence) {
      case "active":
        return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]";
      case "idle":
        return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
      case "dnd":
        return "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPresenceLabel = (presence?: string, customStatus?: string) => {
    if (customStatus) {
      return customStatus;
    }
    switch (presence) {
      case "active":
        return "Active Now";
      case "idle":
        return "AFK / Idle";
      case "dnd":
        return "Do Not Disturb";
      case "offline":
        return "Offline";
      default:
        return "Offline";
    }
  };

  // Auto scroll down
  useEffect(() => {
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
    }
  }, [chatMessages, activeChannelName, attachedImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;
    if (isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    const imageToSend = attachedImage || undefined;

    setInputText("");
    setAttachedImage(null);
    setImageMeta(null);

    try {
      await onSendChatMessage(textToSend, imageToSend);
    } catch (err) {
      console.error("Failed to send message:", err);
      if (triggerToast) triggerToast("Send Failed", "Could not dispatch message packet.", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Filter messages for current active channel
  const currentChanMessages = chatMessages.filter(
    (msg) => msg.channel === activeChannelName
  );

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  // Calculate live presence counts
  const onlineCount = roomTraders.filter((t) => t.marketPresence === "active" || t.marketPresence === "idle").length;
  const totalCount = roomTraders.length;

  // Filtered traders for mobile drawer / desktop sidebar search
  const filteredTraders = roomTraders.filter((t) =>
    t.username.toLowerCase().includes(memberSearchQuery.toLowerCase().trim())
  );

  return (
    <div
      className="flex-grow flex-1 h-full min-h-0 min-w-0 flex w-full bg-[#1E2023] relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Trade Photos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-sm border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-16 h-16 text-indigo-400 mb-3 animate-bounce" />
          <h3 className="text-lg font-black tracking-wide">Drop Trade Photo or Chart Screenshot</h3>
          <p className="text-xs text-indigo-200 mt-1">Images are automatically optimized and attached to your message.</p>
        </div>
      )}

      {/* Middle Chat Panel */}
      <div className="flex-grow flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* Top Header / Channel Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between bg-[#121417]/95 border-b border-[#2A2D31]/40 px-3 py-2 shrink-0 gap-2 shadow-sm">
          {/* Channel buttons list */}
          <div className="flex items-center overflow-x-auto no-scrollbar gap-1.5 flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase text-[#72767D] tracking-wider select-none pr-1 whitespace-nowrap hidden sm:inline">
              Channels:
            </span>
            {textChannels.map((chan) => {
              const isSelected = activeChannelName === chan.name;
              return (
                <button
                  key={chan.id}
                  onClick={() => onSelectChannel && onSelectChannel(chan.name, "text")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border select-none cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-600/15"
                      : "bg-[#1E2023] border-[#2A2D31]/50 text-gray-400 hover:text-white hover:border-[#2A2D31]"
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

            {/* Voice Channels in Chat Top Bar */}
            {voiceChannels.map((chan) => {
              const isConnected = activeVoiceChannel === chan.name;
              const hasStream = voiceUsers.some((u) => u.isStreaming && (u.channel === chan.name || isConnected));
              return (
                <button
                  key={chan.id}
                  onClick={() => onToggleVoiceRoom && onToggleVoiceRoom(chan.name)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border select-none cursor-pointer ${
                    isConnected
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-900/20"
                      : "bg-[#1E2023] border-[#2A2D31]/50 text-gray-400 hover:text-white hover:border-[#2A2D31]"
                  }`}
                  title={isConnected ? `Connected to ${chan.name} (Click to disconnect)` : `Join voice desk ${chan.name}`}
                >
                  <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-gray-500"}`} />
                  <Radio className={`w-3 h-3 ${isConnected ? "text-emerald-400" : "text-gray-400"}`} />
                  <span>{chan.name}</span>
                  {hasStream && (
                    <span className="bg-rose-600 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider animate-pulse">
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Screen Share Action Button in Chat Header */}
            {onToggleScreenShare && (
              <button
                onClick={onToggleScreenShare}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border shadow-sm ${
                  isScreenSharing
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500 animate-pulse"
                    : activeVoiceChannel
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400"
                    : "bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/30"
                }`}
                title={
                  isScreenSharing
                    ? "Click to Stop Sharing Screen"
                    : activeVoiceChannel
                    ? "Start Sharing Your Trading Screen / Charts (P2P)"
                    : "Connect to Voice & Start Screen Share"
                }
              >
                {isScreenSharing ? (
                  <>
                    <MonitorX className="w-3.5 h-3.5" />
                    <span>Stop Share</span>
                  </>
                ) : (
                  <>
                    <MonitorPlay className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                    <span>Share Screen</span>
                  </>
                )}
              </button>
            )}

            {/* Watch Stream Button (When anyone is streaming) */}
            {(remoteScreenStreams.size > 0 || isScreenSharing) && onOpenScreenShareModal && (
              <button
                onClick={() => onOpenScreenShareModal()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-black transition cursor-pointer shrink-0 animate-pulse shadow-sm"
                title="Open Live Screen Share Viewer"
              >
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>Watch Stream ({remoteScreenStreams.size + (isScreenSharing ? 1 : 0)})</span>
              </button>
            )}

            {/* Members Toggle Button */}
            <button
              onClick={() => setIsMobileMembersOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-gray-300 hover:text-white transition text-xs font-bold shrink-0 cursor-pointer shadow-sm"
              title="View Group Members & Live Online Status"
            >
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#121417]" />
              </div>
              <span className="text-[11px] font-mono font-semibold">
                {onlineCount}/{totalCount} <span className="hidden sm:inline text-gray-400">Online</span>
              </span>
            </button>
          </div>
        </div>

        {/* Persistent Voice Bar if connected while in Chat */}
        {activeVoiceChannel && (
          <div className="bg-[#121417] border-b border-[#2A2D31] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider truncate">
                Voice Desk: #{activeVoiceChannel}
              </span>
              {isScreenSharing && (
                <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 animate-pulse">
                  Streaming Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onToggleMic && (
                <button
                  onClick={onToggleMic}
                  className={`p-1.5 rounded border transition cursor-pointer text-xs font-bold flex items-center gap-1 ${
                    isMuted
                      ? "bg-rose-600/20 border-rose-500/40 text-rose-400"
                      : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="text-[10px] hidden sm:inline">{isMuted ? "Muted" : "Mute"}</span>
                </button>
              )}

              {onToggleDeafen && (
                <button
                  onClick={onToggleDeafen}
                  className={`p-1.5 rounded border transition cursor-pointer text-xs font-bold flex items-center gap-1 ${
                    isDeafened
                      ? "bg-rose-600/20 border-rose-500/40 text-rose-400"
                      : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                  }`}
                  title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
                >
                  {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Headphones className="w-3.5 h-3.5 text-indigo-400" />}
                  <span className="text-[10px] hidden sm:inline">{isDeafened ? "Deafened" : "Deafen"}</span>
                </button>
              )}

              {onToggleScreenShare && (
                <button
                  onClick={onToggleScreenShare}
                  className={`p-1.5 rounded border transition cursor-pointer text-xs font-bold flex items-center gap-1 ${
                    isScreenSharing
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30"
                  }`}
                  title={isScreenSharing ? "Stop Screen Share" : "Share Trading Screen"}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
                </button>
              )}

              {onDisconnectVoice && (
                <button
                  onClick={onDisconnectVoice}
                  className="p-1.5 bg-rose-950/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 hover:text-white rounded transition cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Disconnect from Voice"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Leave</span>
                </button>
              )}
            </div>
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

                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#1E2023] text-[9px] font-mono font-black text-indigo-300 border border-[#2A2D31] uppercase tracking-wider">
                              {msg.asset}
                            </span>
                            {(() => {
                              const acct = msg.accountType || "funded";
                              const badgeCls =
                                acct === "live"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                  : acct === "eval"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : acct === "practice"
                                  ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                              return (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badgeCls}`}
                                >
                                  {acct}
                                </span>
                              );
                            })()}
                          </div>
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

                        {/* Optional photo attached to trade embed */}
                        {msg.imageUrl && (
                          <div className="mt-2.5 relative z-10">
                            <img
                              src={msg.imageUrl}
                              alt="Trade Screenshot"
                              onClick={() => setLightboxImage({ url: msg.imageUrl!, username: msg.username, time: msgTime })}
                              className="max-h-56 w-auto rounded-lg border border-[#2A2D31] object-cover cursor-pointer hover:opacity-90 transition shadow"
                              referrerPolicy="no-referrer"
                            />
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
                  ? "bg-sky-400/10 border-sky-400/30 text-sky-400"
                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";

              return (
                <div
                  key={`${msg.id}_${idx}`}
                  className="flex w-full py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 justify-start group"
                >
                  <div className="flex items-start space-x-2 sm:space-x-2.5 max-w-[95%] sm:max-w-[85%]">
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
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-2 mb-0.5 flex-wrap">
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

                      {/* Text content */}
                      {msg.text && (
                        <div className={`p-2 sm:p-2.5 border rounded text-xs font-semibold leading-relaxed break-words text-gray-200 shadow-sm ${
                          isMe
                            ? "border-indigo-500/25 bg-indigo-950/15"
                            : "border-[#2A2D31]/50 bg-[#121417]/40"
                        }`}>
                          {msg.text}
                        </div>
                      )}

                      {/* Photo / Chart Image */}
                      {msg.imageUrl && (
                        <div className="mt-1.5 relative group/img inline-block max-w-full">
                          <div className="relative rounded-lg overflow-hidden border border-[#2A2D31] bg-[#0A0C0E] max-w-sm sm:max-w-md shadow-md">
                            <img
                              src={msg.imageUrl}
                              alt="Trade Chart"
                              onClick={() => setLightboxImage({ url: msg.imageUrl!, username: msg.username, time: msgTime })}
                              className="max-h-64 sm:max-h-80 w-auto object-contain cursor-pointer hover:opacity-95 transition-all duration-200 block"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                            {/* Hover expand overlay button */}
                            <button
                              onClick={() => setLightboxImage({ url: msg.imageUrl!, username: msg.username, time: msgTime })}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white opacity-0 group-hover/img:opacity-100 transition cursor-pointer flex items-center gap-1 text-[10px] font-bold backdrop-blur-sm"
                              title="Click to expand full size"
                            >
                              <Maximize2 className="w-3 h-3" /> Expand
                            </button>
                          </div>
                        </div>
                      )}
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
                Send a secure sync packet or attach a chart screenshot to start trading discussions in this channel!
              </p>
            </div>
          )}
        </div>

        {/* Attached Image Preview Bar (Above Input) */}
        {attachedImage && (
          <div className="px-3 py-2 bg-[#0E1012] border-t border-[#2A2D31] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-1 duration-150 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-12 h-12 rounded-lg border border-indigo-500/50 overflow-hidden bg-black shrink-0">
                <img src={attachedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Trade Photo Ready
                </span>
                <span className="text-[10px] text-gray-400 font-mono block">
                  {imageMeta ? `${imageMeta.sizeKb} KB (Compressed)` : "Optimized WebP"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachedImage(null);
                setImageMeta(null);
              }}
              className="p-1.5 rounded-lg bg-[#1E2023] hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 transition cursor-pointer"
              title="Remove attached photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Input Form */}
        {activeChannelName === "pnl-flex" ? (
          <div className="p-4 border-t border-[#2A2D31] shrink-0 bg-[#121417] text-center flex items-center justify-center text-xs font-bold text-[#8E9297] gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>#pnl-flex is a read-only channel. Verified trade ledgers are automatically posted here.</span>
          </div>
        ) : (
          <div className="p-2 sm:p-3 border-t border-[#2A2D31] shrink-0 bg-[#1E2023]">
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
              {/* Photo Upload / Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isSending}
                className={`p-2 sm:px-3 rounded-lg border transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                  attachedImage
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                    : "bg-[#121417] border-[#2A2D31] text-gray-400 hover:text-white hover:bg-[#1E2023]"
                }`}
                title="Attach Trade Chart Screenshot or Photo (or Paste with Ctrl+V)"
              >
                {isCompressing ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-indigo-400" />
                )}
                <span className="hidden md:inline text-xs font-bold">
                  {attachedImage ? "Photo Ready" : "Photo"}
                </span>
              </button>

              {/* Text Input with onPaste for screenshots */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                placeholder={`Sync to #${activeChannelName} (Paste chart screenshot with Ctrl+V)...`}
                className="flex-grow flex-1 min-w-0 bg-[#08090A] border border-[#2A2D31] rounded-lg px-2.5 sm:px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-medium placeholder-gray-500"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedImage) || isSending}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs p-2 sm:px-4 rounded-lg transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 w-9 h-9 sm:w-auto cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{isSending ? "Sending" : "Send"}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Desktop Right Sidebar: Active Members list */}
      <div className="hidden lg:flex w-56 bg-[#121417] border-l border-[#2A2D31] flex-col shrink-0 text-gray-300 h-full min-h-0">
        <div className="p-3.5 space-y-3 overflow-y-auto flex-grow no-scrollbar">
          {/* Header Stats */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-black text-[#8E9297] uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3 h-3 text-indigo-400" />
              Partners — {roomTraders.length}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-mono">
              {onlineCount} Online
            </span>
          </div>

          {/* Member Search */}
          {roomTraders.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Filter members..."
                className="w-full bg-[#08090A] border border-[#2A2D31] rounded-md pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 font-medium placeholder-gray-600"
              />
            </div>
          )}

          {/* Members List */}
          <div className="space-y-1">
            {filteredTraders.map((trader) => {
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
                  className="flex items-center justify-between p-1.5 hover:bg-[#1E2023] rounded-lg transition group cursor-pointer border border-transparent hover:border-[#2A2D31]/60"
                  title={`Click to view ${trader.username}'s profile & add friend`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="relative shrink-0">
                      {trader.avatarType === "url" && trader.avatarVal ? (
                        <div className="w-7 h-7 rounded-md border border-[#2A2D31] overflow-hidden flex items-center justify-center bg-[#08090A]">
                          <img
                            src={trader.avatarVal}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-md border border-[#2A2D31] flex items-center justify-center font-bold text-xs ${avatarBgClass}`}
                        >
                          {trader.avatarVal || initials}
                        </div>
                      )}
                      {/* Live presence indicator dot */}
                      <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ${getPresenceIndicatorColor(trader.marketPresence)} ring-2 ring-[#121417]`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-200 block truncate group-hover:text-indigo-400 transition-colors">
                          {trader.username}
                        </span>
                        {isCreator ? (
                          <span className="text-[8px] font-extrabold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-0.5 shrink-0" title="Room Owner / Admin">
                            <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            Admin
                          </span>
                        ) : isMod ? (
                          <span className="text-[8px] font-extrabold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 rounded flex items-center gap-0.5 shrink-0" title="Moderator">
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
      </div>

      {/* Mobile / Tablet Members Slide-Over Drawer */}
      {isMobileMembersOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
          onClick={() => setIsMobileMembersOpen(false)}
        >
          <div
            className="w-full max-w-xs sm:max-w-sm bg-[#121417] border-l border-[#2A2D31] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#2A2D31] flex items-center justify-between shrink-0 bg-[#0E1012]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Room Members ({totalCount})
                </h3>
              </div>
              <button
                onClick={() => setIsMobileMembersOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E2023] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presence Summary Pill */}
            <div className="p-3 bg-[#181A1D] border-b border-[#2A2D31]/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  {onlineCount} Online
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-[11px] font-bold text-gray-400 font-mono">
                  {totalCount - onlineCount} Offline
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">#{activeRoom.id}</span>
            </div>

            {/* Filter Input */}
            <div className="p-3 border-b border-[#2A2D31]/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search group members..."
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium placeholder-gray-600"
                />
              </div>
            </div>

            {/* Member List */}
            <div className="p-3 space-y-1.5 overflow-y-auto flex-grow no-scrollbar">
              {filteredTraders.map((trader) => {
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
                    key={`mobile_${trader.username}`}
                    onClick={() => {
                      setSelectedPartner(trader);
                      setIsMobileMembersOpen(false);
                    }}
                    className="flex items-center justify-between p-2 hover:bg-[#1E2023] rounded-xl transition cursor-pointer border border-[#2A2D31]/40 bg-[#141619]"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {trader.avatarType === "url" && trader.avatarVal ? (
                          <div className="w-8 h-8 rounded-lg border border-[#2A2D31] overflow-hidden flex items-center justify-center bg-[#08090A]">
                            <img
                              src={trader.avatarVal}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-lg border border-[#2A2D31] flex items-center justify-center font-bold text-xs ${avatarBgClass}`}
                          >
                            {trader.avatarVal || initials}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ${getPresenceIndicatorColor(trader.marketPresence)} ring-2 ring-[#141619]`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {trader.username}
                          </span>
                          {isCreator ? (
                            <span className="text-[8px] font-extrabold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 text-amber-400" /> Admin
                            </span>
                          ) : isMod ? (
                            <span className="text-[8px] font-extrabold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5 text-sky-400" /> Mod
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[9px] text-[#72767D] block truncate font-mono">
                          {getPresenceLabel(trader.marketPresence, trader.customStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-indigo-400 font-bold px-2 py-1 bg-indigo-500/10 rounded-md border border-indigo-500/20 shrink-0">
                      View
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for High-Resolution Image Preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-150"
          onClick={() => setLightboxImage(null)}
        >
          {/* Header Controls */}
          <div
            className="w-full max-w-4xl flex items-center justify-between pb-3 mb-2 border-b border-gray-800 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-200">
                Trade Chart {lightboxImage.username ? `by ${lightboxImage.username}` : ""}
              </span>
              {lightboxImage.time && (
                <span className="text-[10px] text-gray-500 font-mono">({lightboxImage.time})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download="syncpl_trade_chart.webp"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1 text-xs font-bold"
                title="Download full resolution image"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span>
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-600 hover:text-white text-gray-300 transition cursor-pointer"
                title="Close lightbox (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full Resolution Image Container */}
          <div
            className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-auto rounded-xl shadow-2xl border border-gray-800 bg-[#050607]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt="High-Res Trade Screenshot"
              className="max-w-full max-h-[78vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

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
                  <span className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full ${getPresenceIndicatorColor(selectedPartner.marketPresence)} ring-4 ring-[#121417]`} />
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
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className={`w-2 h-2 rounded-full ${getPresenceIndicatorColor(selectedPartner.marketPresence)}`} />
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2.5 px-3 rounded-xl shadow-inner">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Co-Trader Linked
                    </div>
                    <button
                      onClick={handleRemovePartnerFriendship}
                      className="w-full text-center text-[11px] text-gray-500 hover:text-rose-400 py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserX className="w-3 h-3" /> Unlink Co-Trader
                    </button>
                  </div>
                ) : friendshipStatus === "incoming_pending" ? (
                  <div className="space-y-2">
                    <div className="text-center text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 py-1.5 px-2 rounded-lg">
                      Received Co-Trader Link Request!
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleAcceptPartnerRequest}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-2 rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" /> Accept Link
                      </button>
                      <button
                        onClick={handleDeclinePartnerRequest}
                        className="bg-[#2A2D31] hover:bg-rose-900/30 hover:text-rose-300 text-gray-300 font-bold text-xs py-2.5 px-2 rounded-xl border border-[#3A3D42] hover:border-rose-500/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </div>
                ) : friendshipStatus === "outgoing_pending" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold py-2.5 px-3 rounded-xl shadow-inner">
                      <Clock className="w-4 h-4 animate-spin" /> Request Sent (Waiting...)
                    </div>
                    <button
                      onClick={handleCancelPartnerRequest}
                      className="w-full bg-[#1E2023] hover:bg-rose-900/20 hover:text-rose-300 text-gray-400 font-semibold text-xs py-2 rounded-xl border border-[#2A2D31] hover:border-rose-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" /> Cancel Request
                    </button>
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

                {/* Send PM Button */}
                {friendshipStatus !== "self" && onOpenPmWithUser && (
                  <button
                    onClick={() => {
                      const partnerUid = selectedPartner.userId || selectedPartner.id;
                      if (partnerUid) {
                        onOpenPmWithUser(partnerUid);
                        setSelectedPartner(null);
                      }
                    }}
                    className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-bold text-xs py-2.5 rounded-xl border border-indigo-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Send Private Message (PM)
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
