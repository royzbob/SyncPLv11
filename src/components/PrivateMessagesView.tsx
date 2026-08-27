import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  UserPlus,
  ArrowLeft,
  Crown,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  Image as ImageIcon,
  X,
  Download,
  Users,
  ExternalLink,
  Circle,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Rocket,
  DollarSign,
  Phone,
  DoorOpen,
  ArrowRight,
  MoreVertical,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { DirectMessage, DMConversation, UserProfile, Friendship } from "../types";
import { compressImage } from "../utils/imageCompressor";
import { playChatMessageSound } from "../utils/audio";
import { computeUserPresence, isImageAvatar } from "../utils/presence";

interface PrivateMessagesViewProps {
  currentUser: FirebaseUser;
  db: any;
  profile: UserProfile | null;
  publicUsers?: any[];
  initialPartnerId?: string | null;
  onClearInitialPartner?: () => void;
  onJoinRoomCode: (code: string) => Promise<void>;
  triggerToast: (title: string, body: string, type: "success" | "error" | "info") => void;
}

export default function PrivateMessagesView({
  currentUser,
  db,
  profile,
  publicUsers = [],
  initialPartnerId,
  onClearInitialPartner,
  onJoinRoomCode,
  triggerToast,
}: PrivateMessagesViewProps) {
  // Real-time messages & conversations
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(initialPartnerId || null);
  const [selectedPartnerInfo, setSelectedPartnerInfo] = useState<any | null>(null);

  // Periodic ticker to recalculate presence every 15s
  const [presenceTick, setPresenceTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPresenceTick((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Search & New PM modal
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewPmModalOpen, setIsNewPmModalOpen] = useState(false);
  const [friendSearchText, setFriendSearchText] = useState("");
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);

  // Input states
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ sizeKb: number; originalKb: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; sender?: string; time?: string } | null>(null);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("syncpl_pm_sound_enabled") !== "false";
    } catch {
      return true;
    }
  });

  // Mobile navigation state
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Sync initial partner if prop changes
  useEffect(() => {
    if (initialPartnerId) {
      setSelectedPartnerId(initialPartnerId);
      setIsMobileChatActive(true);
      if (onClearInitialPartner) onClearInitialPartner();
    }
  }, [initialPartnerId, onClearInitialPartner]);

  // Real-time listener for all user's direct messages (both sent & received)
  useEffect(() => {
    if (!currentUser || !db) return;

    const dmsRef = collection(db, "direct_messages");
    // Listen to messages where current user is sender or receiver
    const unsub = onSnapshot(
      dmsRef,
      (snapshot) => {
        const msgs: DirectMessage[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data() as DirectMessage;
          if (data.senderId === currentUser.uid || data.receiverId === currentUser.uid) {
            msgs.push({
              ...data,
              id: d.id,
            });
          }
        });

        // Sort chronologically
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Check if a new incoming message arrived from another user and play chime
        if (msgs.length > messages.length && messages.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.receiverId === currentUser.uid && soundEnabledRef.current) {
            playChatMessageSound(0.7, "chime");
          }
        }

        setMessages(msgs);
      },
      (err) => {
        console.error("Failed to subscribe to direct messages:", err);
      }
    );

    return () => unsub();
  }, [currentUser?.uid, db]);

  // Fetch and sync friends for "Start New PM" modal
  useEffect(() => {
    if (!currentUser || !db) return;

    const friendshipsRef = collection(db, "friendships");
    const unsub = onSnapshot(
      friendshipsRef,
      async (snapshot) => {
        const friendsList: any[] = [];
        const myUsernameLower = profile?.username?.toLowerCase() || "";

        for (const d of snapshot.docs) {
          const data = d.data() as Friendship;
          if (data.status !== "accepted") continue;

          const isSender =
            data.senderId === currentUser.uid ||
            (myUsernameLower && data.senderName?.toLowerCase() === myUsernameLower);
          const isReceiver =
            data.receiverId === currentUser.uid ||
            (myUsernameLower && data.receiverName?.toLowerCase() === myUsernameLower);

          if (isSender) {
            const partnerUid = data.receiverId;
            let partnerUser: any = null;
            if (partnerUid && !partnerUid.startsWith("user_")) {
              try {
                const uSnap = await getDoc(doc(db, "users", partnerUid));
                if (uSnap.exists()) partnerUser = uSnap.data();
              } catch (e) {
                console.warn(e);
              }
            }
            const presence = computeUserPresence(partnerUser, false);
            friendsList.push({
              uid: partnerUid,
              username: partnerUser?.username || data.receiverName,
              avatarColor: partnerUser?.avatarColor || data.receiverAvatarColor || "indigo",
              avatarVal: partnerUser?.avatarVal || data.receiverAvatarVal || "🐂",
              avatarType: partnerUser?.avatarType || "emoji",
              marketPresence: presence,
              customStatus: partnerUser?.customStatus || "Analyzing Markets",
              activeGroupId: partnerUser?.activeGroupId || "",
              subscriptionTier: partnerUser?.subscriptionTier || "free",
              lastActiveAt: partnerUser?.lastActiveAt,
            });
          } else if (isReceiver) {
            const partnerUid = data.senderId;
            let partnerUser: any = null;
            if (partnerUid && !partnerUid.startsWith("user_")) {
              try {
                const uSnap = await getDoc(doc(db, "users", partnerUid));
                if (uSnap.exists()) partnerUser = uSnap.data();
              } catch (e) {
                console.warn(e);
              }
            }
            const presence = computeUserPresence(partnerUser, false);
            friendsList.push({
              uid: partnerUid,
              username: partnerUser?.username || data.senderName,
              avatarColor: partnerUser?.avatarColor || data.senderAvatarColor || "indigo",
              avatarVal: partnerUser?.avatarVal || data.senderAvatarVal || "🐂",
              avatarType: partnerUser?.avatarType || "emoji",
              marketPresence: presence,
              customStatus: partnerUser?.customStatus || "Analyzing Markets",
              activeGroupId: partnerUser?.activeGroupId || "",
              subscriptionTier: partnerUser?.subscriptionTier || "free",
              lastActiveAt: partnerUser?.lastActiveAt,
            });
          }
        }

        setAvailableFriends(friendsList);
      },
      (err) => console.error(err)
    );

    return () => unsub();
  }, [currentUser?.uid, profile?.username, db]);

  // Aggregate messages into distinct conversations
  const conversations: DMConversation[] = useMemo(() => {
    const map = new Map<string, DMConversation>();

    messages.forEach((msg) => {
      const isSender = msg.senderId === currentUser.uid;
      const partnerId = isSender ? msg.receiverId : msg.senderId;
      const partnerName = isSender ? msg.receiverName : msg.senderName;
      const partnerAvatarColor = (isSender ? msg.receiverAvatarColor : msg.senderAvatarColor) || "indigo";
      const partnerAvatarVal = (isSender ? msg.receiverAvatarVal : msg.senderAvatarVal) || "🐂";
      const partnerAvatarType = (isSender ? msg.receiverAvatarType : msg.senderAvatarType) || "emoji";

      const friendDetail = availableFriends.find(
        (f) => f.uid === partnerId || f.username?.toLowerCase() === partnerName?.toLowerCase()
      );
      const liveUser = (publicUsers || []).find(
        (u) => u.uid === partnerId || (partnerName && u.username?.toLowerCase() === partnerName?.toLowerCase())
      );
      const computedPresence = computeUserPresence(liveUser || friendDetail, false);

      const convId = [currentUser.uid, partnerId].sort().join("_");
      const isUnread = !isSender && !msg.read;

      if (!map.has(partnerId)) {
        map.set(partnerId, {
          conversationId: convId,
          partnerId,
          partnerName: liveUser?.username || friendDetail?.username || partnerName || "Trader",
          partnerAvatarColor: liveUser?.avatarColor || friendDetail?.avatarColor || partnerAvatarColor,
          partnerAvatarVal: liveUser?.avatarVal || friendDetail?.avatarVal || partnerAvatarVal,
          partnerAvatarType: liveUser?.avatarType || friendDetail?.avatarType || partnerAvatarType,
          partnerPresence: computedPresence,
          partnerCustomStatus: liveUser?.customStatus || friendDetail?.customStatus || "Active Desk",
          partnerActiveGroupId: liveUser?.activeGroupId || friendDetail?.activeGroupId || "",
          lastMessage: msg.imageUrl ? "📷 [Trade Chart]" : msg.text,
          lastTimestamp: msg.timestamp,
          unreadCount: isUnread ? 1 : 0,
        });
      } else {
        const existing = map.get(partnerId)!;
        existing.lastMessage = msg.imageUrl ? "📷 [Trade Chart]" : msg.text;
        existing.lastTimestamp = msg.timestamp;
        if (isUnread) {
          existing.unreadCount += 1;
        }
        existing.partnerPresence = computedPresence;
        if (liveUser || friendDetail) {
          existing.partnerCustomStatus = (liveUser || friendDetail).customStatus;
          existing.partnerActiveGroupId = (liveUser || friendDetail).activeGroupId;
        }
      }
    });

    // Also include available friends even if no messages yet if they were initiated
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [messages, currentUser.uid, availableFriends, publicUsers, presenceTick]);

  // Fetch partner info whenever selectedPartnerId changes
  useEffect(() => {
    if (!selectedPartnerId) {
      setSelectedPartnerInfo(null);
      return;
    }

    const liveUser = (publicUsers || []).find((u) => u.uid === selectedPartnerId);
    const friendInfo = availableFriends.find((f) => f.uid === selectedPartnerId);
    const targetSource = liveUser || friendInfo;

    if (targetSource) {
      setSelectedPartnerInfo({
        ...targetSource,
        marketPresence: computeUserPresence(targetSource, false),
      });
    } else {
      // Find from messages or fetch from /users
      const sampleMsg = messages.find(
        (m) => m.senderId === selectedPartnerId || m.receiverId === selectedPartnerId
      );
      if (sampleMsg) {
        const isSender = sampleMsg.senderId === currentUser.uid;
        setSelectedPartnerInfo({
          uid: selectedPartnerId,
          username: isSender ? sampleMsg.receiverName : sampleMsg.senderName,
          avatarColor: (isSender ? sampleMsg.receiverAvatarColor : sampleMsg.senderAvatarColor) || "indigo",
          avatarVal: (isSender ? sampleMsg.receiverAvatarVal : sampleMsg.senderAvatarVal) || "🐂",
          avatarType: (isSender ? sampleMsg.receiverAvatarType : sampleMsg.senderAvatarType) || "emoji",
          marketPresence: "offline",
          customStatus: "Offline",
        });
      }

      // Fetch from users collection
      if (!selectedPartnerId.startsWith("user_")) {
        getDoc(doc(db, "users", selectedPartnerId))
          .then((snap) => {
            if (snap.exists()) {
              const uData = snap.data();
              setSelectedPartnerInfo((prev: any) => ({
                ...prev,
                ...uData,
                uid: selectedPartnerId,
                marketPresence: computeUserPresence(uData, false),
              }));
            }
          })
          .catch((err) => console.warn(err));
      }
    }

    // Mark unread messages in this conversation as read
    const unreadMsgs = messages.filter(
      (m) => m.senderId === selectedPartnerId && m.receiverId === currentUser.uid && !m.read
    );

    if (unreadMsgs.length > 0) {
      unreadMsgs.forEach(async (m) => {
        try {
          await updateDoc(doc(db, "direct_messages", m.id), { read: true });
        } catch (e) {
          console.warn("Failed to mark PM as read:", e);
        }
      });
    }
  }, [selectedPartnerId, availableFriends, messages, currentUser.uid, db]);

  // Messages in active conversation
  const activeConversationMessages = useMemo(() => {
    if (!selectedPartnerId) return [];
    return messages.filter(
      (m) =>
        (m.senderId === currentUser.uid && m.receiverId === selectedPartnerId) ||
        (m.senderId === selectedPartnerId && m.receiverId === currentUser.uid)
    );
  }, [messages, selectedPartnerId, currentUser.uid]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversationMessages]);

  // Image upload handling
  const handleImageFileSelected = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerToast("Invalid File", "Please select a valid image file (PNG, JPG, WEBP).", "error");
      return;
    }
    setIsCompressing(true);
    try {
      const result = await compressImage(file, 1400, 0.82);
      setAttachedImage(result.dataUrl);
      setImageMeta({ sizeKb: result.compressedSizeKb, originalKb: result.originalSizeKb });
      triggerToast("Chart Attached", `Compressed ${result.originalSizeKb}KB → ${result.compressedSizeKb}KB.`, "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Image Error", "Failed to compress trade screenshot.", "error");
    } finally {
      setIsCompressing(false);
    }
  };

  // Send Direct Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || !selectedPartnerId || !currentUser || !profile) return;

    setIsSending(true);
    const partnerName = selectedPartnerInfo?.username || "Trader";
    const textToSend = inputText.trim();
    const imageToSend = attachedImage || undefined;
    const nowIso = new Date().toISOString();

    const conversationCompoundId = [currentUser.uid, selectedPartnerId].sort().join("_");

    try {
      await addDoc(collection(db, "direct_messages"), {
        senderId: currentUser.uid,
        senderName: profile.username || "Trader",
        senderAvatarColor: profile.avatarColor || "indigo",
        senderAvatarVal: profile.avatarVal || "🐂",
        senderAvatarType: profile.avatarType || "emoji",
        receiverId: selectedPartnerId,
        receiverName: partnerName,
        receiverAvatarColor: selectedPartnerInfo?.avatarColor || "indigo",
        receiverAvatarVal: selectedPartnerInfo?.avatarVal || "🐂",
        receiverAvatarType: selectedPartnerInfo?.avatarType || "emoji",
        conversationId: `dm_${conversationCompoundId}`,
        text: textToSend,
        imageUrl: imageToSend,
        timestamp: nowIso,
        read: false,
      });

      setInputText("");
      setAttachedImage(null);
      setImageMeta(null);
    } catch (err: any) {
      console.error("Failed to send PM:", err);
      triggerToast("Send Failed", err.message || "Failed to dispatch message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, "direct_messages", messageId));
      triggerToast("Message Removed", "Private message deleted.", "info");
    } catch (err: any) {
      console.error("Failed to delete PM:", err);
      triggerToast("Error", "Could not delete message.", "error");
    }
  };

  // Quick Trading Badge insertion
  const insertTradingBadge = (badgeText: string) => {
    setInputText((prev) => (prev ? `${prev} ${badgeText} ` : `${badgeText} `));
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("syncpl_pm_sound_enabled", String(next));
    triggerToast("Sound Notifications", next ? "PM chime alerts enabled" : "PM chime alerts muted", "info");
  };

  const getPresenceColor = (presence?: string) => {
    switch (presence) {
      case "active":
        return "bg-emerald-500 ring-emerald-500/20";
      case "idle":
        return "bg-amber-500 ring-amber-500/20";
      case "dnd":
        return "bg-rose-500 ring-rose-500/20";
      case "offline":
      default:
        return "bg-gray-500 ring-gray-500/20";
    }
  };

  const getPresenceLabel = (presence?: string) => {
    switch (presence) {
      case "active":
        return "Active Desk";
      case "idle":
        return "AFK / Charts";
      case "dnd":
        return "In Session";
      case "offline":
      default:
        return "Offline";
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isToday) return timeStr;
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  // Filtered conversation list
  const filteredConversations = conversations.filter(
    (c) =>
      c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0A0C0F] text-gray-200 select-none">
      {/* 1. LEFT CONVERSATION LIST SIDEBAR */}
      <div
        className={`${
          isMobileChatActive ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r border-[#1E222B] bg-[#0C0E12] shrink-0 h-full`}
      >
        {/* Header Bar */}
        <div className="p-3.5 border-b border-[#1E222B] flex items-center justify-between bg-[#101319]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                Private Messages
                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  PM
                </span>
              </h2>
              <p className="text-[11px] text-gray-500">1-on-1 Co-Trader Channels</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                soundEnabled
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                  : "bg-[#181B22] border-[#2A2F3D] text-gray-500 hover:text-gray-300"
              }`}
              title={soundEnabled ? "PM chime active" : "PM chime muted"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsNewPmModalOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
              title="Start a new PM"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New PM</span>
            </button>
          </div>
        </div>

        {/* Search Conversations Bar */}
        <div className="p-3 border-b border-[#1E222B]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#14171E] border border-[#222733] rounded-xl py-1.5 px-3 pl-8 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 transition"
            />
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations Scroll List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#14171E] border border-[#222733] flex items-center justify-center mx-auto text-gray-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400">No active PM conversations</p>
                <p className="text-[11px] text-gray-600">
                  Click "New PM" to initiate a private direct channel with any co-trader or friend.
                </p>
              </div>
              <button
                onClick={() => setIsNewPmModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Start Private Chat
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedPartnerId === conv.partnerId;
              return (
                <button
                  key={conv.partnerId}
                  onClick={() => {
                    setSelectedPartnerId(conv.partnerId);
                    setIsMobileChatActive(true);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-center gap-3 cursor-pointer border ${
                    isSelected
                      ? "bg-[#181D26] border-indigo-500/30 text-white shadow-lg"
                      : "bg-[#10131A]/40 hover:bg-[#151922] border-transparent hover:border-[#222733] text-gray-300"
                  }`}
                >
                  {/* Avatar with Presence Indicator */}
                  <div className="relative shrink-0 select-none">
                    {isImageAvatar(conv.partnerAvatarType, conv.partnerAvatarVal) ? (
                      <div className="w-10 h-10 rounded-full border border-gray-700 overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={conv.partnerAvatarVal}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black bg-${conv.partnerAvatarColor}-500/10 border border-${conv.partnerAvatarColor}-500/30 text-${conv.partnerAvatarColor}-400`}
                      >
                        {typeof conv.partnerAvatarVal === "string" && conv.partnerAvatarVal.length < 8 ? conv.partnerAvatarVal : "🐂"}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0C0E12] ${getPresenceColor(
                        conv.partnerPresence
                      )}`}
                    />
                  </div>

                  {/* Conv Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-white truncate">{conv.partnerName}</span>
                      {conv.lastTimestamp && (
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">
                          {formatMessageTime(conv.lastTimestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                        {conv.lastMessage || "Started conversation"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[10px] rounded-full shrink-0 animate-pulse">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT ACTIVE PM CHAT VIEW */}
      <div
        className={`${
          !isMobileChatActive ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full bg-[#08090C] overflow-hidden`}
      >
        {selectedPartnerId && selectedPartnerInfo ? (
          <>
            {/* Active Thread Header */}
            <div className="h-14 border-b border-[#1E222B] bg-[#0E1015]/80 backdrop-blur px-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setIsMobileChatActive(false)}
                  className="md:hidden p-1.5 rounded-lg bg-[#181B22] border border-[#2A2F3D] text-gray-400 hover:text-white"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Partner Avatar */}
                <div className="relative shrink-0">
                  {isImageAvatar(selectedPartnerInfo.avatarType, selectedPartnerInfo.avatarVal) ? (
                    <div className="w-9 h-9 rounded-full border border-indigo-500/30 overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={selectedPartnerInfo.avatarVal}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-${
                        selectedPartnerInfo.avatarColor || "indigo"
                      }-500/10 border border-${selectedPartnerInfo.avatarColor || "indigo"}-500/30 text-${
                        selectedPartnerInfo.avatarColor || "indigo"
                      }-400`}
                    >
                      {typeof selectedPartnerInfo.avatarVal === "string" && selectedPartnerInfo.avatarVal.length < 8
                        ? selectedPartnerInfo.avatarVal
                        : "🐂"}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0E1015] ${getPresenceColor(
                      selectedPartnerInfo.marketPresence
                    )}`}
                  />
                </div>

                {/* Partner Username and Status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white truncate">
                      {selectedPartnerInfo.username}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                      {getPresenceLabel(selectedPartnerInfo.marketPresence)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">
                    {selectedPartnerInfo.customStatus ? `"${selectedPartnerInfo.customStatus}"` : "Direct Encrypted PM"}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                {/* Hop onto partner's active desk */}
                {selectedPartnerInfo.activeGroupId && (
                  <button
                    onClick={() => {
                      onJoinRoomCode(selectedPartnerInfo.activeGroupId);
                      triggerToast(
                        "Desk Joined",
                        `Hopped onto ${selectedPartnerInfo.username}'s active room!`,
                        "success"
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title={`Join room #${selectedPartnerInfo.activeGroupId}`}
                  >
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Hop into Desk</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedPartnerId(null);
                    setIsMobileChatActive(false);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#181B22] transition cursor-pointer"
                  title="Close conversation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div
              className={`flex-1 overflow-y-auto p-4 space-y-3 relative ${
                isDraggingOver ? "bg-indigo-950/20 border-2 border-dashed border-indigo-500" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  await handleImageFileSelected(e.dataTransfer.files[0]);
                }
              }}
            >
              {/* Conversation Welcoming Banner */}
              <div className="p-6 text-center bg-[#101319]/40 border border-[#1E222B] rounded-2xl max-w-md mx-auto my-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto text-2xl font-black overflow-hidden shadow-inner">
                  {isImageAvatar(selectedPartnerInfo.avatarType, selectedPartnerInfo.avatarVal) ? (
                    <img
                      src={selectedPartnerInfo.avatarVal}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    typeof selectedPartnerInfo.avatarVal === "string" && selectedPartnerInfo.avatarVal.length < 8
                      ? selectedPartnerInfo.avatarVal
                      : "🐂"
                  )}
                </div>
                <h3 className="text-sm font-black text-white">
                  Direct PM with {selectedPartnerInfo.username}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This is the start of your 1-on-1 direct channel. Exchange trade set-ups, chart screenshots, and risk notes securely in real-time.
                </p>
              </div>

              {/* Messages list */}
              {activeConversationMessages.map((msg) => {
                const isSelf = msg.senderId === currentUser.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 group ${
                      isSelf ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 select-none">
                      {isImageAvatar(msg.senderAvatarType, msg.senderAvatarVal) ? (
                        <div className="w-8 h-8 rounded-full border border-gray-700 overflow-hidden bg-black flex items-center justify-center">
                          <img
                            src={msg.senderAvatarVal}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-${
                            msg.senderAvatarColor || "indigo"
                          }-500/10 border border-${msg.senderAvatarColor || "indigo"}-500/30 text-${
                            msg.senderAvatarColor || "indigo"
                          }-400`}
                        >
                          {typeof msg.senderAvatarVal === "string" && msg.senderAvatarVal.length < 8 ? msg.senderAvatarVal : "🐂"}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] space-y-1.5 ${
                        isSelf ? "items-end text-right" : "items-start text-left"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-1">
                        <span className="font-bold text-gray-300">{msg.senderName}</span>
                        <span>•</span>
                        <span className="font-mono">{formatMessageTime(msg.timestamp)}</span>
                        {isSelf && (
                          <span title={msg.read ? "Read by recipient" : "Delivered"}>
                            {msg.read ? (
                              <CheckCheck className="w-3 h-3 text-emerald-400 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-500 inline" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed relative ${
                          isSelf
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
                            : "bg-[#14171E] border border-[#222733] text-gray-200 rounded-tl-none"
                        }`}
                      >
                        {/* Image screenshot */}
                        {msg.imageUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-black/20 bg-black/40 relative group/img max-w-sm">
                            <img
                              src={msg.imageUrl}
                              alt="Chart Screenshot"
                              className="max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() =>
                                setLightboxImage({
                                  url: msg.imageUrl!,
                                  sender: msg.senderName,
                                  time: formatMessageTime(msg.timestamp),
                                })
                              }
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur">
                              Click to expand
                            </div>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap break-words font-sans selection:bg-indigo-900 selection:text-white">
                            {msg.text}
                          </p>
                        )}
                      </div>

                      {/* Delete action on hover */}
                      {isSelf && (
                        <div className="opacity-0 group-hover:opacity-100 transition px-1">
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-[10px] text-gray-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <div className="p-3 border-t border-[#1E222B] bg-[#0C0E12] space-y-2">
              {/* Attached Image Preview */}
              {attachedImage && (
                <div className="p-2 bg-[#14171E] border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-gray-700">
                      <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Trade Chart Attached</span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {imageMeta ? `${imageMeta.sizeKb} KB (Compressed)` : "Ready to send"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setImageMeta(null);
                    }}
                    className="p-1.5 rounded-lg bg-[#1E222B] hover:bg-rose-600 hover:text-white text-gray-400 transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Trading Reactions / Callouts */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => insertTradingBadge("📈 LONG CALLOUT:")}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <TrendingUp className="w-3 h-3" /> Long
                </button>
                <button
                  type="button"
                  onClick={() => insertTradingBadge("📉 SHORT CALLOUT:")}
                  className="px-2 py-0.5 rounded-md bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-rose-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <TrendingDown className="w-3 h-3" /> Short
                </button>
                <button
                  type="button"
                  onClick={() => insertTradingBadge("🎯 TP HIT!")}
                  className="px-2 py-0.5 rounded-md bg-indigo-950/30 hover:bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <Target className="w-3 h-3" /> TP Hit
                </button>
                <button
                  type="button"
                  onClick={() => insertTradingBadge("🛑 SL TRIGGERED:")}
                  className="px-2 py-0.5 rounded-md bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 text-amber-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3 h-3" /> SL Hit
                </button>
                <button
                  type="button"
                  onClick={() => insertTradingBadge("🚀 BREAKOUT ALERT:")}
                  className="px-2 py-0.5 rounded-md bg-purple-950/30 hover:bg-purple-950/60 border border-purple-500/30 text-purple-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <Rocket className="w-3 h-3" /> Breakout
                </button>
                <button
                  type="button"
                  onClick={() => insertTradingBadge("💰 IN PROFIT:")}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <DollarSign className="w-3 h-3" /> In Profit
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageFileSelected(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="p-2.5 rounded-xl bg-[#14171E] hover:bg-[#1E222B] border border-[#222733] text-gray-400 hover:text-white transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="Attach Trade Chart Screenshot"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                </button>

                {/* Textarea */}
                <input
                  type="text"
                  placeholder={`Message @${selectedPartnerInfo.username}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 bg-[#14171E] border border-[#222733] focus:border-indigo-500/50 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-gray-600 focus:outline-none transition"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !attachedImage)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State when no conversation is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-black text-white tracking-wide">
                Direct Co-Trader Private Messages
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Select an existing conversation from the left panel or click below to message your co-traders and friends directly.
              </p>
            </div>

            <button
              onClick={() => setIsNewPmModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Start New PM Conversation</span>
            </button>

            {/* Quick Friend Cards Grid */}
            {availableFriends.length > 0 && (
              <div className="pt-6 w-full max-w-md border-t border-[#1E222B]">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3 text-left">
                  Your Co-Traders Online ({availableFriends.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {availableFriends.slice(0, 4).map((friend) => (
                    <button
                      key={friend.uid}
                      onClick={() => {
                        setSelectedPartnerId(friend.uid);
                        setIsMobileChatActive(true);
                      }}
                      className="p-2.5 rounded-xl bg-[#101319] hover:bg-[#161A24] border border-[#1E222B] hover:border-indigo-500/30 transition flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        {isImageAvatar(friend.avatarType, friend.avatarVal) ? (
                          <div className="w-8 h-8 rounded-full border border-gray-700 overflow-hidden bg-black flex items-center justify-center">
                            <img src={friend.avatarVal} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-${
                              friend.avatarColor || "indigo"
                            }-500/10 border border-${friend.avatarColor || "indigo"}-500/30 text-${
                              friend.avatarColor || "indigo"
                            }-400`}
                          >
                            {typeof friend.avatarVal === "string" && friend.avatarVal.length < 8 ? friend.avatarVal : "🐂"}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101319] ${getPresenceColor(
                            friend.marketPresence
                          )}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-white block truncate">
                          {friend.username}
                        </span>
                        <span className="text-[9px] text-gray-500 block truncate">
                          {friend.customStatus || "Active Desk"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. NEW PM MODAL */}
      {isNewPmModalOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsNewPmModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#121419] border border-[#222733] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1E222B] flex items-center justify-between bg-[#151922]/70">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Start a Private Message</h3>
                  <p className="text-[11px] text-gray-500">Pick a co-trader to open a 1-on-1 thread</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPmModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E222B] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Friend Search input */}
            <div className="p-3 border-b border-[#1E222B]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type a co-trader username..."
                  value={friendSearchText}
                  onChange={(e) => setFriendSearchText(e.target.value)}
                  className="w-full bg-[#161A24] border border-[#262C3A] rounded-xl py-2 px-3 pl-9 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Friends Selector List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {availableFriends
                .filter((f) => f.username.toLowerCase().includes(friendSearchText.toLowerCase()))
                .map((friend) => (
                  <button
                    key={friend.uid}
                    onClick={() => {
                      setSelectedPartnerId(friend.uid);
                      setIsNewPmModalOpen(false);
                      setIsMobileChatActive(true);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#14171E] hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/30 transition flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0 select-none">
                        {isImageAvatar(friend.avatarType, friend.avatarVal) ? (
                          <div className="w-9 h-9 rounded-full border border-gray-700 overflow-hidden bg-black flex items-center justify-center">
                            <img src={friend.avatarVal} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-${
                              friend.avatarColor || "indigo"
                            }-500/10 border border-${friend.avatarColor || "indigo"}-500/30 text-${
                              friend.avatarColor || "indigo"
                            }-400`}
                          >
                            {typeof friend.avatarVal === "string" && friend.avatarVal.length < 8 ? friend.avatarVal : "🐂"}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121419] ${getPresenceColor(
                            friend.marketPresence
                          )}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-white group-hover:text-indigo-400 transition block truncate">
                          {friend.username}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {friend.customStatus || "Analyzing Markets"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                      <span>Message</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}

              {availableFriends.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-xs">
                  <p className="font-bold text-gray-400">No linked co-traders found.</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Add friends in the Friends tab to build your direct PM network.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. LIGHTBOX MODAL FOR CHART PREVIEW */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="w-full max-w-4xl flex items-center justify-between pb-3 mb-2 border-b border-gray-800 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-200">
                PM Trade Chart {lightboxImage.sender ? `by ${lightboxImage.sender}` : ""}
              </span>
              {lightboxImage.time && (
                <span className="text-[10px] text-gray-500 font-mono">({lightboxImage.time})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download="syncpl_pm_chart.webp"
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

          <div
            className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-auto rounded-xl shadow-2xl border border-gray-800 bg-[#050607]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt="Full Resolution Screenshot"
              className="max-w-full max-h-[78vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
