import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  where,
  limit,
  writeBatch,
} from "firebase/firestore";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Volume2,
  Info,
  AlertTriangle,
  Compass,
  LogOut,
  Sliders,
  CheckCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Clock,
  Settings,
  Lock,
  Bell,
  Coins,
  ExternalLink,
  Sparkles,
  Megaphone,
  Bookmark,
  Tag,
  Check,
  Monitor,
  MonitorPlay,
  MonitorX,
  Radio,
  Tv,
  Zap,
} from "lucide-react";

import { auth, db } from "./lib/firebase";
import { Room, Channel, VoiceUser, UserProfile, PnlLog, ChatMessage, LiveTrade, TradingRule, PayoutRecord, AccountType } from "./types";
import { generateRandomRoomCode, initialTickers, TickerInfo, formatCurrency, getLocalDateString, getLocalTimeString, DEFAULT_STRATEGIES } from "./utils/helpers";
import { playJoinSound, playLeaveSound, playChatMessageSound, ChatNotificationSound } from "./utils/audio";
import { WebRtcVoiceManager } from "./lib/webrtcVoice";
import { getApiUrl, safeFetchJson } from "./utils/api";

const isMobileOrTablet = typeof window !== "undefined" && (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 1024);

// Firestore Error Logging Support for Security Rule Verification
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Import Modular Sub-views
import SidebarRail from "./components/SidebarRail";
import ActiveRoomSidebar from "./components/ActiveRoomSidebar";
import OnboardingView from "./components/OnboardingView";
import DashboardView from "./components/DashboardView";
import ChatView from "./components/ChatView";
import LeaderboardView from "./components/LeaderboardView";
import LogsView from "./components/LogsView";
import SettingsView from "./components/SettingsView";
import ChecklistView from "./components/ChecklistView";
import FriendsView from "./components/FriendsView";
import PrivateMessagesView from "./components/PrivateMessagesView";
import PayoutsView from "./components/PayoutsView";
import RoomChallengesView from "./components/RoomChallengesView";
import CleanFlexCardModal from "./components/CleanFlexCardModal";
import TiltGuardModal from "./components/TiltGuardModal";
import GettingStartedGuideModal from "./components/GettingStartedGuideModal";
import UpdateNotifier from "./components/UpdateNotifier";
import WebUpdateNotifier from "./components/WebUpdateNotifier";
import { LiveScreenShareModal } from "./components/LiveScreenShareModal";
import ProUpgradeModal from "./components/ProUpgradeModal";
import { computeUserPresence } from "./utils/presence";

export default function App() {
  // Authentication & Profile States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [publicUsers, setPublicUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  const handleFirestoreErrorState = (err: any, contextName: string) => {
    const errorStr = String(err?.message || err || "").toLowerCase();
    const isQuota =
      err?.code === "resource-exhausted" ||
      errorStr.includes("quota exceeded") ||
      errorStr.includes("resource-exhausted") ||
      errorStr.includes("too many requests");

    if (isQuota) {
      setIsQuotaExceeded(true);
      console.warn(`Firestore quota reached (${contextName}). Daily free Spark limit reached.`);
      return;
    }

    if (err?.code === "permission-denied" || errorStr.includes("permission-denied") || errorStr.includes("permission denied")) {
      setFirebaseError("Firestore permission denied. Your custom Firestore database's security rules are blocking access.");
      return;
    }

    console.warn(`Firestore notice (${contextName}):`, err);
  };

  // Pro Upgrade Modal State for Conversions & Limit Gating
  const [proModalState, setProModalState] = useState<{
    isOpen: boolean;
    reason: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general";
  }>({ isOpen: false, reason: "general" });

  const handleOpenProModal = (
    reason: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general" = "general"
  ) => {
    setProModalState({ isOpen: true, reason });
  };

  // Performance cache refs
  const lastSyncedProfileKey = useRef<string>("");
  const lastFetchedGroupIdsKey = useRef<string>("");

  // Custom Bespoke Skin Selection (Elite Perk)
  const [activeSkin, setActiveSkin] = useState<string>(() => {
    return localStorage.getItem("syncpl_custom_skin") || "default";
  });

  useEffect(() => {
    const handleSkinChange = () => {
      const skin = localStorage.getItem("syncpl_custom_skin") || "default";
      setActiveSkin(skin);
    };
    window.addEventListener("syncpl_skin_updated", handleSkinChange);
    return () => {
      window.removeEventListener("syncpl_skin_updated", handleSkinChange);
    };
  }, []);

  // Active room data subscriptions
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelName, setActiveChannelName] = useState("general-trading");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  // Active Voice status
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isMutedAll, setIsMutedAll] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Screen Sharing WebRTC States (P2P zero cloud cost)
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [activeScreenStreamUid, setActiveScreenStreamUid] = useState<string | null>(null);
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);

  const [globalVolume, setGlobalVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("syncpl_global_volume");
      return stored ? Number(stored) : 80;
    } catch {
      return 80;
    }
  });
  const [inputVolume, setInputVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("syncpl_input_volume");
      return stored ? Number(stored) : 80;
    } catch {
      return 80;
    }
  });
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("syncpl_muted_users");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("syncpl_user_volumes");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [selectedMicId, setSelectedMicId] = useState<string>(() => {
    try {
      return localStorage.getItem("syncpl_selected_mic_id") || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem("syncpl_selected_mic_id") || "";
        setSelectedMicId(stored);
      } catch (e) {
        console.warn(e);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleToggleMuteUser = (userId: string) => {
    setMutedUsers((prev) => {
      const updated = { ...prev, [userId]: !prev[userId] };
      try {
        localStorage.setItem("syncpl_muted_users", JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleChangeUserVolume = (userId: string, volume: number) => {
    setUserVolumes((prev) => {
      const updated = { ...prev, [userId]: volume };
      try {
        localStorage.setItem("syncpl_user_volumes", JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleChangeGlobalVolume = (volume: number) => {
    setGlobalVolume(volume);
    try {
      localStorage.setItem("syncpl_global_volume", String(volume));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleChangeInputVolume = (volume: number) => {
    setInputVolume(volume);
    try {
      localStorage.setItem("syncpl_input_volume", String(volume));
    } catch (e) {
      console.warn(e);
    }
  };

  const [pnlLogs, setPnlLogs] = useState<PnlLog[]>([]);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [tradingRules, setTradingRules] = useState<TradingRule[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  // PIN lock states
  const [unlockedChannelIds, setUnlockedChannelIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("unlocked_channels");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [pendingChannelToUnlock, setPendingChannelToUnlock] = useState<Channel | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  const prevVoiceUsersRef = useRef<VoiceUser[] | null>(null);

  // Monitor voice users joins and leaves to play audio notifications
  useEffect(() => {
    if (prevVoiceUsersRef.current !== null) {
      const prev = prevVoiceUsersRef.current;
      const current = voiceUsers;

      // Someone joined a channel or hopped to another
      const joined = current.find(c => {
        const p = prev.find(prevU => prevU.id === c.id);
        return !p || p.channel !== c.channel;
      });

      // Someone left a channel or hopped to another
      const left = prev.find(p => {
        const c = current.find(currU => currU.id === p.id);
        return !c || c.channel !== p.channel;
      });

      if (joined) {
        if (!isMutedAll && !isDeafened && !mutedUsers[joined.id]) {
          const uVol = userVolumes[joined.id] !== undefined ? userVolumes[joined.id] : 100;
          playJoinSound((globalVolume / 100) * (uVol / 100));
        }
      } else if (left) {
        if (!isMutedAll && !isDeafened && !mutedUsers[left.id]) {
          const uVol = userVolumes[left.id] !== undefined ? userVolumes[left.id] : 100;
          playLeaveSound((globalVolume / 100) * (uVol / 100));
        }
      }
    }
    prevVoiceUsersRef.current = voiceUsers;
  }, [voiceUsers, isMutedAll, isDeafened, globalVolume, mutedUsers, userVolumes]);

  // Voice Activity Detection (VAD) loop using actual microphonic capture
  useEffect(() => {
    let micStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let intervalId: any = null;
    let lastSpeaking = false;

    async function startVAD() {
      if (!currentUser || !activeVoiceChannel || isMuted) {
        return;
      }
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        intervalId = setInterval(async () => {
          if (!analyser || !currentUser || !activeVoiceChannel || isMuted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // A standard threshold (average amplitude > 8) to define vocal presence
          const isSpeakingNow = average > 8;

          if (isSpeakingNow !== lastSpeaking) {
            lastSpeaking = isSpeakingNow;
            try {
              const voiceDocRef = doc(db, "voice_users", currentUser.uid);
              await updateDoc(voiceDocRef, { speaking: isSpeakingNow });
            } catch (err) {
              console.warn("VAD Firestore update failed", err);
            }
          }
        }, isMobileOrTablet ? 450 : 150);
      } catch (err) {
        console.warn("Could not initiate Voice Activity Detection loop", err);
      }
    }

    startVAD();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close();
      }
      if (currentUser && lastSpeaking) {
        const voiceDocRef = doc(db, "voice_users", currentUser.uid);
        updateDoc(voiceDocRef, { speaking: false }).catch(() => {});
      }
    };
  }, [currentUser, activeVoiceChannel, isMuted]);

  // WebRTC Real-Time Voice Audio Mesh Connection
  const webrtcVoiceRef = useRef<WebRtcVoiceManager | null>(null);

  useEffect(() => {
    if (!currentUser || !activeVoiceChannel || !activeRoom) {
      if (webrtcVoiceRef.current) {
        webrtcVoiceRef.current.destroy();
        webrtcVoiceRef.current = null;
      }
      return;
    }

    // Skip WebRTC peer mesh for synthetic AI bot channels
    const isAi = activeVoiceChannel.includes("🤖") || activeVoiceChannel.toLowerCase().includes("ai");
    if (isAi) {
      if (webrtcVoiceRef.current) {
        webrtcVoiceRef.current.destroy();
        webrtcVoiceRef.current = null;
      }
      return;
    }

    const mutedUsersList = Array.isArray(mutedUsers)
      ? mutedUsers
      : Object.keys(mutedUsers || {}).filter((k) => mutedUsers[k]);

    const manager = new WebRtcVoiceManager({
      myUid: currentUser.uid,
      groupId: activeRoom.id,
      channelName: activeVoiceChannel,
      selectedMicId,
      isMuted,
      isDeafened,
      isMutedAll,
      globalVolume,
      inputVolume,
      mutedUsers: mutedUsersList,
      userVolumes,
      onError: (err) => {
        console.warn("WebRTC voice initialization notice:", err);
      },
      onScreenShareStateChange: (isSharing, stream) => {
        setIsScreenSharing(isSharing);
        setLocalScreenStream(stream);
        if (isSharing && stream) {
          setActiveScreenStreamUid(currentUser.uid);
          setIsScreenModalOpen(true);
        }
      },
      onRemoteScreenShare: (peerUid, stream) => {
        if (stream) {
          setRemoteScreenStreams((prev) => {
            const next = new Map(prev);
            next.set(peerUid, stream);
            return next;
          });
          triggerToast("Screen Share Live", "A desk trader is sharing their live trading terminal.", "info");
        } else {
          setRemoteScreenStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerUid);
            return next;
          });
        }
      },
    });

    webrtcVoiceRef.current = manager;
    manager.start();

    return () => {
      manager.destroy();
      if (webrtcVoiceRef.current === manager) {
        webrtcVoiceRef.current = null;
      }
    };
  }, [currentUser?.uid, activeVoiceChannel, activeRoom?.id]);

  // Update WebRTC voice manager when local mute or audio controls change
  useEffect(() => {
    if (webrtcVoiceRef.current) {
      webrtcVoiceRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    if (webrtcVoiceRef.current) {
      const mutedUsersList = Array.isArray(mutedUsers)
        ? mutedUsers
        : Object.keys(mutedUsers || {}).filter((k) => mutedUsers[k]);

      webrtcVoiceRef.current.updateAudioSettings(
        isDeafened,
        isMutedAll,
        globalVolume,
        mutedUsersList,
        userVolumes,
        inputVolume,
        selectedMicId
      );
    }
  }, [isDeafened, isMutedAll, globalVolume, inputVolume, mutedUsers, userVolumes, selectedMicId]);

  // Stripe & Subscription state
  const getApiUrl = (path: string): string => {
    const isTauri = typeof window !== "undefined" && (
      (window as any).__TAURI__ || 
      window.location.protocol === "tauri:" || 
      window.location.protocol === "asset:" ||
      window.location.hostname === "tauri.localhost" ||
      window.location.hostname === ""
    );

    if (isTauri) {
      const baseUrl = ((import.meta as any).env.VITE_API_URL || "https://ais-pre-xnvqqymkqsq3dfmi7u62th-361590815324.us-west2.run.app").replace(/\/$/, "");
      return `${baseUrl}${path}`;
    }
    return path;
  };

  const [stripeConfig, setStripeConfig] = useState<{ stripeConfigured: boolean; publishableKey: string }>({
    stripeConfigured: false,
    publishableKey: "",
  });

  useEffect(() => {
    safeFetchJson<{ stripeConfigured: boolean; publishableKey: string }>("/api/payment/config")
      .then(({ ok, data }) => {
        if (ok && data) setStripeConfig(data);
      })
      .catch((err) => console.warn("Stripe config check notice:", err));
  }, []);

  const subscriptionState = useMemo(() => {
    // If the user is App Creator / Owner, grant permanent Pro VIP unlimited status universally
    const isAppOwner =
      currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.role === "owner" ||
      profile?.role === "creator";

    if (isAppOwner) {
      return { isPremium: true, daysRemaining: 9999, isExpired: false, status: "active" };
    }

    if (!profile) return { isPremium: false, daysRemaining: 0, isExpired: true, status: "none" };

    const isProTier = profile.subscriptionTier === "premium" || profile.subscriptionTier === "pro";
    const isActiveStatus = profile.subscriptionStatus === "active";

    // Check if subscription period has ended
    const periodEnd = profile.subscriptionPeriodEnd || profile.subscriptionEndDate;
    if (periodEnd) {
      const endTime = new Date(periodEnd).getTime();
      const now = Date.now();
      if (!isNaN(endTime)) {
        const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (1000 * 60 * 60 * 24)));
        const isExpired = now >= endTime;
        if (isActiveStatus || isProTier) {
          return {
            isPremium: !isExpired,
            daysRemaining,
            isExpired,
            status: isExpired ? "expired" : "active",
          };
        }
      }
    }

    if (isActiveStatus || isProTier) {
      return { isPremium: true, daysRemaining: 30, isExpired: false, status: "active" };
    }

    const trialEnd = profile.trialEndDate ? new Date(profile.trialEndDate).getTime() : 0;
    const now = Date.now();
    const isTrialExpired = trialEnd ? now >= trialEnd : true;
    const trialDaysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : 0;

    return {
      isPremium: !isTrialExpired && profile.subscriptionStatus === "trialing",
      daysRemaining: trialDaysRemaining,
      isExpired: isTrialExpired,
      status: profile.subscriptionStatus || "none",
    };
  }, [profile, currentUser]);

  // Robust Stripe checkout session completion listener and automatic Firestore persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccessParam = params.get("success") === "true";
    const sessionIdParam = params.get("session_id");

    if (isSuccessParam) {
      try {
        localStorage.setItem("syncpl_pending_pro_session", sessionIdParam || "paid");
      } catch (e) {
        console.warn("Storage notice:", e);
      }
    }

    const pendingSession = isSuccessParam || localStorage.getItem("syncpl_pending_pro_session");
    if (!pendingSession) {
      if (params.get("canceled") === "true") {
        triggerToast("Checkout Canceled", "Subscription setup was canceled. You remain on the Free Trial tier.", "info");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    if (!currentUser) return; // Wait until Firebase Auth user object is ready

    const activateUserProMembership = async () => {
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updateData = {
        subscriptionStatus: "active",
        subscriptionTier: "premium",
        subscriptionPeriodEnd: nextMonth,
        subscriptionEndDate: nextMonth,
      };

      try {
        // 1. Immediately update local React state for 0ms lag
        setProfile((prev) => (prev ? { ...prev, ...updateData } : prev));
        localStorage.setItem("syncpl_pro_active", "true");

        // 2. Query verification endpoint to register with Stripe backend
        const sessionId = sessionIdParam || localStorage.getItem("syncpl_pending_pro_session");
        if (sessionId && sessionId !== "paid") {
          try {
            await safeFetchJson<any>("/api/payment/verify-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, userId: currentUser.uid }),
            });
          } catch (e) {
            console.warn("API verify-checkout-session background notice:", e);
          }
        }

        // 3. Directly commit Pro status to Firestore database
        if (db) {
          const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
          await setDoc(profileRef, updateData, { merge: true });

          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, updateData, { merge: true });
        }

        triggerToast(
          "SyncPL Pro Activated! 👑",
          "Welcome to SyncPL Pro! Unlimited trade logs, live AI scans, and custom skins are now active.",
          "success"
        );
      } catch (err: any) {
        console.error("Error activating Pro membership in database:", err);
        // Ensure local state is upgraded even if network blips
        setProfile((prev) => (prev ? { ...prev, ...updateData } : prev));
        triggerToast("SyncPL Pro Activated! 👑", "Welcome to SyncPL Pro!", "success");
      } finally {
        try {
          localStorage.removeItem("syncpl_pending_pro_session");
        } catch {}
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    activateUserProMembership();
  }, [currentUser]);

  // Navigation tab & Tickers
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedPmUserId, setSelectedPmUserId] = useState<string | null>(null);
  const [unreadPmCount, setUnreadPmCount] = useState<number>(0);
  const [tickers, setTickers] = useState<TickerInfo[]>(initialTickers);
  const [isTiltGuardModalOpen, setIsTiltGuardModalOpen] = useState(false);
  const [isFlexModalOpen, setIsFlexModalOpen] = useState(false);
  const [flexModalLog, setFlexModalLog] = useState<PnlLog | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Global Realtime listener for incoming unread Private Messages (PMs)
  useEffect(() => {
    if (!currentUser || !db) {
      setUnreadPmCount(0);
      return;
    }
    try {
      const q = query(
        collection(db, "direct_messages"),
        where("receiverId", "==", currentUser.uid),
        where("read", "==", false)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setUnreadPmCount(snapshot.size);
        },
        (err) => {
          handleFirestoreErrorState(err, "Unread direct messages");
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn("Failed to subscribe to unread direct messages:", err);
    }
  }, [currentUser, db]);

  // Auto-show Quick Start Guide for first-time / new users
  useEffect(() => {
    if (!currentUser || !profile) return;
    const hasSeenLocal = localStorage.getItem(`syncpl_has_seen_guide_${currentUser.uid}`);
    if (!hasSeenLocal && profile.hasSeenGuide !== true) {
      const timer = setTimeout(() => {
        setIsGuideModalOpen(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.uid, profile?.hasSeenGuide]);

  const handleCloseGuide = () => {
    setIsGuideModalOpen(false);
    if (currentUser) {
      try {
        localStorage.setItem(`syncpl_has_seen_guide_${currentUser.uid}`, "true");
      } catch {}
      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      setDoc(profileRef, { hasSeenGuide: true }, { merge: true }).catch(() => {});
    }
  };

  // Global Realtime listener for all registered traders & presence in the platform
  useEffect(() => {
    if (!currentUser) {
      setPublicUsers([]);
      return;
    }
    const usersQuery = query(collection(db, "users"), limit(150));
    const unsub = onSnapshot(
      usersQuery,
      (snapshot) => {
        const map = new Map<string, any>();
        snapshot.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() });
        });
        setPublicUsers(Array.from(map.values()));
      },
      (error) => {
        handleFirestoreErrorState(error, "Global Users onSnapshot");
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  const handleOpenPmWithUser = (targetUserId: string) => {
    setSelectedPmUserId(targetUserId);
    setActiveTab("pms");
  };

  // Modals status
  const [isJoinCreateOpen, setIsJoinCreateOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameNewName, setRenameNewName] = useState("");

  // Custom Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Responsive & Custom Channel Modals state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [isChatSidePanelOpen, setIsChatSidePanelOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("syncpl_chat_sidepanel_open");
      return stored === "true"; // Defaults to false so it never cramps or clutters other views
    } catch {
      return false;
    }
  });

  const toggleChatSidePanel = (val?: boolean) => {
    setIsChatSidePanelOpen((prev) => {
      const next = typeof val === "boolean" ? val : !prev;
      try {
        localStorage.setItem("syncpl_chat_sidepanel_open", String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<"text" | "voice">("text");
  const [createChannelName, setCreateChannelName] = useState("");

  // Log Trade Form input values
  const [logType, setLogType] = useState<"profit" | "loss">("profit");
  const [logAmount, setLogAmount] = useState("");
  const [logAccountType, setLogAccountType] = useState<AccountType>("funded");
  const [logDate, setLogDate] = useState(() => getLocalDateString());
  const [logTime, setLogTime] = useState(() => getLocalTimeString());
  const [logAsset, setLogAsset] = useState("BTC");
  const [logStrategy, setLogStrategy] = useState("Breakout");
  const [logNotes, setLogNotes] = useState("");

  // Custom Strategies Management
  const [customStrategies, setCustomStrategies] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("syncpl_custom_strategies");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isAddingCustomStrategy, setIsAddingCustomStrategy] = useState(false);
  const [newCustomStrategyInput, setNewCustomStrategyInput] = useState("");

  const handleAddCustomStrategy = (strategyName: string) => {
    const trimmed = strategyName.trim();
    if (!trimmed) return;

    const allKnown = [...DEFAULT_STRATEGIES, ...customStrategies];
    const exists = allKnown.some((s) => s.toLowerCase() === trimmed.toLowerCase());

    if (!exists) {
      const updated = [...customStrategies, trimmed];
      setCustomStrategies(updated);
      try {
        localStorage.setItem("syncpl_custom_strategies", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to store custom strategy", err);
      }
      triggerToast("Strategy Saved", `"${trimmed}" added to your custom strategies list.`, "success");
    }

    setLogStrategy(trimmed);
    setNewCustomStrategyInput("");
    setIsAddingCustomStrategy(false);
  };

  const handleDeleteCustomStrategy = (strategyToDelete: string) => {
    const updated = customStrategies.filter((s) => s !== strategyToDelete);
    setCustomStrategies(updated);
    try {
      localStorage.setItem("syncpl_custom_strategies", JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to store custom strategy", err);
    }
    if (logStrategy === strategyToDelete) {
      setLogStrategy(DEFAULT_STRATEGIES[0] || "Breakout");
    }
    triggerToast("Strategy Removed", `"${strategyToDelete}" removed.`, "info");
  };

  // Chat Notification Audio Preferences
  const [chatSoundEnabled, setChatSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("syncpl_chat_sound_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [chatSoundType, setChatSoundType] = useState<ChatNotificationSound>(() => {
    try {
      return (localStorage.getItem("syncpl_chat_sound_type") as ChatNotificationSound) || "chime";
    } catch {
      return "chime";
    }
  });
  const [chatSoundVolume, setChatSoundVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("syncpl_chat_sound_vol");
      return stored ? parseFloat(stored) : 0.7;
    } catch {
      return 0.7;
    }
  });

  const chatSoundEnabledRef = useRef(chatSoundEnabled);
  chatSoundEnabledRef.current = chatSoundEnabled;
  const chatSoundTypeRef = useRef(chatSoundType);
  chatSoundTypeRef.current = chatSoundType;
  const chatSoundVolumeRef = useRef(chatSoundVolume);
  chatSoundVolumeRef.current = chatSoundVolume;

  const handleToggleChatSound = (enabled: boolean) => {
    setChatSoundEnabled(enabled);
    try {
      localStorage.setItem("syncpl_chat_sound_enabled", String(enabled));
    } catch (e) {
      console.warn(e);
    }
    triggerToast("Chat Audio Updated", enabled ? "Chat message sounds enabled" : "Chat message sounds muted", "info");
  };

  const handleChangeChatSoundType = (type: ChatNotificationSound) => {
    setChatSoundType(type);
    try {
      localStorage.setItem("syncpl_chat_sound_type", type);
    } catch (e) {
      console.warn(e);
    }
    if (type !== "off" && chatSoundEnabled) {
      playChatMessageSound(chatSoundVolume, type);
    }
  };

  const handleChangeChatSoundVolume = (vol: number) => {
    setChatSoundVolume(vol);
    try {
      localStorage.setItem("syncpl_chat_sound_vol", String(vol));
    } catch (e) {
      console.warn(e);
    }
  };

  // Voice Customizer
  const [voiceName, setVoiceName] = useState("Kore");
  const [vocalPrompt, setVocalPrompt] = useState("Speak critically like a strict hedge fund risk analyst");

  // Join Room simple input inside Modal
  const [modalJoinCode, setModalJoinCode] = useState("");
  const [modalCreateRoomName, setModalCreateRoomName] = useState("");
  const [isModalCreatingNamed, setIsModalCreatingNamed] = useState(false);

  // Dynamic Toast alerts
  const [toast, setToast] = useState<{ title: string; body: string; type: "success" | "error" | "info" } | null>(null);

  // Show status toasts
  const triggerToast = (title: string, body: string, type: "success" | "error" | "info" = "info") => {
    setToast({ title, body, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    // Initial check on mount
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Helper with AbortController timeout to prevent slow network hanging
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  // Fetch actual real-time market quotes from Yahoo Finance (via multi-tier CORS proxies with local fallbacks)
  const fetchRealMarketData = async () => {
    const symbols = "BTC-USD,ETH-USD,^NDX,^GSPC,SPY,QQQ,EURUSD=X,GC=F";
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

    const symbolMap: { [key: string]: string } = {
      "BTC-USD": "BTC/USD",
      "ETH-USD": "ETH/USD",
      "^NDX": "NQ",
      "^GSPC": "SNP500",
      "SPY": "SPY",
      "QQQ": "QQQ",
      "EURUSD=X": "EUR/USD",
      "GC=F": "GOLD"
    };

    let success = false;
    let results: any[] = [];

    // Attempt 1: Direct Fetch (works inside Tauri desktop apps with zero CORS)
    try {
      const res = await fetchWithTimeout(yahooUrl, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (data?.quoteResponse?.result) {
          results = data.quoteResponse.result;
          success = true;
        }
      }
    } catch (err) {
      // Expected to fail in web browsers due to CORS
    }

    // Attempt 2: corsproxy.io (primary high-speed raw CORS proxy)
    if (!success) {
      try {
        const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`, {}, 3000);
        if (res.ok) {
          const data = await res.json();
          if (data?.quoteResponse?.result) {
            results = data.quoteResponse.result;
            success = true;
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    // If Yahoo Finance succeeded, map and update all tickers
    if (success && results.length > 0) {
      setTickers((prev) =>
        prev.map((t) => {
          const match = results.find(
            (r) =>
              symbolMap[r.symbol] === t.symbol ||
              symbolMap[r.symbol.toUpperCase()] === t.symbol
          );
          if (match) {
            const rawPrice = match.regularMarketPrice;
            const changePercent = match.regularMarketChangePercent;
            if (rawPrice !== undefined && rawPrice !== null) {
              const decimalPlaces = t.symbol === "EUR/USD" ? 4 : 2;
              return {
                ...t,
                price: Number(Number(rawPrice).toFixed(decimalPlaces)),
                change: changePercent !== undefined && changePercent !== null ? Number(Number(changePercent).toFixed(2)) : t.change
              };
            }
          }
          return t;
        })
      );
    } else {
      // Fast fallback: fetch individual public CORS APIs (Coinbase and ExchangeRate)
      try {
        const [btcRes, ethRes] = await Promise.allSettled([
          fetchWithTimeout("https://api.coinbase.com/v2/prices/BTC-USD/spot", {}, 2500),
          fetchWithTimeout("https://api.coinbase.com/v2/prices/ETH-USD/spot", {}, 2500),
        ]);
        let btcPrice: number | null = null;
        let ethPrice: number | null = null;

        if (btcRes.status === "fulfilled" && btcRes.value.ok) {
          const btcData = await btcRes.value.json();
          if (btcData?.data?.amount) {
            btcPrice = Number(parseFloat(btcData.data.amount).toFixed(2));
          }
        }
        if (ethRes.status === "fulfilled" && ethRes.value.ok) {
          const ethData = await ethRes.value.json();
          if (ethData?.data?.amount) {
            ethPrice = Number(parseFloat(ethData.data.amount).toFixed(2));
          }
        }

        if (btcPrice || ethPrice) {
          setTickers((prev) =>
            prev.map((t) => {
              if (t.symbol === "BTC/USD" && btcPrice) {
                return { ...t, price: btcPrice };
              }
              if (t.symbol === "ETH/USD" && ethPrice) {
                return { ...t, price: ethPrice };
              }
              return t;
            })
          );
        }
      } catch (err) {
        // Fallback quiet
      }
    }
  };

  // Live real market data sync and active high-frequency tape fluctuation simulation
  useEffect(() => {
    // Initial fetch of actual real market rates
    fetchRealMarketData();

    const isPremiumTier = profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing" || profile?.subscriptionTier === "premium" || profile?.subscriptionTier === "pro" || profile?.subscriptionTier === "elite";

    // Dynamic speeds: Premium get 15s API polls (60s on mobile), Free get 30s API polls (90s on mobile)
    const apiSpeed = isPremiumTier 
      ? (isMobileOrTablet ? 60000 : 15000)
      : (isMobileOrTablet ? 90000 : 30000);

    // Dynamic tick simulation: Pro/Elite get 4s tape speed (12s on mobile), Free get 12s tape speed (36s on mobile)
    const tickSpeed = isPremiumTier
      ? (isMobileOrTablet ? 12000 : 4000)
      : (isMobileOrTablet ? 36000 : 12000);

    const apiInterval = setInterval(() => {
      fetchRealMarketData();
    }, apiSpeed);

    // Simulate micro tick changes on the UI to keep the tape moving
    const tickInterval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const delta = (Math.random() - 0.495) * 0.08; // small change
          const decimals = t.symbol === "EUR/USD" ? 4 : 2;
          const newPrice = Number((t.price * (1 + delta / 100)).toFixed(decimals));
          const newChange = Number((t.change + delta).toFixed(2));
          return { ...t, price: newPrice, change: newChange };
        })
      );
    }, tickSpeed);

    return () => {
      clearInterval(apiInterval);
      clearInterval(tickInterval);
    };
  }, [profile?.subscriptionTier, profile?.subscriptionStatus, isMobileOrTablet]);

  // 1. Auth Observer with full session restoration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          await initUserProfileAndRoom(user);
        } else {
          setCurrentUser(null);
          setProfile(null);
          setRooms([]);
          setActiveRoom(null);
        }
      } catch (err) {
        console.error("Auth state observer error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 2. Initialize profile and rooms from database
  const initUserProfileAndRoom = async (user: User) => {
    try {
      // 6-segments path compliance: users/{userId}/profile/info
      const profileRef = doc(db, "users", user.uid, "profile", "info");
      let currentProfile: UserProfile | null = null;
      
      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          currentProfile = snap.data() as UserProfile;
          let needsUpdate = false;
          if (!currentProfile.createdAt) {
            currentProfile.createdAt = new Date().toISOString();
            needsUpdate = true;
          }
          if (!currentProfile.trialEndDate) {
            const createdTime = currentProfile.createdAt ? new Date(currentProfile.createdAt).getTime() : Date.now();
            currentProfile.trialEndDate = new Date(createdTime + 3 * 24 * 60 * 60 * 1000).toISOString();
            needsUpdate = true;
          }
          if (user.email?.toLowerCase() === "1nathandrew6@gmail.com") {
            if (currentProfile.subscriptionStatus !== "active" || currentProfile.subscriptionTier !== "premium") {
              currentProfile.subscriptionStatus = "active";
              currentProfile.subscriptionTier = "premium";
              needsUpdate = true;
            }
          } else if (!currentProfile.subscriptionStatus) {
            currentProfile.subscriptionStatus = "trialing";
            needsUpdate = true;
          }
          // Ensure default room SYNC-ALPHA is joined for every user
          if (!currentProfile.groupIds || currentProfile.groupIds.length === 0 || !currentProfile.groupIds.includes("SYNC-ALPHA")) {
            currentProfile.groupIds = Array.from(new Set([...(currentProfile.groupIds || []), "SYNC-ALPHA"]));
            needsUpdate = true;
          }
          if (!currentProfile.activeGroupId) {
            currentProfile.activeGroupId = "SYNC-ALPHA";
            needsUpdate = true;
          }
          if (needsUpdate) {
            try {
              await setDoc(profileRef, currentProfile, { merge: true });
            } catch (writeErr) {
              handleFirestoreErrorState(writeErr, "setProfileDoc");
            }
          }
        }
      } catch (getErr) {
        handleFirestoreErrorState(getErr, "getProfileDoc");
      }

      if (!currentProfile) {
        // Try local storage cache
        try {
          const cached = localStorage.getItem(`syncpl_cached_profile_${user.uid}`);
          if (cached) {
            currentProfile = JSON.parse(cached);
          }
        } catch {
          // ignore
        }
      }

      if (!currentProfile) {
        // Create initial default profile
        const randomName = `Trader_${user.uid.substring(0, 5)}`;
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const isCreator = user.email?.toLowerCase() === "1nathandrew6@gmail.com";
        currentProfile = {
          username: randomName,
          avatarColor: "indigo",
          avatarType: "emoji",
          avatarVal: "🐂",
          groupIds: ["SYNC-ALPHA"],
          activeGroupId: "SYNC-ALPHA",
          createdAt: now.toISOString(),
          trialEndDate: trialEnd.toISOString(),
          subscriptionStatus: isCreator ? "active" : "trialing",
          subscriptionTier: isCreator ? "premium" : "free",
          hasSeenGuide: false,
        };
        try {
          await setDoc(profileRef, currentProfile);
        } catch (setErr) {
          handleFirestoreErrorState(setErr, "initDefaultProfile");
        }
      }

      // Cache locally
      try {
        localStorage.setItem(`syncpl_cached_profile_${user.uid}`, JSON.stringify(currentProfile));
      } catch {
        // ignore
      }

      setProfile(currentProfile);

      // Register public user directory entry immediately so user shows up in room rosters everywhere
      try {
        const publicUserRef = doc(db, "users", user.uid);
        await setDoc(
          publicUserRef,
          {
            uid: user.uid,
            username: currentProfile.username || "Trader",
            avatarColor: currentProfile.avatarColor || "indigo",
            avatarType: currentProfile.avatarType || "emoji",
            avatarVal: currentProfile.avatarVal || "🐂",
            subscriptionTier: currentProfile.subscriptionTier || "free",
            activeGroupId: currentProfile.activeGroupId || "SYNC-ALPHA",
            marketPresence: "active",
            customStatus: "Analyzing Markets",
            lastActiveAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (publicErr) {
        console.warn("Initial public user directory registration:", publicErr);
      }

      // Setup list of room items dynamically from groupIds
      const validGroupIds = currentProfile.groupIds && currentProfile.groupIds.length > 0 ? currentProfile.groupIds : ["SYNC-ALPHA"];
      const preferredRoom = localStorage.getItem("syncpl_last_active_room") || currentProfile.activeGroupId || validGroupIds[0];
      await fetchJoinedRooms(validGroupIds, preferredRoom);
    } catch (e: any) {
      handleFirestoreErrorState(e, "initUserProfileAndRoom");
    }
  };

  // Real-time observer on user profile so multi-device actions are synchronized immediately
  useEffect(() => {
    if (!currentUser) return;
    const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
    const unsubscribe = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        let updatedProfile = snap.data() as UserProfile;
        if (currentUser.email?.toLowerCase() === "1nathandrew6@gmail.com") {
          updatedProfile = {
            ...updatedProfile,
            subscriptionStatus: "active",
            subscriptionTier: "premium"
          };
        }
        setProfile(updatedProfile);
        try {
          localStorage.setItem(`syncpl_cached_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
        } catch {}
        const groupIdsKey = (updatedProfile.groupIds || []).join(",");
        if (groupIdsKey && groupIdsKey !== lastFetchedGroupIdsKey.current) {
          lastFetchedGroupIdsKey.current = groupIdsKey;
          await fetchJoinedRooms(updatedProfile.groupIds || [], updatedProfile.activeGroupId);
        }
      }
    }, (error) => {
      handleFirestoreErrorState(error, "Profile onSnapshot");
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Sync public user profile to users collection whenever meaningful public fields change
  useEffect(() => {
    if (!currentUser || !profile) return;
    const tier = (profile.subscriptionStatus === "active" || profile.subscriptionStatus === "trialing" || profile.subscriptionTier === "premium") ? "premium" : "free";
    const currentKey = `${currentUser.uid}_${profile.username}_${profile.avatarColor}_${profile.avatarType}_${profile.avatarVal}_${profile.activeGroupId}_${tier}`;
    if (currentKey === lastSyncedProfileKey.current) return;
    lastSyncedProfileKey.current = currentKey;

    const syncPublicUserDoc = async () => {
      try {
        const publicRef = doc(db, "users", currentUser.uid);
        await setDoc(publicRef, {
          uid: currentUser.uid,
          username: profile.username || "Trader",
          avatarColor: profile.avatarColor || "indigo",
          avatarType: profile.avatarType || "emoji",
          avatarVal: profile.avatarVal || "🐂",
          subscriptionTier: tier,
          activeGroupId: profile.activeGroupId || "",
        }, { merge: true });
      } catch (err) {
        handleFirestoreErrorState(err, "syncPublicUserDoc");
      }
    };
    syncPublicUserDoc();
  }, [currentUser?.uid, profile?.username, profile?.avatarColor, profile?.avatarType, profile?.avatarVal, profile?.activeGroupId, profile?.subscriptionTier, profile?.subscriptionStatus]);

  const fetchJoinedRooms = async (groupIds: string[], activeGroupId: string) => {
    try {
      const roomPromises = groupIds.map(async (gid) => {
        try {
          const roomRef = doc(db, "rooms", gid);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            return { id: gid, ...snap.data() } as Room;
          } else {
            // Auto create missing rooms so data stays robust
            const newRoom: Room = {
              id: gid,
              creatorId: currentUser?.uid || "admin",
              creatorName: profile?.username || "Trader",
              moderators: [],
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(roomRef, newRoom);
            } catch (err) {
              handleFirestoreErrorState(err, "createRoomDoc");
            }
            return newRoom;
          }
        } catch (err) {
          handleFirestoreErrorState(err, `fetchRoom-${gid}`);
          return {
            id: gid,
            creatorId: currentUser?.uid || "admin",
            creatorName: profile?.username || "Trader",
            moderators: [],
            createdAt: new Date().toISOString(),
          } as Room;
        }
      });
      const roomList = await Promise.all(roomPromises);
      setRooms(roomList);
      try {
        localStorage.setItem("syncpl_cached_rooms", JSON.stringify(roomList));
      } catch {}

      const preferredId = activeGroupId || localStorage.getItem("syncpl_last_active_room") || "";
      const active = roomList.find((r) => r.id === preferredId) || roomList[0] || null;
      setActiveRoom(active);
      if (active) {
        localStorage.setItem("syncpl_last_active_room", active.id);
      }
    } catch (e: any) {
      handleFirestoreErrorState(e, "fetchJoinedRooms");
    }
  };

  // Listeners for active room data
  useEffect(() => {
    if (!currentUser || !activeRoom) {
      setChannels([]);
      setChatMessages([]);
      setVoiceUsers([]);
      setPnlLogs([]);
      setLiveTrades([]);
      setTradingRules([]);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Observe active room document in real-time (for changes in monetization, isPaid, price, subscribers)
    const roomDocRef = doc(db, "rooms", activeRoom.id);
    const unsubRoomDoc = onSnapshot(roomDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedRoomData = { id: snapshot.id, ...snapshot.data() } as Room;
        setActiveRoom((prev) => {
          if (!prev || prev.id !== updatedRoomData.id) return prev;
          return { ...prev, ...updatedRoomData };
        });
        setRooms((prevRooms) =>
          prevRooms.map((r) => (r.id === updatedRoomData.id ? { ...r, ...updatedRoomData } : r))
        );
      }
    }, (err) => {
      handleFirestoreErrorState(err, "Room doc onSnapshot");
    });
    unsubscribers.push(unsubRoomDoc);

    // Observe channels
    const channelsQuery = query(collection(db, "channels"), where("groupId", "==", activeRoom.id));
    const unsubChannels = onSnapshot(channelsQuery, async (snapshot) => {
      const map = new Map<string, Channel>();
      snapshot.forEach((d) => {
        const data = d.data();
        map.set(d.id, { id: d.id, ...data } as Channel);
      });
      const sorted = Array.from(map.values()).sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : new Date(a.createdAt).getTime();
        const orderB = typeof b.order === "number" ? b.order : new Date(b.createdAt).getTime();
        return orderA - orderB;
      });
      setChannels(sorted);

      // If no channels exist inside room, creator should initialize standard default channels
      if (sorted.length === 0) {
        await initDefaultChannels(activeRoom.id);
      } else {
        // Auto default to first text channel if current active one is deleted/empty
        const currentActiveExists = sorted.some((c) => c.name === activeChannelName && c.type === "text");
        if (!currentActiveExists) {
          const firstText = sorted.find((c) => c.type === "text");
          if (firstText) setActiveChannelName(firstText.name);
        }
      }
    }, (error) => {
      handleFirestoreErrorState(error, "Channels onSnapshot");
    });
    unsubscribers.push(unsubChannels);

    // Observe chat messages
    let isInitialChatSnapshot = true;
    const chatQuery = query(collection(db, "chat_messages"), where("groupId", "==", activeRoom.id), limit(100));
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const map = new Map<string, ChatMessage>();
      snapshot.forEach((d) => {
        const data = d.data();
        map.set(d.id, { id: d.id, ...data } as ChatMessage);
      });

      // Browser Push Notifications & Audio Chime on newly received messages
      if (!isInitialChatSnapshot) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data() as ChatMessage;
            const isFromOtherUser = msg.userId ? msg.userId !== currentUser.uid : (msg.username !== profile?.username);
            const isRecent = msg.timestamp && new Date(msg.timestamp).getTime() > Date.now() - 30000;

            if (isFromOtherUser && isRecent) {
              // 1. Play synthesized chat notification sound
              if (chatSoundEnabledRef.current) {
                playChatMessageSound(chatSoundVolumeRef.current, chatSoundTypeRef.current);
              }

              // 2. Desktop Push Notifications
              const text = msg.text || "";
              const isTradeLog =
                msg.isEmbed === true ||
                msg.channel === "pnl-flex" ||
                text.includes("logged a verified trade") ||
                text.includes("🏁 POSITION CLOSED") ||
                text.includes("🚨 LIVE POSITION DEPLOYED");

              if (isTradeLog) {
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Desk Trade Alert", {
                    body: text || `${msg.username || "Trader"} posted a trade update.`,
                    icon: "/app_icon.png"
                  });
                }
              } else if (document.hidden) {
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(`New message from ${msg.username || "Trader"}`, {
                    body: text || (msg.imageUrl ? "Sent an image attachment" : "New chat message"),
                    icon: "/app_icon.png"
                  });
                }
              }
            }
          }
        });
      }
      isInitialChatSnapshot = false;

      const sorted = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setChatMessages(sorted);
    }, (error) => {
      handleFirestoreErrorState(error, "Chat onSnapshot");
    });
    unsubscribers.push(unsubChat);

    // Observe voice users
    const voiceQuery = query(collection(db, "voice_users"), where("groupId", "==", activeRoom.id));
    const unsubVoice = onSnapshot(voiceQuery, (snapshot) => {
      const map = new Map<string, VoiceUser>();
      snapshot.forEach((d) => {
        const data = d.data();
        map.set(d.id, { id: d.id, ...data } as VoiceUser);
      });
      setVoiceUsers(Array.from(map.values()));
    }, (error) => {
      handleFirestoreErrorState(error, "Voice onSnapshot");
    });
    unsubscribers.push(unsubVoice);

    // Observe PNL logs and Live Trades in a single unified listener
    const logsQuery = query(collection(db, "pnl_logs"), where("groupId", "==", activeRoom.id), limit(200));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsMap = new Map<string, PnlLog>();
      const liveMap = new Map<string, LiveTrade>();
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isLive === true) {
          liveMap.set(d.id, { id: d.id, ...data } as any as LiveTrade);
        } else {
          logsMap.set(d.id, { id: d.id, ...data } as PnlLog);
        }
      });
      const sortedLogs = Array.from(logsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPnlLogs(sortedLogs);
      const sortedLive = Array.from(liveMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLiveTrades(sortedLive);
    }, (error) => {
      handleFirestoreErrorState(error, "Logs onSnapshot");
    });
    unsubscribers.push(unsubLogs);

    // Observe Trading Entry Checklist Rules
    const rulesQuery = query(collection(db, "trading_rules"), where("roomId", "==", activeRoom.id));
    const unsubRules = onSnapshot(rulesQuery, (snapshot) => {
      const map = new Map<string, TradingRule>();
      snapshot.forEach((d) => {
        const data = d.data();
        map.set(d.id, { id: d.id, ...data } as TradingRule);
      });
      const sorted = Array.from(map.values()).sort((a, b) => a.order - b.order);
      setTradingRules(sorted);
    }, (error) => {
      handleFirestoreErrorState(error, "Rules onSnapshot");
    });
    unsubscribers.push(unsubRules);

    // Observe Payout Records
    const payoutsQuery = query(collection(db, "payouts"), where("groupId", "==", activeRoom.id));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const map = new Map<string, PayoutRecord>();
      snapshot.forEach((d) => {
        const data = d.data();
        map.set(d.id, { id: d.id, ...data } as PayoutRecord);
      });
      const sorted = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayouts(sorted);
    }, (error) => {
      handleFirestoreErrorState(error, "Payouts onSnapshot");
    });
    unsubscribers.push(unsubPayouts);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [currentUser?.uid, activeRoom?.id]);

  // Helper to compute realistic presence based on lastActiveAt & marketPresence
  const getComputedPresence = (
    user: any,
    isSelf: boolean = false
  ): "active" | "idle" | "dnd" | "offline" => {
    return computeUserPresence(user, isSelf, profile?.marketPresence);
  };

  // Real presence heartbeat and active status synchronization
  const lastHeartbeatPingRef = useRef<number>(0);
  useEffect(() => {
    if (!currentUser) return;

    const currentRoomId = activeRoom?.id || profile?.activeGroupId || "SYNC-ALPHA";

    const syncPresenceHeartbeat = async (status: "active" | "idle" | "offline" = "active") => {
      try {
        const publicRef = doc(db, "users", currentUser.uid);
        await setDoc(
          publicRef,
          {
            uid: currentUser.uid,
            username: profile?.username || "Trader",
            avatarColor: profile?.avatarColor || "indigo",
            avatarType: profile?.avatarType || "emoji",
            avatarVal: profile?.avatarVal || "🐂",
            activeGroupId: currentRoomId,
            marketPresence: status,
            lastActiveAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        // quiet presence heartbeat
      }
    };

    // Initial ping on connection
    syncPresenceHeartbeat("active");

    // Recurring 35-second heartbeat
    const heartbeatTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncPresenceHeartbeat("active");
      } else {
        syncPresenceHeartbeat("idle");
      }
    }, 35000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncPresenceHeartbeat("active");
      } else {
        syncPresenceHeartbeat("idle");
      }
    };

    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastHeartbeatPingRef.current > 30000) {
        lastHeartbeatPingRef.current = now;
        syncPresenceHeartbeat("active");
      }
    };

    const onBeforeUnload = () => {
      syncPresenceHeartbeat("offline");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pointerdown", onUserActivity);
    window.addEventListener("keydown", onUserActivity);

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
    };
  }, [currentUser?.uid, activeRoom?.id, profile?.activeGroupId, profile?.username, profile?.avatarColor, profile?.avatarType, profile?.avatarVal]);

  // Dynamically derive room traders with live presence, status, and custom settings (Optimized Memo)
  const traders = useMemo(() => {
    if (!activeRoom) return [];

    const derivedTraders: UserProfile[] = [];
    const addedUsernames = new Set<string>();

    // 1. Current user
    const myUsername = profile?.username || "Me";
    const myPublicInfo = publicUsers.find(u => u.uid === currentUser?.uid);
    derivedTraders.push({
      username: myUsername,
      avatarColor: profile?.avatarColor || "indigo",
      avatarType: profile?.avatarType || "emoji",
      avatarVal: profile?.avatarVal || "🐂",
      groupIds: profile?.groupIds || [activeRoom.id],
      activeGroupId: activeRoom.id,
      marketPresence: getComputedPresence(myPublicInfo, true),
      customStatus: myPublicInfo?.customStatus || "",
      lastActiveAt: myPublicInfo?.lastActiveAt || new Date().toISOString(),
    } as any);
    addedUsernames.add(myUsername.toLowerCase());

    // 2. Other users in the same active room (from Firestore users list)
    publicUsers.forEach((user) => {
      const userActiveRoom = user.activeGroupId || "SYNC-ALPHA";
      const isUserInRoom =
        userActiveRoom === activeRoom.id ||
        (user.groupIds && user.groupIds.includes(activeRoom.id)) ||
        activeRoom.id === "SYNC-ALPHA";

      if (isUserInRoom) {
        const lowerName = (user.username || "").toLowerCase();
        if (lowerName && !addedUsernames.has(lowerName)) {
          derivedTraders.push({
            username: user.username,
            avatarColor: user.avatarColor || "indigo",
            avatarType: user.avatarType || "emoji",
            avatarVal: user.avatarVal || "🐂",
            groupIds: user.groupIds || [activeRoom.id],
            activeGroupId: user.activeGroupId || activeRoom.id,
            marketPresence: getComputedPresence(user, false),
            customStatus: user.customStatus || "",
            lastActiveAt: user.lastActiveAt,
          } as any);
          addedUsernames.add(lowerName);
        }
      }
    });

    // 3. Plus any other traders who have logged trades in this room (even if currently in another room / offline)
    pnlLogs.forEach((log) => {
      const lowerName = (log.username || "").toLowerCase();
      if (lowerName && !addedUsernames.has(lowerName)) {
        const matchedUser = publicUsers.find(u => u.username?.toLowerCase() === lowerName);
        if (matchedUser) {
          derivedTraders.push({
            username: matchedUser.username || log.username,
            avatarColor: matchedUser.avatarColor || "pink",
            avatarType: matchedUser.avatarType || "emoji",
            avatarVal: matchedUser.avatarVal || "📈",
            groupIds: matchedUser.groupIds || [activeRoom.id],
            activeGroupId: matchedUser.activeGroupId || activeRoom.id,
            marketPresence: getComputedPresence(matchedUser, false),
            customStatus: matchedUser.customStatus || "",
            lastActiveAt: matchedUser.lastActiveAt,
          } as any);
        } else {
          derivedTraders.push({
            username: log.username,
            avatarColor: "pink",
            avatarType: "emoji",
            avatarVal: "📈",
            groupIds: [activeRoom.id],
            activeGroupId: activeRoom.id,
            marketPresence: "offline",
            customStatus: "",
          } as any);
        }
        addedUsernames.add(lowerName);
      }
    });

    // Sort traders: Active first, then AFK/Idle, then Offline, then alphabetically
    const presenceRank: Record<string, number> = {
      active: 1,
      idle: 2,
      dnd: 3,
      offline: 4,
    };
    derivedTraders.sort((a, b) => {
      const rankA = presenceRank[a.marketPresence || "offline"] || 4;
      const rankB = presenceRank[b.marketPresence || "offline"] || 4;
      if (rankA !== rankB) return rankA - rankB;
      return a.username.localeCompare(b.username);
    });

    return derivedTraders;
  }, [profile?.username, profile?.avatarColor, profile?.avatarType, profile?.avatarVal, activeRoom?.id, publicUsers, pnlLogs, currentUser?.uid]);

  const initDefaultChannels = async (roomId: string) => {
    try {
      const channelsCol = collection(db, "channels");
      const defaults = [
        { name: "general-trading", type: "text", groupId: roomId, createdAt: new Date().toISOString(), order: 0 },
        { name: "pnl-flex", type: "text", groupId: roomId, createdAt: new Date().toISOString(), order: 1 },
        { name: "market-alpha", type: "text", groupId: roomId, createdAt: new Date().toISOString(), order: 2 },
        { name: "voice-general-chat", type: "text", groupId: roomId, createdAt: new Date().toISOString(), order: 3 },
        { name: "Voice Desk 1", type: "voice", groupId: roomId, createdAt: new Date().toISOString(), order: 0 },
        { name: "🎥 Live Screenshare", type: "voice", groupId: roomId, createdAt: new Date().toISOString(), order: 1 },
        { name: "🤖 AI Risk Assistant", type: "voice", groupId: roomId, createdAt: new Date().toISOString(), order: 2 },
      ];
      for (const item of defaults) {
        await addDoc(channelsCol, item);
      }
    } catch (e) {
      console.error("Failed to seed default channels:", e);
    }
  };

  // Auth Operations
  const handleGuestAuth = async (name: string) => {
    try {
      const cred = await signInAnonymously(auth);
      const profileRef = doc(db, "users", cred.user.uid, "profile", "info");
      const defaultProfile: UserProfile = {
        username: name,
        avatarColor: "indigo",
        avatarType: "emoji",
        avatarVal: "🐂",
        groupIds: ["SYNC-ALPHA"],
        activeGroupId: "SYNC-ALPHA",
        createdAt: new Date().toISOString(),
        subscriptionStatus: "trialing",
        subscriptionTier: "free",
        hasSeenGuide: false,
      };
      await setDoc(profileRef, defaultProfile);
      setProfile(defaultProfile);

      // Register public user document immediately
      const publicUserRef = doc(db, "users", cred.user.uid);
      await setDoc(
        publicUserRef,
        {
          uid: cred.user.uid,
          username: name,
          avatarColor: "indigo",
          avatarType: "emoji",
          avatarVal: "🐂",
          subscriptionTier: "free",
          activeGroupId: "SYNC-ALPHA",
          marketPresence: "active",
          customStatus: "Analyzing Markets",
          lastActiveAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      triggerToast("Welcome to SyncPL!", `Logged in safely as ${name}.`, "success");
    } catch (e: any) {
      throw new Error(e.message || "Guest authentication gateway rejected.");
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      triggerToast("Logged In", "Synchronized secure profiles successfully.", "success");
    } catch (e: any) {
      throw new Error(e.message || "Credentials incorrect or user not found.");
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      triggerToast("Reset Link Sent", "Check your inbox for password reset instructions.", "success");
    } catch (e: any) {
      throw new Error(e.message || "Failed to send password reset email.");
    }
  };

  const handleEmailRegister = async (name: string, email: string, pass: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const isCreator = email.toLowerCase() === "1nathandrew6@gmail.com";
      const profileRef = doc(db, "users", cred.user.uid, "profile", "info");
      const newProfile: UserProfile = {
        username: name,
        avatarColor: "indigo",
        avatarType: "emoji",
        avatarVal: "🐂",
        groupIds: ["SYNC-ALPHA"],
        activeGroupId: "SYNC-ALPHA",
        createdAt: new Date().toISOString(),
        subscriptionStatus: isCreator ? "active" : "trialing",
        subscriptionTier: isCreator ? "premium" : "free",
        hasSeenGuide: false,
      };
      await setDoc(profileRef, newProfile);
      setProfile(newProfile);

      // Register public user document immediately
      const publicUserRef = doc(db, "users", cred.user.uid);
      await setDoc(
        publicUserRef,
        {
          uid: cred.user.uid,
          username: name,
          avatarColor: "indigo",
          avatarType: "emoji",
          avatarVal: "🐂",
          subscriptionTier: isCreator ? "premium" : "free",
          activeGroupId: "SYNC-ALPHA",
          marketPresence: "active",
          customStatus: "Analyzing Markets",
          lastActiveAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      triggerToast("Account Created", "Welcome to SyncPL Trading Desk!", "success");
    } catch (e: any) {
      throw new Error(e.message || "Failed to register profile credentials.");
    }
  };

  const handleLogout = async () => {
    if (activeVoiceChannel) {
      await handleDisconnectVoice();
    }
    await signOut(auth);
    triggerToast("Signed Out", "Disconnected active sync nodes.", "info");
  };

  // Multi-Room Switching & Admin triggers
  const handleSelectRoom = async (roomId: string) => {
    if (roomId === activeRoom?.id) return;
    if (roomId) {
      localStorage.setItem("syncpl_last_active_room", roomId);
    }
    if (activeVoiceChannel) {
      await handleDisconnectVoice();
    }
    // Update activeGroupId in Firestore profile so all connected client tabs match immediately!
    if (currentUser) {
      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      await updateDoc(profileRef, { activeGroupId: roomId });
    }
    triggerToast("Room Switched", `Entered contract workspace: ${roomId}`, "success");
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!currentUser || !profile) return;
    
    triggerConfirm(
      "Exit Room Workspace",
      `Are you sure you want to exit Room ${roomId}?`,
      async () => {
        if (activeVoiceChannel && activeRoom?.id === roomId) {
          await handleDisconnectVoice();
        }

        const updatedGroupIds = profile.groupIds.filter((g) => g !== roomId);
        let nextActive = profile.activeGroupId;
        if (profile.activeGroupId === roomId) {
          nextActive = updatedGroupIds[0] || "";
        }

        const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
        await updateDoc(profileRef, {
          groupIds: updatedGroupIds,
          activeGroupId: nextActive,
        });

        triggerToast("Room Exited", `Safely left Room: ${roomId}`, "info");
      }
    );
  };

  const handleJoinRoom = async (code: string) => {
    if (!currentUser || !profile) return;
    const normalized = code.trim().toUpperCase();

    // Check if room meta document exists
    const roomRef = doc(db, "rooms", normalized);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
      // Create room document dynamically
      await setDoc(roomRef, {
        creatorId: currentUser.uid,
        creatorName: profile.username,
        moderators: [],
        createdAt: new Date().toISOString(),
      });
    }

    const updatedGroupIds = [...profile.groupIds];
    if (!updatedGroupIds.includes(normalized)) {
      updatedGroupIds.push(normalized);
    }

    const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
    await updateDoc(profileRef, {
      groupIds: updatedGroupIds,
      activeGroupId: normalized,
    });

    setIsJoinCreateOpen(false);
    triggerToast("Room Connected", `Synchronized room node: ${normalized}`, "success");
  };

  const handleCreateRoom = async (roomName?: string) => {
    if (!currentUser || !profile) return;

    // Enforce subscription limits
    const currentRoomCount = profile.groupIds?.length || 0;
    if (!subscriptionState.isPremium && currentRoomCount >= 1) {
      triggerToast("Limit Reached", "Standard Free members are limited to 1 Workspace Desk. Start your 3-day Free Trial to unlock unlimited desks!", "info");
      return;
    }

    const newCode = generateRandomRoomCode();
    const cleanName = roomName?.trim() || "";

    const roomRef = doc(db, "rooms", newCode);
    await setDoc(roomRef, {
      id: newCode,
      name: cleanName || newCode,
      creatorId: currentUser.uid,
      creatorName: profile.username,
      moderators: [],
      createdAt: new Date().toISOString(),
      isPaid: false,
      monthlyPrice: 14.99,
      subscribers: []
    });

    const updatedGroupIds = [...(profile.groupIds || []), newCode];
    const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
    await updateDoc(profileRef, {
      groupIds: updatedGroupIds,
      activeGroupId: newCode,
    });

    setIsJoinCreateOpen(false);
    triggerToast("Room Established", `Room "${cleanName || newCode}" established with code #${newCode}`, "success");
  };

  const handleRenameRoom = async (roomId: string, newName: string) => {
    if (!currentUser || !profile) return;
    const cleanName = newName.trim();
    if (!cleanName) return;

    try {
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, {
        name: cleanName,
      });

      // Optimistically update local states
      setActiveRoom((prev) => (prev && prev.id === roomId ? { ...prev, name: cleanName } : prev));
      setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name: cleanName } : r)));

      triggerToast("Room Renamed", `Room #${roomId} renamed to "${cleanName}".`, "success");
    } catch (err: any) {
      console.error("Failed to rename room:", err);
      triggerToast("Rename Failed", err.message || "Failed to update room name.", "error");
      throw err;
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!currentUser || !profile) return;

    try {
      if (activeVoiceChannel && activeRoom?.id === roomId) {
        await handleDisconnectVoice();
      }

      // 1. Delete the room document from Firestore
      const roomRef = doc(db, "rooms", roomId);
      await deleteDoc(roomRef);

      // 2. Remove roomId from the current user's profile
      const updatedGroupIds = (profile.groupIds || []).filter((g) => g !== roomId);
      const nextActive = updatedGroupIds.length > 0 ? updatedGroupIds[0] : "";

      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      await updateDoc(profileRef, {
        groupIds: updatedGroupIds,
        activeGroupId: nextActive,
      });

      // 3. Clean up room from any other cached rooms state
      const remainingRooms = rooms.filter((r) => r.id !== roomId);
      setRooms(remainingRooms);
      if (remainingRooms.length > 0) {
        const nextRoom = remainingRooms.find((r) => r.id === nextActive) || remainingRooms[0];
        setActiveRoom(nextRoom);
        localStorage.setItem("syncpl_last_active_room", nextRoom.id);
      } else {
        setActiveRoom(null);
        localStorage.removeItem("syncpl_last_active_room");
      }

      triggerToast("Room Deleted", `Workspace Room #${roomId} has been permanently deleted.`, "info");
    } catch (err: any) {
      console.error("Failed to delete room:", err);
      triggerToast("Delete Failed", err.message || "Failed to delete room.", "error");
      throw err;
    }
  };

  // Channels Operations
  const handleOpenCreateChannelModal = (type: "text" | "voice") => {
    setCreateChannelType(type);
    setCreateChannelName("");
    setIsCreateChannelOpen(true);
  };

  const handleConfirmCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createChannelName.trim()) return;
    let formatted = createChannelName.trim();
    if (createChannelType === "text") {
      formatted = formatted.toLowerCase().replace(/\s+/g, "-");
    }
    await handleAddChannel(formatted, createChannelType);
    setIsCreateChannelOpen(false);
  };

  const handleAddChannel = async (name: string, type: "text" | "voice") => {
    if (!activeRoom) return;
    const channelsCol = collection(db, "channels");
    const sameTypeChannels = channels.filter((c) => c.type === type);
    const maxOrder = sameTypeChannels.reduce((max, c) => Math.max(max, typeof c.order === "number" ? c.order : 0), -1);
    await addDoc(channelsCol, {
      name,
      type,
      groupId: activeRoom.id,
      createdAt: new Date().toISOString(),
      order: maxOrder + 1,
    });
    triggerToast("Channel Created", `Node #${name} is now online.`, "success");
  };

  const handleMoveChannel = async (id: string, direction: "up" | "down") => {
    const targetChannel = channels.find((c) => c.id === id);
    if (!targetChannel) return;

    const sameTypeChannels = channels.filter((c) => c.type === targetChannel.type);
    const currentIndex = sameTypeChannels.findIndex((c) => c.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameTypeChannels.length) return;

    // Create a reordered array for this channel type
    const reordered = [...sameTypeChannels];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistically update local channels state
    const otherTypeChannels = channels.filter((c) => c.type !== targetChannel.type);
    const updatedReordered = reordered.map((chan, idx) => ({ ...chan, order: idx }));
    const updatedChannels = [...otherTypeChannels, ...updatedReordered].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : new Date(a.createdAt).getTime();
      const orderB = typeof b.order === "number" ? b.order : new Date(b.createdAt).getTime();
      return orderA - orderB;
    });
    setChannels(updatedChannels);

    try {
      const batch = writeBatch(db);
      reordered.forEach((chan, idx) => {
        const chanRef = doc(db, "channels", chan.id);
        batch.update(chanRef, { order: idx });
      });
      await batch.commit();
      triggerToast("Channel Order Saved", `Positioned #${targetChannel.name} ${direction === "up" ? "higher" : "lower"}.`, "success");
    } catch (err: any) {
      console.error("Failed to reorder channel:", err);
      triggerToast("Reorder Error", err.message || "Failed to update channel sequence.", "error");
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    triggerConfirm(
      "Delete Channel",
      `Permanently delete channel #${name}?`,
      async () => {
        if (activeVoiceChannel === name) {
          await handleDisconnectVoice();
        }

        const docRef = doc(db, "channels", id);
        await deleteDoc(docRef);
        triggerToast("Channel Deleted", `Node #${name} closed.`, "info");
      }
    );
  };

  const handleRenameChannelTrigger = (id: string, name: string) => {
    setRenameTarget({ id, name });
    setRenameNewName(name);
    setIsRenameOpen(true);
  };

  const handleSaveRename = async () => {
    if (!renameTarget || !renameNewName.trim()) return;
    const formatted = renameNewName.trim().toLowerCase().replace(/\s+/g, "-");

    const docRef = doc(db, "channels", renameTarget.id);
    await updateDoc(docRef, { name: formatted });

    if (activeChannelName === renameTarget.name) {
      setActiveChannelName(formatted);
    }

    setIsRenameOpen(false);
    setRenameTarget(null);
    triggerToast("Channel Renamed", `Updated to #${formatted}`, "success");
  };

  const handleSetChannelPin = async (id: string, pin: string) => {
    try {
      const docRef = doc(db, "channels", id);
      await updateDoc(docRef, { pin: pin || "" });
      triggerToast(
        pin ? "Room Locked" : "Room Unlocked",
        pin ? `PIN code set successfully.` : `PIN requirement removed successfully.`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
      triggerToast("Error", "Failed to update Room PIN: " + err.message, "error");
    }
  };

  const handleSelectChannelWithLockCheck = (name: string, type: "text" | "voice", isMobile: boolean) => {
    const channelObj = channels.find(c => c.name === name && c.type === type);
    if (channelObj && channelObj.pin && !isCreatorOrMod && !unlockedChannelIds[channelObj.id]) {
      setPendingChannelToUnlock(channelObj);
      setEnteredPin("");
      setPinError("");
      return;
    }

    setActiveChannelName(name);
    setActiveTab("chat");
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleToggleVoiceRoomWithLockCheck = (roomName: string) => {
    const channelObj = channels.find(c => c.name === roomName && c.type === "voice");
    if (channelObj && channelObj.pin && !isCreatorOrMod && !unlockedChannelIds[channelObj.id]) {
      setPendingChannelToUnlock(channelObj);
      setEnteredPin("");
      setPinError("");
      return;
    }

    handleToggleVoiceRoom(roomName);
  };

  const handleVerifyChannelPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChannelToUnlock) return;
    
    if (enteredPin.trim() === pendingChannelToUnlock.pin) {
      const updatedUnlocked = { ...unlockedChannelIds, [pendingChannelToUnlock.id]: true };
      setUnlockedChannelIds(updatedUnlocked);
      try {
        localStorage.setItem("unlocked_channels", JSON.stringify(updatedUnlocked));
      } catch (err) {
        console.warn(err);
      }

      if (pendingChannelToUnlock.type === "text") {
        setActiveChannelName(pendingChannelToUnlock.name);
        setIsChatSidePanelOpen(true);
        setActiveTab("chat");
        setIsMobileSidebarOpen(false);
      } else {
        handleToggleVoiceRoom(pendingChannelToUnlock.name);
      }

      setPendingChannelToUnlock(null);
      setEnteredPin("");
      setPinError("");
      triggerToast("Room Unlocked", `Successfully entered #${pendingChannelToUnlock.name}`, "success");
    } else {
      setPinError("Incorrect PIN code. Access Denied.");
    }
  };

  // Stripe & Billing actions
  const handleSubscribe = () => {
    handleOpenProModal("general");
  };

  const handleManageBilling = () => {
    handleOpenProModal("general");
  };

  // State and Handlers for Workspace Paywalls
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");
  const [paywallPaymentTab, setPaywallPaymentTab] = useState<"card" | "p2p">("card");
  const [selectedPaywallChannel, setSelectedPaywallChannel] = useState<"sandbox" | "paypal" | "venmo" | "cashapp" | "stripe" | "custom">("sandbox");
  const [p2pPaymentProof, setP2pPaymentProof] = useState("");

  // Direct Credit Card Form State
  const [directCardNumber, setDirectCardNumber] = useState("");
  const [directCardExp, setDirectCardExp] = useState("");
  const [directCardCvc, setDirectCardCvc] = useState("");
  const [directCardholderName, setDirectCardholderName] = useState("");
  const [directCardZip, setDirectCardZip] = useState("");
  const [directCardError, setDirectCardError] = useState("");

  const getCardBrand = (num: string): string => {
    const cleaned = num.replace(/\s+/g, "");
    if (/^4/.test(cleaned)) return "visa";
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(cleaned)) return "mastercard";
    if (/^3[47]/.test(cleaned)) return "amex";
    if (/^6(?:011|5)/.test(cleaned)) return "discover";
    return "generic";
  };

  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 16);
    const parts = cleaned.match(/.{1,4}/g) || [];
    setDirectCardNumber(parts.join(" "));
    if (directCardError) setDirectCardError("");
  };

  const handleCardExpChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) {
      setDirectCardExp(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setDirectCardExp(cleaned);
    }
    if (directCardError) setDirectCardError("");
  };

  const handleCardCvcChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    setDirectCardCvc(cleaned);
    if (directCardError) setDirectCardError("");
  };

  const handleDirectCardSubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !activeRoom) return;

    setDirectCardError("");
    const cleanNumber = directCardNumber.replace(/\D/g, "");
    const cleanExp = directCardExp.trim();
    const cleanCvc = directCardCvc.trim();

    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      setDirectCardError("Please enter a valid card number (15-16 digits).");
      return;
    }

    const [expMonthStr, expYearStr] = cleanExp.split("/").map((s) => s.trim());
    const expMonth = parseInt(expMonthStr, 10);
    let expYear = parseInt(expYearStr, 10);
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12 || isNaN(expYear)) {
      setDirectCardError("Please enter expiration date as MM/YY (e.g. 12/28).");
      return;
    }
    if (expYear < 100) expYear += 2000;

    if (cleanCvc.length < 3 || cleanCvc.length > 4) {
      setDirectCardError("Please enter a 3 or 4-digit security code (CVC).");
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentStep("Securing PCI-DSS compliant direct Stripe payment tunnel...");

    try {
      await new Promise((r) => setTimeout(r, 400));
      setPaymentStep("Encrypting payment method credentials with Stripe API gateway...");

      const res = await safeFetchJson<any>("/api/payment/subscribe-direct-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom.id,
          subscriberId: currentUser.uid,
          subscriberEmail: currentUser.email || profile?.email || "",
          monthlyPrice: activeRoom.monthlyPrice || 29,
          creatorId: activeRoom.creatorId || "",
          cardNumber: cleanNumber,
          expMonth,
          expYear,
          cvc: cleanCvc,
          cardholderName: directCardholderName.trim() || profile?.username || "SyncPL Member",
          postalCode: directCardZip.trim(),
        }),
      });

      if (!res.ok || !res.data?.success) {
        throw new Error(res.data?.error || "Credit card processing failed. Please check your card info.");
      }

      setPaymentStep("Synchronizing workspace membership credentials...");

      // Update room subscribers in Firestore
      const roomRef = doc(db, "rooms", activeRoom.id);
      const currentSubscribers = activeRoom.subscribers || [];
      if (!currentSubscribers.includes(currentUser.uid)) {
        await updateDoc(roomRef, {
          subscribers: [...currentSubscribers, currentUser.uid],
        });
      }

      // Update Creator's MRR profile in Firestore
      if (activeRoom.creatorId && activeRoom.creatorId !== currentUser.uid) {
        try {
          const creatorProfileRef = doc(db, "users", activeRoom.creatorId, "profile", "info");
          const creatorSnap = await getDoc(creatorProfileRef);
          if (creatorSnap.exists()) {
            const creatorData = creatorSnap.data();
            const currentMRR = creatorData.earningsMRR || 0;
            await updateDoc(creatorProfileRef, {
              earningsMRR: currentMRR + (activeRoom.monthlyPrice || 29),
            });
          }
        } catch (creatorErr) {
          console.warn("Creator MRR update notice:", creatorErr);
        }
      }

      // Post a message in the chat room
      try {
        const messageId = "notif_" + Date.now();
        const msgRef = doc(db, "rooms", activeRoom.id, "messages", messageId);
        await setDoc(msgRef, {
          id: messageId,
          userId: "system",
          username: "DESK LEDGER",
          avatarColor: "emerald",
          avatarType: "emoji",
          avatarVal: "💳",
          groupId: activeRoom.id,
          text: `💳 @${profile?.username || "A new member"} just unlocked monthly desk membership ($${(activeRoom.monthlyPrice || 29).toFixed(2)}/mo) via Direct Stripe Card!`,
          channel: "general",
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Could not log join message", err);
      }

      triggerToast("Membership Unlocked", `Direct card approved! Welcome to ${activeRoom.id}.`, "success");
      setDirectCardNumber("");
      setDirectCardExp("");
      setDirectCardCvc("");
      setDirectCardholderName("");
      setDirectCardZip("");
      setDirectCardError("");
    } catch (err: any) {
      console.error("Direct Card Checkout Error:", err);
      setDirectCardError(err.message || "Payment declined or invalid card details.");
      triggerToast("Card Processing Failed", err.message || "Card transaction could not be completed.", "error");
    } finally {
      setIsSubmittingPayment(false);
      setPaymentStep("");
    }
  };

  const handleUnsubscribeFromRoom = async (roomId: string) => {
    if (!currentUser) return;
    const targetRoom = rooms.find((r) => r.id === roomId) || (activeRoom?.id === roomId ? activeRoom : null);
    const roomName = targetRoom?.name || roomId;

    triggerConfirm(
      `Unsubscribe from ${roomName}?`,
      `Are you sure you want to cancel your monthly membership to ${roomName}? Your recurring Stripe subscription will be canceled and access to this private desk will be removed.`,
      async () => {
        try {
          triggerToast("Canceling Membership", "Contacting Stripe API to stop subscription...", "info");

          // Call backend cancellation endpoint
          const cancelRes = await safeFetchJson<any>("/api/payment/cancel-workspace-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId,
              subscriberId: currentUser.uid,
              subscriberEmail: currentUser.email || profile?.email || "",
            }),
          });

          // Update Firestore directly to ensure subscriber is removed immediately
          try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
              const roomData = roomSnap.data();
              const currentSubs = (roomData.subscribers || []) as string[];
              const updatedSubs = currentSubs.filter((uid) => uid !== currentUser.uid);
              await updateDoc(roomRef, {
                subscribers: updatedSubs,
              });

              // Deduct creator MRR
              if (roomData.creatorId && roomData.creatorId !== currentUser.uid) {
                try {
                  const creatorProfileRef = doc(db, "users", roomData.creatorId, "profile", "info");
                  const creatorSnap = await getDoc(creatorProfileRef);
                  if (creatorSnap.exists()) {
                    const creatorData = creatorSnap.data();
                    const currentMRR = creatorData.earningsMRR || 0;
                    await updateDoc(creatorProfileRef, {
                      earningsMRR: Math.max(0, currentMRR - (roomData.monthlyPrice || 29)),
                    });
                  }
                } catch (creatorErr) {
                  console.warn("Creator MRR deduction notice:", creatorErr);
                }
              }

              // Post cancellation message to ledger
              try {
                const messageId = "notif_" + Date.now();
                const msgRef = doc(db, "rooms", roomId, "messages", messageId);
                await setDoc(msgRef, {
                  id: messageId,
                  userId: "system",
                  username: "DESK LEDGER",
                  avatarColor: "pink",
                  avatarType: "emoji",
                  avatarVal: "👋",
                  groupId: roomId,
                  text: `👋 @${profile?.username || "A member"} has canceled their monthly desk subscription.`,
                  channel: "general",
                  timestamp: new Date().toISOString(),
                });
              } catch (err) {
                console.warn("Could not log unsubscribe message", err);
              }
            }
          } catch (dbErr) {
            console.warn("Firestore unsub sync notice:", dbErr);
          }

          triggerToast(
            "Subscription Canceled",
            cancelRes.ok && cancelRes.data?.message
              ? cancelRes.data.message
              : `Successfully unsubscribed from ${roomName}.`,
            "success"
          );
        } catch (err: any) {
          console.error(err);
          triggerToast("Cancellation Error", err.message || "Failed to cancel subscription.", "error");
        }
      }
    );
  };

  const handleDirectWorkspaceStripeCheckout = async () => {
    if (!currentUser || !activeRoom) return;
    try {
      const { ok, data } = await safeFetchJson<any>("/api/payment/create-workspace-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom.id,
          subscriberId: currentUser.uid,
          subscriberEmail: currentUser.email || profile?.email || "",
          monthlyPrice: activeRoom.monthlyPrice || 29,
          creatorId: activeRoom.creatorId || ""
        })
      });

      if (data?.url) {
        window.open(data.url, "_blank");
        triggerToast("Stripe Checkout", `Opening Stripe Checkout for $${(activeRoom.monthlyPrice || 29).toFixed(2)}/mo in a new window.`, "success");
      } else if (activeRoom.stripePaymentLink) {
        window.open(activeRoom.stripePaymentLink, "_blank");
        triggerToast("Stripe Checkout", "Opening Stripe Payment Link in a new window.", "success");
      } else if (!ok || data?.error) {
        throw new Error(data?.error || "Could not start Stripe checkout.");
      } else {
        throw new Error("Could not initialize Stripe checkout.");
      }
    } catch (err: any) {
      console.error(err);
      if (activeRoom.stripePaymentLink) {
        window.open(activeRoom.stripePaymentLink, "_blank");
        triggerToast("Stripe Checkout", "Opening Stripe Payment Link in a new window.", "success");
      } else {
        triggerToast("Checkout Notice", err.message || "Failed to launch Stripe Checkout.", "error");
      }
    }
  };

  const isRoomLocked = useMemo(() => {
    if (!activeRoom) return false;
    // If the room is not set to paid, it is open to everyone
    if (!activeRoom.isPaid) return false;

    // Super admin app owner has universal access across all desks
    const isAppOwner =
      currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.role === "owner" ||
      profile?.role === "creator";
    if (isAppOwner) return false;

    // Room creator / owner always has full access
    const isOwner = currentUser?.uid && (
      activeRoom.creatorId === currentUser.uid ||
      activeRoom.creatorId === currentUser.email ||
      (activeRoom.creatorName && profile?.username && activeRoom.creatorName.toLowerCase() === profile.username.toLowerCase())
    );
    if (isOwner) return false;

    // Check if current user is an active subscriber of this workspace
    const subscribers = activeRoom.subscribers || [];
    if (currentUser?.uid && subscribers.includes(currentUser.uid)) return false;

    // Otherwise, the paywall modal will pop up to purchase monthly access!
    return true;
  }, [activeRoom, currentUser, profile]);

  const handleUpdateSubscriptionTier = async (tier: "free" | "pro" | "elite") => {
    if (!currentUser) return;
    try {
      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      await updateDoc(profileRef, {
        subscriptionTier: tier
      });
      triggerToast("Subscription Updated", `Successfully switched to ${tier.toUpperCase()} Plan!`, "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Upgrade Failed", err.message, "error");
    }
  };

  const handleUpdateRoomMonetization = async (
    isPaid: boolean,
    price: number,
    paypalLink?: string,
    venmoUsername?: string,
    cashappTag?: string,
    stripePaymentLink?: string,
    customPaymentInstructions?: string
  ) => {
    if (!currentUser || !activeRoom) return;

    const updatedFields = {
      isPaid: Boolean(isPaid),
      monthlyPrice: Number(price) || 0,
      paypalLink: paypalLink || "",
      venmoUsername: venmoUsername || "",
      cashappTag: cashappTag || "",
      stripePaymentLink: stripePaymentLink || "",
      customPaymentInstructions: customPaymentInstructions || ""
    };

    // Immediate optimistic local update
    setActiveRoom((prev) => (prev ? { ...prev, ...updatedFields } : prev));
    setRooms((prevRooms) =>
      prevRooms.map((r) => (r.id === activeRoom.id ? { ...r, ...updatedFields } : r))
    );

    try {
      const roomRef = doc(db, "rooms", activeRoom.id);
      await setDoc(roomRef, updatedFields, { merge: true });
      triggerToast(
        isPaid ? "Workspace Monetized" : "Free Access Enabled",
        isPaid
          ? `Workspace is now a Paid Desk ($${price.toFixed(2)}/mo).`
          : "Workspace is now open as a Free Public Desk.",
        "success"
      );
    } catch (err: any) {
      console.error("Failed to update workspace monetization:", err);
      triggerToast("Update Failed", err.message || "Failed to update room settings in Firestore.", "error");
    }
  };

  const handleUpdateStripeConnect = async (linked: boolean, accountId?: string) => {
    if (!currentUser) return;
    try {
      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      await updateDoc(profileRef, {
        stripeConnectLinked: linked,
        stripeConnectAccountId: accountId || ""
      });
      triggerToast("Stripe Connect Linked", linked ? "Verified payout wallet successfully linked." : "Payout wallet disconnected.", "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Sync Failed", err.message, "error");
    }
  };

  const handleUpdateDiscordWebhook = async (url: string) => {
    if (!currentUser) return;
    try {
      const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
      await updateDoc(profileRef, {
        discordWebhookUrl: url
      });
      triggerToast("Discord Webhook Synchronized", "Your Discord webhook alerts have been saved.", "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Webhook Save Failed", err.message, "error");
    }
  };

  const handleSubscribeToRoom = async () => {
    if (!currentUser || !activeRoom) return;
    setIsSubmittingPayment(true);
    
    if (selectedPaywallChannel !== "sandbox") {
      setPaymentStep(`Authenticating direct ${selectedPaywallChannel.toUpperCase()} payment receipt...`);
      await new Promise(r => setTimeout(r, 1000));
      setPaymentStep(`Submitting proof: "${p2pPaymentProof || "Direct Access"}" to creator...`);
      await new Promise(r => setTimeout(r, 1000));
      setPaymentStep("Granting instant member access to desk...");
      await new Promise(r => setTimeout(r, 800));
    } else {
      setPaymentStep("Securing Stripe checkout tunnel...");
      await new Promise(r => setTimeout(r, 800));
      setPaymentStep("Processing sandboxed test payment token...");
      await new Promise(r => setTimeout(r, 800));
      setPaymentStep("Publishing member credentials to registry...");
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const roomRef = doc(db, "rooms", activeRoom.id);
      const currentSubscribers = activeRoom.subscribers || [];
      const updatedSubscribers = [...currentSubscribers, currentUser.uid];
      
      // Update room subscribers in Firestore
      await updateDoc(roomRef, {
        subscribers: updatedSubscribers
      });

      // Update Creator's MRR profile in Firestore (wrapped safely)
      if (activeRoom.creatorId && activeRoom.creatorId !== currentUser.uid) {
        try {
          const creatorProfileRef = doc(db, "users", activeRoom.creatorId, "profile", "info");
          const creatorSnap = await getDoc(creatorProfileRef);
          if (creatorSnap.exists()) {
            const creatorData = creatorSnap.data();
            const currentMRR = creatorData.earningsMRR || 0;
            await updateDoc(creatorProfileRef, {
              earningsMRR: currentMRR + (activeRoom.monthlyPrice || 14.99)
            });
          }
        } catch (creatorErr) {
          console.warn("Creator MRR update notice:", creatorErr);
        }
      }

      // Add a message in the chat room to notify about the new premium subscriber!
      try {
        const messageId = "notif_" + Date.now();
        const msgRef = doc(db, "rooms", activeRoom.id, "messages", messageId);
        await setDoc(msgRef, {
          id: messageId,
          userId: "system",
          username: "DESK LEDGER",
          avatarColor: "amber",
          avatarType: "emoji",
          avatarVal: "👑",
          groupId: activeRoom.id,
          text: `👑 @${profile?.username || "A new member"} just subscribed via ${selectedPaywallChannel.toUpperCase()} and joined the trading desk!`,
          channel: "general",
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Could not log join message", err);
      }

      triggerToast("Access Granted", `Successfully joined premium desk ${activeRoom.id}!`, "success");
      setP2pPaymentProof("");
      setSelectedPaywallChannel("sandbox");
    } catch (e: any) {
      console.error(e);
      triggerToast("Payment Failed", e.message, "error");
    } finally {
      setIsSubmittingPayment(false);
      setPaymentStep("");
    }
  };

  // Profile configuration updates
  const handleUpdateProfile = async (
    newName: string,
    color: "indigo" | "pink" | "emerald" | "amber" | "sky",
    type: "emoji" | "url",
    val: string
  ) => {
    if (!currentUser) return;
    const profileRef = doc(db, "users", currentUser.uid, "profile", "info");
    await updateDoc(profileRef, {
      username: newName,
      avatarColor: color,
      avatarType: type,
      avatarVal: val,
    });
    triggerToast("Profile Updated", `Your nickname is now ${newName}.`, "success");
  };

  // Log Trade Transaction submission
  const handleLogTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeRoom) return;

    if (subscriptionState.isExpired) {
      triggerToast("Premium Required", "Your free trial period has ended. Please subscribe to continue logging trades.", "error");
      setIsLogModalOpen(false);
      return;
    }

    const parsedAmount = Math.abs(parseFloat(logAmount));
    if (isNaN(parsedAmount)) return;

    const finalAmount = logType === "profit" ? parsedAmount : -parsedAmount;

    const logPayload = {
      userId: currentUser.uid,
      username: profile?.username || "Trader",
      groupId: activeRoom.id,
      amount: finalAmount,
      date: logDate,
      time: logTime,
      strategy: logStrategy,
      asset: logAsset.toUpperCase(),
      notes: logNotes,
      accountType: logAccountType,
      win: logType === "profit",
      timestamp: new Date().toISOString(),
    };

    try {
      // Add P&L transaction
      const logsCol = collection(db, "pnl_logs");
      await addDoc(logsCol, logPayload);

      // Add special Shared Ledger embed inside active chat message node
      const chatCol = collection(db, "chat_messages");
      await addDoc(chatCol, {
        ...logPayload,
        channel: "pnl-flex",
        isEmbed: true,
        text: `${profile?.username || "Trader"} logged a verified trade ledger entry.`,
      });

      // Close Log Modal
      setIsLogModalOpen(false);
      setLogAmount("");
      setLogNotes("");

      triggerToast("Trade Synchronized", "Record added and broadcast to chat ledger!", "success");

      // Trigger Voice Co-Pilot synthesis alert!
      const quoteText = `${profile?.username || "Trader"} logged a verified trade! Resulting in ${formatCurrency(
        finalAmount
      )} profit on ${logAsset.toUpperCase()} using ${logStrategy} strategy.`;
      speakTts(quoteText, currentUser?.uid);
    } catch (err) {
      console.error(err);
      triggerToast("Sync Failed", "Check database synchronization connection.", "error");
    }
  };

  // Bulk Import Trades to Ledger Logs
  const handleImportTrades = async (importedTrades: Array<{
    date: string;
    time?: string;
    asset: string;
    amount: number;
    strategy: string;
    accountType?: AccountType;
    notes?: string;
    win: boolean;
  }>) => {
    if (!currentUser || !activeRoom) return;

    if (subscriptionState.isExpired) {
      triggerToast("Premium Required", "Your free trial period has ended. Please subscribe to continue importing trades.", "error");
      return;
    }

    if (!importedTrades || importedTrades.length === 0) return;

    try {
      const logsCol = collection(db, "pnl_logs");
      let count = 0;

      // Batch or parallelize document creations
      const promises = importedTrades.map((t) => {
        const payload = {
          userId: currentUser.uid,
          username: profile?.username || "Trader",
          groupId: activeRoom.id,
          amount: t.amount,
          date: t.date,
          time: t.time || "12:00",
          strategy: t.strategy || "Imported Trade",
          asset: (t.asset || "NQ").toUpperCase(),
          notes: t.notes || "Imported from file",
          accountType: t.accountType || "funded",
          win: t.amount >= 0,
          timestamp: new Date().toISOString(),
        };
        count++;
        return addDoc(logsCol, payload);
      });

      await Promise.all(promises);

      triggerToast("Import Successful", `Successfully imported ${count} trades to the Ledger!`, "success");
    } catch (err: any) {
      console.error("Bulk trade import error:", err);
      triggerToast("Import Failed", err.message || "Failed to commit imported trades.", "error");
      throw err;
    }
  };

  const handleDeleteTradeLog = async (id: string, asset: string, amount: number) => {
    const docPath = `pnl_logs/${id}`;
    triggerConfirm(
      "Remove Trade Log Entry",
      `Permanently remove trade log entry of ${formatCurrency(amount)} on ${asset}?`,
      async () => {
        try {
          const docRef = doc(db, "pnl_logs", id);
          await deleteDoc(docRef);
          triggerToast("Log Removed", "Transaction safely deleted from database.", "info");
        } catch (err: any) {
          console.error("Error deleting ledger entry:", err);
          triggerToast("Delete Failed", `Could not delete log: ${err.message || err}`, "error");
          handleFirestoreError(err, OperationType.DELETE, docPath);
        }
      }
    );
  };

  // Checklist Rule Actions
  const handleAddRule = async (text: string) => {
    if (!activeRoom) return;

    if (subscriptionState.isExpired) {
      triggerToast("Premium Required", "Your free trial period has ended. Please subscribe to continue editing your checklist.", "error");
      return;
    }

    const trimmed = text.trim();
    const isDuplicate = tradingRules.some(r => r.text.trim().toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      triggerToast("Duplicate Rule Blocked", "This rule protocol already exists in your checklist.", "error");
      return;
    }
    try {
      const rulesCol = collection(db, "trading_rules");
      const nextOrder = tradingRules.length > 0 ? Math.max(...tradingRules.map(r => r.order)) + 1 : 0;
      await addDoc(rulesCol, {
        roomId: activeRoom.id,
        text: trimmed,
        order: nextOrder,
        createdAt: new Date().toISOString()
      });
      triggerToast("Rule Protocol Added", "The new protocol requirement is now active.", "success");
    } catch (err: any) {
      console.error("Failed to add rule:", err);
      triggerToast("Failed to Add Rule", err.message || "Error communicating with database.", "error");
    }
  };

  const handleUpdateRule = async (id: string, text: string) => {
    const trimmed = text.trim();
    const isDuplicate = tradingRules.some(r => r.id !== id && r.text.trim().toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      triggerToast("Duplicate Rule Blocked", "Another rule with this identical text already exists.", "error");
      return;
    }
    try {
      const ruleRef = doc(db, "trading_rules", id);
      await updateDoc(ruleRef, { text: trimmed });
      triggerToast("Rule Protocol Updated", "The protocol text has been saved.", "success");
    } catch (err: any) {
      console.error("Failed to update rule:", err);
      triggerToast("Update Failed", err.message || "Could not save changes.", "error");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const ruleRef = doc(db, "trading_rules", id);
      await deleteDoc(ruleRef);
      triggerToast("Rule Protocol Removed", "Protocol removed from the active checklist.", "info");
    } catch (err: any) {
      console.error("Failed to delete rule:", err);
      triggerToast("Delete Failed", err.message || "Could not remove rule.", "error");
    }
  };

  const handleSeedDefaultRules = async () => {
    if (!activeRoom) return;
    try {
      const rulesCol = collection(db, "trading_rules");
      const presets = [
        "Did I confirm the setup on the higher timeframe (trend alignment)?",
        "Is the risk-to-reward ratio at least 1:2 on this technical setup?",
        "Is my stop loss set at a clear technical support or resistance level?",
        "Am I trading within my defined maximum daily loss and risk limits?",
        "Am I emotionally calm, objective, and fully focused before opening this trade?"
      ];

      let addedCount = 0;
      const currentTexts = new Set(tradingRules.map(r => r.text.trim().toLowerCase()));

      for (let i = 0; i < presets.length; i++) {
        const presetText = presets[i];
        if (!currentTexts.has(presetText.trim().toLowerCase())) {
          const nextOrder = tradingRules.length > 0 ? Math.max(...tradingRules.map(r => r.order)) + 1 + addedCount : addedCount;
          await addDoc(rulesCol, {
            roomId: activeRoom.id,
            text: presetText,
            order: nextOrder,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        triggerToast("Standard Protocols Seeded", `Successfully loaded ${addedCount} professional rules to your checklist.`, "success");
      } else {
        triggerToast("All Presets Present", "All default standard protocols are already on your checklist.", "info");
      }
    } catch (err: any) {
      console.error("Failed to seed default rules:", err);
      triggerToast("Seed Failed", err.message || "Could not load standard checklist.", "error");
    }
  };

  // Live Trades Handlers
  const handleAddLiveTrade = async (payload: {
    asset: string;
    direction: "long" | "short";
    entryPrice: number;
    tp: number;
    sl: number;
    quantity: number;
    notes: string;
  }) => {
    if (!currentUser || !activeRoom) return;

    if (subscriptionState.isExpired) {
      triggerToast("Premium Required", "Your free trial period has ended. Please subscribe to continue deploying positions.", "error");
      return;
    }

    const tradePayload = {
      userId: currentUser.uid,
      username: profile?.username || "Trader",
      groupId: activeRoom.id,
      asset: payload.asset,
      direction: payload.direction,
      entryPrice: payload.entryPrice,
      tp: payload.tp,
      sl: payload.sl,
      quantity: payload.quantity,
      currentPrice: payload.entryPrice,
      status: "open",
      outcome: "",
      notes: payload.notes,
      timestamp: new Date().toISOString(),
      isLive: true,
      amount: 0,
      date: getLocalDateString(),
      time: getLocalTimeString(),
      strategy: `${payload.direction.toUpperCase()} Live`,
      win: false
    };

    try {
      const tradesCol = collection(db, "pnl_logs");
      await addDoc(tradesCol, tradePayload);

      // Broadcast entry to active desk channel chat
      const chatCol = collection(db, "chat_messages");
      await addDoc(chatCol, {
        userId: "system",
        username: "Desk Alert",
        avatarColor: "indigo",
        avatarType: "emoji",
        avatarVal: "🤖",
        groupId: activeRoom.id,
        channel: activeChannelName,
        text: `🚨 LIVE POSITION DEPLOYED: ${profile?.username || "Trader"} opened a ${payload.direction.toUpperCase()} position on ${payload.asset.toUpperCase()} at ${payload.entryPrice.toLocaleString()}. Targets -> TP: ${payload.tp.toLocaleString()} | SL: ${payload.sl.toLocaleString()} (Size: x${payload.quantity})`,
        timestamp: new Date().toISOString(),
      });

      triggerToast("Position Deployed", `Active ${payload.direction} on ${payload.asset} synchronized.`, "success");
      speakTts(`${profile?.username || "Trader"} opened a live ${payload.direction} position on ${payload.asset}. Monitor targets closely.`, currentUser?.uid);
    } catch (err) {
      console.error(err);
      triggerToast("Execution Error", "Failed to deploy live trade.", "error");
    }
  };

  const handleCloseLiveTrade = async (id: string, outcome: "TP" | "SL" | "manual", finalPrice: number, profitAmount: number) => {
    if (!currentUser || !activeRoom) return;

    try {
      const tradeRef = doc(db, "pnl_logs", id);
      const tradeSnap = await getDoc(tradeRef);
      if (!tradeSnap.exists()) return;

      const tradeData = tradeSnap.data() as LiveTrade;

      // Update state in pnl_logs
      await updateDoc(tradeRef, {
        status: "closed",
        outcome: outcome,
        currentPrice: finalPrice,
        exitPrice: finalPrice,
        profitAmount: profitAmount,
        amount: profitAmount,
        win: profitAmount >= 0,
        strategy: `${tradeData.direction.toUpperCase()} Live (${outcome.toUpperCase()})`
      });

      // Synchronize back to the Main Ledger as a verified transaction!
      const logsCol = collection(db, "pnl_logs");
      await addDoc(logsCol, {
        userId: tradeData.userId,
        username: tradeData.username,
        groupId: activeRoom.id,
        amount: profitAmount,
        date: getLocalDateString(),
        time: getLocalTimeString(),
        strategy: `${tradeData.direction.toUpperCase()} Live (${outcome.toUpperCase()})`,
        asset: tradeData.asset,
        notes: `Automatically synchronized from real-time live position. Entry: ${tradeData.entryPrice} -> Exit: ${finalPrice}. ${tradeData.notes}`,
        win: profitAmount >= 0,
        timestamp: new Date().toISOString(),
        isLive: false
      });

      // Post broadcast to Chat
      const chatCol = collection(db, "chat_messages");
      const sign = profitAmount >= 0 ? "+" : "";
      await addDoc(chatCol, {
        userId: "system",
        username: "Desk Alert",
        avatarColor: "pink",
        avatarType: "emoji",
        avatarVal: "📊",
        groupId: activeRoom.id,
        channel: activeChannelName,
        text: `🏁 POSITION CLOSED [${outcome.toUpperCase()}]: ${tradeData.username}'s ${tradeData.direction.toUpperCase()} on ${tradeData.asset.toUpperCase()} closed at ${finalPrice.toLocaleString()} (Entry: ${tradeData.entryPrice.toLocaleString()}). Realized Profit: ${sign}${formatCurrency(profitAmount)}!`,
        timestamp: new Date().toISOString(),
      });

      triggerToast("Trade Settled", `Position successfully settled at ${finalPrice}.`, "success");
      speakTts(`${tradeData.username}'s position on ${tradeData.asset} settled via ${outcome === "manual" ? "market close" : outcome + " target"}. Net result: ${formatCurrency(profitAmount)}.`, tradeData.userId);
    } catch (err) {
      console.error(err);
      triggerToast("Settlement Failed", "Error closing active trade.", "error");
    }
  };

  // Payout Operations
  const handleAddPayout = async (payoutData: Omit<PayoutRecord, "id" | "timestamp">) => {
    const newRecord = {
      ...payoutData,
      timestamp: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "payouts"), newRecord);
      setPayouts((prev) => {
        if (prev.some((p) => p.id === docRef.id)) return prev;
        return [{ id: docRef.id, ...newRecord }, ...prev];
      });
      triggerToast("Payout Logged!", `Recorded $${newRecord.amount.toLocaleString()} payout for ${newRecord.username}`, "success");

      // Broadcast announcement to chat desk
      if (activeRoom) {
        await addDoc(collection(db, "chat_messages"), {
          userId: currentUser?.uid || "system",
          username: profile?.username || "Trader",
          avatarColor: profile?.avatarColor || "indigo",
          avatarType: profile?.avatarType || "emoji",
          avatarVal: profile?.avatarVal || "🐂",
          groupId: activeRoom.id,
          channel: activeChannelName,
          text: `💰 **NEW PAYOUT VERIFIED**: **${newRecord.username}** received a **$${newRecord.amount.toLocaleString()}** payout from **${newRecord.propFirm || "Prop Firm"}**! 🎉`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Error adding payout:", err);
      const mockId = "payout_" + Date.now();
      setPayouts((prev) => [{ id: mockId, ...newRecord }, ...prev]);
      triggerToast("Payout Logged (Local)", `Recorded $${newRecord.amount.toLocaleString()} payout for ${newRecord.username}`, "success");
    }
  };

  const handleDeletePayout = async (payoutId: string, username?: string, amount?: number) => {
    const formattedAmt = amount ? formatCurrency(amount) : "";
    triggerConfirm(
      "Delete Payout Entry",
      `Are you sure you want to delete this payout entry ${formattedAmt ? "of " + formattedAmt : ""}${username ? " for " + username : ""}?`,
      async () => {
        try {
          if (payoutId.startsWith("payout_")) {
            setPayouts((prev) => prev.filter((p) => p.id !== payoutId));
          } else {
            await deleteDoc(doc(db, "payouts", payoutId));
            setPayouts((prev) => prev.filter((p) => p.id !== payoutId));
          }
          triggerToast("Payout Deleted", "Payout record removed successfully.", "info");
        } catch (err: any) {
          console.error("Error deleting payout:", err);
          triggerToast("Delete Failed", `Could not delete payout: ${err.message || err}`, "error");
          setPayouts((prev) => prev.filter((p) => p.id !== payoutId));
        }
      }
    );
  };

  const handleUpdateTradePrice = async (id: string, currentPrice: number) => {
    try {
      const tradeRef = doc(db, "pnl_logs", id);
      await updateDoc(tradeRef, { currentPrice });
    } catch (err) {
      console.error("Error updating price:", err);
    }
  };

  const handleDeleteLiveTrade = async (id: string) => {
    const docPath = `pnl_logs/${id}`;
    triggerConfirm(
      "Delete Live Trade Card",
      "Permanently delete this live trade tracking card?",
      async () => {
        try {
          const docRef = doc(db, "pnl_logs", id);
          await deleteDoc(docRef);
          triggerToast("Position Removed", "Live trade node deleted.", "info");
        } catch (err: any) {
          console.error("Error deleting live trade:", err);
          triggerToast("Delete Failed", `Could not delete live trade: ${err.message || err}`, "error");
          handleFirestoreError(err, OperationType.DELETE, docPath);
        }
      }
    );
  };

  // Automatically sync live trade prices with ticker updates and trigger TP/SL targets
  useEffect(() => {
    if (!currentUser) return;
    const activeOpen = liveTrades.filter((t) => t.status === "open" && t.userId === currentUser.uid);
    if (activeOpen.length === 0) return;

    const normalizeSymbol = (sym: string) => sym.toUpperCase().replace(/[^A-Z0-9]/g, "");

    activeOpen.forEach(async (t) => {
      const normAsset = normalizeSymbol(t.asset);
      const matchingTicker = tickers.find((tick) => normalizeSymbol(tick.symbol) === normAsset);
      if (!matchingTicker) return;

      const newPrice = matchingTicker.price;
      if (newPrice === t.currentPrice) return;

      let outcome: "TP" | "SL" | null = null;
      const qty = (t as any).quantity || 1;
      let finalProfit = 0;

      if (t.direction === "long") {
        if (newPrice >= t.tp) {
          outcome = "TP";
        } else if (newPrice <= t.sl) {
          outcome = "SL";
        }
      } else {
        if (newPrice <= t.tp) {
          outcome = "TP";
        } else if (newPrice >= t.sl) {
          outcome = "SL";
        }
      }

      if (outcome) {
        const exitPrice = outcome === "TP" ? t.tp : t.sl;
        const diff = t.direction === "long" ? exitPrice - t.entryPrice : t.entryPrice - exitPrice;
        finalProfit = diff * qty;
        await handleCloseLiveTrade(t.id, outcome, exitPrice, finalProfit);
      } else {
        await handleUpdateTradePrice(t.id, newPrice);
      }
    });
  }, [tickers, liveTrades, currentUser]);

  // Automated trigger to fluctuate prices slightly (+/- 0.2% random walk)
  const handleTriggerPriceFluctuation = async () => {
    const activeOpen = liveTrades.filter((t) => t.status === "open");
    if (activeOpen.length === 0) return;

    triggerToast("Updating Tickers", "Simulating high-frequency market feedback...", "info");

    for (const t of activeOpen) {
      const changePercent = (Math.random() * 0.8 - 0.4) / 100;
      const newPrice = Math.max(0.0001, t.currentPrice * (1 + changePercent));

      let outcome: "TP" | "SL" | null = null;
      const qty = (t as any).quantity || 1;
      let finalProfit = 0;

      if (t.direction === "long") {
        if (newPrice >= t.tp) {
          outcome = "TP";
        } else if (newPrice <= t.sl) {
          outcome = "SL";
        }
      } else {
        if (newPrice <= t.tp) {
          outcome = "TP";
        } else if (newPrice >= t.sl) {
          outcome = "SL";
        }
      }

      if (outcome) {
        const exitPrice = outcome === "TP" ? t.tp : t.sl;
        const diff = t.direction === "long" ? exitPrice - t.entryPrice : t.entryPrice - exitPrice;
        finalProfit = diff * qty;

        await handleCloseLiveTrade(t.id, outcome, exitPrice, finalProfit);
      } else {
        await handleUpdateTradePrice(t.id, parseFloat(newPrice.toFixed(2)));
      }
    }
  };

  // Track confirmed presence in voice channel to prevent race condition false-disconnects
  const confirmedVoicePresenceRef = useRef<boolean>(false);
  const voiceJoinTimeRef = useRef<number>(0);

  // Voice Rooms Operations & Simulation
  const handleToggleVoiceRoom = async (roomName: string) => {
    if (activeVoiceChannel === roomName) {
      await handleDisconnectVoice();
      return;
    }

    if (activeVoiceChannel) {
      await handleDisconnectVoice();
    }

    voiceJoinTimeRef.current = Date.now();
    confirmedVoicePresenceRef.current = false;
    setActiveVoiceChannel(roomName);
    triggerToast("Voice Connected", `Connected voice Desk: ${roomName}`, "success");

    const isAi = roomName.includes("🤖") || roomName.toLowerCase().includes("ai");
    if (isAi) {
      speakTts("Welcome. I am your co-pilot risk analyst. I am listening to live channel transactions.");
    } else if (currentUser) {
      const voiceDocRef = doc(db, "voice_users", currentUser.uid);
      await setDoc(voiceDocRef, {
        id: currentUser.uid,
        userId: currentUser.uid,
        username: profile?.username || "Trader",
        groupId: activeRoom?.id,
        channel: roomName,
        muted: isMuted,
        deafened: isDeafened,
        speaking: false,
        joinedAt: new Date().toISOString(),
        avatarType: profile?.avatarType || "emoji",
        avatarVal: profile?.avatarVal || "👤",
        avatarColor: profile?.avatarColor || "indigo",
      });
    }
  };

  const handleDisconnectVoice = async () => {
    confirmedVoicePresenceRef.current = false;
    if (!currentUser) return;
    try {
      const voiceDocRef = doc(db, "voice_users", currentUser.uid);
      await deleteDoc(voiceDocRef);
    } catch (e) {
      console.warn(e);
    }
    setActiveVoiceChannel(null);
    triggerToast("Voice Disconnected", "Voice channel lines safely closed.", "info");
  };

  const handleKickVoiceUser = async (targetUserId: string, targetUsername: string) => {
    if (!activeRoom || !currentUser) return;
    if (!isCreatorOrMod) {
      triggerToast("Permission Denied", "Only room owners and moderators can remove users from voice channels.", "error");
      return;
    }

    try {
      const voiceDocRef = doc(db, "voice_users", targetUserId);
      await deleteDoc(voiceDocRef);

      // Broadcast system message in chat
      try {
        const messageId = "notif_kick_" + Date.now();
        const msgRef = doc(db, "rooms", activeRoom.id, "messages", messageId);
        await setDoc(msgRef, {
          id: messageId,
          userId: "system",
          username: "DESK MODERATION",
          avatarColor: "amber",
          avatarType: "emoji",
          avatarVal: "🛡️",
          groupId: activeRoom.id,
          text: `🛡️ @${targetUsername} was disconnected from the voice channel by an admin.`,
          channel: "general",
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Could not log kick notice to chat messages", e);
      }

      triggerToast("User Disconnected", `${targetUsername} was removed from the voice channel.`, "info");
    } catch (err: any) {
      console.error("Error disconnecting user from voice:", err);
      triggerToast("Action Failed", `Could not remove user: ${err.message || err}`, "error");
    }
  };

  // Monitor if local user was disconnected/kicked from voice_users by an admin
  useEffect(() => {
    if (!currentUser || !activeVoiceChannel) {
      confirmedVoicePresenceRef.current = false;
      return;
    }

    // Skip synthetic AI channels
    const isAi = activeVoiceChannel.includes("🤖") || activeVoiceChannel.toLowerCase().includes("ai");
    if (isAi) return;

    const myVoiceDoc = voiceUsers.find((v) => (v.id === currentUser.uid || v.userId === currentUser.uid) && v.channel === activeVoiceChannel);
    if (myVoiceDoc) {
      confirmedVoicePresenceRef.current = true;
    } else if (confirmedVoicePresenceRef.current && (Date.now() - voiceJoinTimeRef.current > 3000)) {
      // User was active and confirmed, but their document was subsequently deleted by an admin
      confirmedVoicePresenceRef.current = false;
      setActiveVoiceChannel(null);
      if (webrtcVoiceRef.current) {
        webrtcVoiceRef.current.destroy();
        webrtcVoiceRef.current = null;
      }
      triggerToast("Voice Disconnected", "An admin or moderator removed you from the voice channel.", "info");
    }
  }, [voiceUsers, currentUser?.uid, activeVoiceChannel]);

  const handleToggleMic = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (currentUser && activeVoiceChannel) {
      const voiceDocRef = doc(db, "voice_users", currentUser.uid);
      await updateDoc(voiceDocRef, { muted: nextMute });
    }
  };

  const handleToggleDeafen = async () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    if (currentUser && activeVoiceChannel) {
      const voiceDocRef = doc(db, "voice_users", currentUser.uid);
      await updateDoc(voiceDocRef, { deafened: nextDeafen });
    }
  };

  const handleToggleMuteAll = async () => {
    const nextMuteAll = !isMutedAll;
    setIsMutedAll(nextMuteAll);
    if (nextMuteAll) {
      triggerToast("Room Audio Muted", "All incoming voice room sound and AI notifications silenced.", "info");
    } else {
      triggerToast("Room Audio Unmuted", "Incoming voice room sounds and alerts restored.", "success");
    }
  };

  const handleToggleScreenShare = async () => {
    if (!activeVoiceChannel) {
      // Prioritize dedicated screenshare room so it doesn't interrupt Voice Desk 1
      const screenshareVoice = channels.find(
        (c) =>
          c.type === "voice" &&
          (c.name.toLowerCase().includes("screen") ||
            c.name.toLowerCase().includes("stream") ||
            c.name.toLowerCase().includes("live"))
      );
      const targetVoice = screenshareVoice?.name || channels.find((c) => c.type === "voice")?.name || "🎥 Live Screenshare";

      await handleToggleVoiceRoom(targetVoice);
      triggerToast("Connecting Stream Channel", `Joined #${targetVoice} for screenshare...`, "info");
      setTimeout(async () => {
        if (webrtcVoiceRef.current) {
          try {
            const stream = await webrtcVoiceRef.current.startScreenShare();
            if (stream) {
              setIsScreenSharing(true);
              setLocalScreenStream(stream);
              setActiveScreenStreamUid(currentUser?.uid || null);
              setIsScreenModalOpen(true);
              triggerToast("Screen Share Active", "Broadcasting your live trading screen (P2P zero cloud cost).", "success");
            }
          } catch (err: any) {
            console.warn("Screen share start error:", err);
          }
        }
      }, 500);
      return;
    }

    if (isScreenSharing) {
      if (webrtcVoiceRef.current) {
        webrtcVoiceRef.current.stopScreenShare();
      }
      setIsScreenSharing(false);
      setLocalScreenStream(null);
      if (activeScreenStreamUid === currentUser?.uid) {
        setIsScreenModalOpen(false);
        setActiveScreenStreamUid(null);
      }
      triggerToast("Screen Share Ended", "Live trading stream ended.", "info");
    } else {
      if (webrtcVoiceRef.current) {
        try {
          const stream = await webrtcVoiceRef.current.startScreenShare();
          if (stream) {
            setIsScreenSharing(true);
            setLocalScreenStream(stream);
            setActiveScreenStreamUid(currentUser?.uid || null);
            setIsScreenModalOpen(true);
            triggerToast("Screen Share Active", "Broadcasting your live trading screen (P2P zero cloud cost).", "success");
          }
        } catch (err: any) {
          console.warn("Screen share start error:", err);
          triggerToast("Screen Share Notice", "Screen capture was cancelled or not granted.", "info");
        }
      } else {
        triggerToast("Voice Connection Initializing", "Please wait a moment for the voice mesh to connect.", "info");
      }
    }
  };

  const handleOpenScreenShareModal = (targetUid?: string) => {
    const uidToOpen = targetUid || (isScreenSharing ? currentUser?.uid : (remoteScreenStreams.keys().next().value || null));
    if (uidToOpen) {
      setActiveScreenStreamUid(uidToOpen);
      setIsScreenModalOpen(true);
    } else {
      triggerToast("No Active Stream", "No one is currently screen sharing in this channel.", "info");
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      triggerToast("Not Supported", "Browser push notifications are not supported in this browser.", "info");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        triggerToast("Notifications Enabled", "Desk ledger and settlement desktop alerts active!", "success");
        new Notification("ProDesk Ledger Alerts Active", {
          body: "You will now receive push notifications for trade broadcasts and AI settlements.",
          icon: "/app_icon.png"
        });
      } else if (permission === "denied") {
        triggerToast("Notifications Blocked", "Please enable notifications in your browser configuration.", "error");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };

  // HTML5 Web Speech Synthesis API (Perfect offline execution!)
  const speakTts = (text: string, speakerUserId?: string) => {
    if (isMutedAll || isDeafened) {
      console.log("Speech synthesis silenced because room audio is muted/deafened.");
      return;
    }
    if (speakerUserId && mutedUsers[speakerUserId]) {
      console.log(`Speech synthesis for user ${speakerUserId} ignored because they are locally muted.`);
      return;
    }
    if ("speechSynthesis" in window) {
      // Cancel prior synth
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      let userVol = 100;
      if (speakerUserId && userVolumes[speakerUserId] !== undefined) {
        userVol = userVolumes[speakerUserId];
      }
      utterance.volume = (globalVolume / 100) * (userVol / 100);

      // Select firm risk analyst voice accent
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Samantha") ||
          v.name.includes("Zira")
      );
      if (targetVoice) utterance.voice = targetVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleConsultAiAdvisor = () => {
    if (!activeVoiceChannel) {
      alert("Join a voice channel first to test AI risk assessments!");
      return;
    }
    const quotes = [
      "Attention. Volatility index metrics are spiking. Adjust stop-loss models on BTC.",
      "Net cumulative performance curve indicates steady growth ratios. Hold positive stances.",
      "Hedge fund risk calculations completed. Limit max leverage to three percent of total desk capital.",
      "Technical breakout indicators triggered. Set robust trailing indicators.",
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    speakTts(picked);
    triggerToast("Voice Co-Pilot Speaking", picked, "success");
  };

  // Chat dispatching
  const handleSendChatMessage = async (text: string, imageUrl?: string) => {
    if (!currentUser || !activeRoom) return;
    const chatCol = collection(db, "chat_messages");
    const msgPayload: any = {
      userId: currentUser.uid,
      username: profile?.username || "Trader",
      avatarColor: profile?.avatarColor || "indigo",
      avatarType: profile?.avatarType || "emoji",
      avatarVal: profile?.avatarVal || "🐂",
      groupId: activeRoom.id,
      text: text || "",
      channel: activeChannelName,
      timestamp: new Date().toISOString(),
    };
    if (imageUrl) {
      msgPayload.imageUrl = imageUrl;
    }
    await addDoc(chatCol, msgPayload);
  };

  const handleDeleteChatMessage = async (id: string) => {
    try {
      const docRef = doc(db, "chat_messages", id);
      await deleteDoc(docRef);
      triggerToast("Message Deleted", "Selected chat packet removed from node history.", "info");
    } catch (err: any) {
      console.error(err);
      triggerToast("Delete Failed", `Could not delete message: ${err.message || err}`, "error");
    }
  };

  // Mods roles promotions/demotions inside workspace settings
  const handleToggleModRole = async (targetUid: string, username: string) => {
    if (!activeRoom || !currentUser || activeRoom.creatorId !== currentUser.uid) {
      alert("Only the room owner can promote moderators.");
      return;
    }

    const currentMods = activeRoom.moderators || [];
    let updatedMods: string[];

    if (currentMods.includes(username)) {
      updatedMods = currentMods.filter((n) => n !== username);
      triggerToast("Moderator Demoted", `${username} is no longer a Moderator.`, "info");
    } else {
      updatedMods = [...currentMods, username];
      triggerToast("Moderator Promoted", `${username} is now a Moderator!`, "success");
    }

    const roomRef = doc(db, "rooms", activeRoom.id);
    await updateDoc(roomRef, { moderators: updatedMods });
    setActiveRoom((prev) => (prev ? { ...prev, moderators: updatedMods } : null));
  };

  // Helper check Mod/Owner status
  const isCreatorOrMod = useMemo(() => {
    if (!currentUser) return false;
    const isAppCreator =
      currentUser.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
      profile?.role === "owner" ||
      profile?.role === "creator";
    if (isAppCreator) return true;
    if (!activeRoom) return false;
    const isOwner = activeRoom.creatorId === currentUser.uid;
    const isRoomMod = activeRoom.moderators?.includes(profile?.username || "");
    return isOwner || isRoomMod;
  }, [currentUser?.uid, currentUser?.email, profile?.email, profile?.role, activeRoom, profile?.username]);

  // Loading Screen while session credentials & rooms synchronize
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-[#0F1113] z-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-1 z-0 pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full ambient-glow-2 z-0 pointer-events-none" />
        <div className="glass-panel p-8 rounded-2xl max-w-xs w-full relative z-10 flex flex-col items-center space-y-4 text-center shadow-2xl border border-[#2A2D31] bg-[#1E2023]/95 backdrop-blur-md">
          <div className="p-4 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
            <TrendingUp className="w-8 h-8 animate-pulse text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white tracking-wider uppercase">SyncPL Terminal</h3>
            <p className="text-xs text-gray-400 font-mono">Restoring trading workspace...</p>
          </div>
          <div className="w-full h-1 bg-[#121417] rounded-full overflow-hidden border border-[#2A2D31]/40">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-dark-bg text-gray-200 flex flex-col font-sans overflow-hidden">
      {/* Firestore Daily Free Quota Exceeded warning banner */}
      {isQuotaExceeded && (
        <div className="bg-gradient-to-r from-amber-950/90 via-[#1E2023] to-[#121417] border-b border-amber-500/40 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0 z-50 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-amber-300 mr-1.5">Firestore Free Daily Quota Reached:</span>
              <span className="text-gray-300">
                The free Spark plan daily read limit has been reached (resets at midnight PT). Local cached data is active, or switch to Blaze for uninterrupted sync.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://console.firebase.google.com/project/syncpl-fe47a/firestore/databases/ai-studio-syncpltradingdas-0abcfe65-6185-44e8-a1d7-a23a3b273fce/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>Upgrade to Blaze</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setIsQuotaExceeded(false)}
              className="text-gray-400 hover:text-white p-1 transition font-bold"
              title="Dismiss Notice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Firebase Permission Error warning */}
      {firebaseError && (
        <div className="bg-[#F04747]/10 border-b border-[#F04747]/30 text-[#F04747] text-xs py-2.5 px-4 flex items-center justify-between gap-3 animate-in fade-in duration-200 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse text-[#F04747]" />
            <span>
              <strong>Firestore Permission Denied:</strong> Your database security rules are blocking reads/writes. Please copy the rules in <code>firestore.rules</code> and deploy them to your Firebase Console.
            </span>
          </div>
          <button
            onClick={() => setFirebaseError(null)}
            className="text-gray-400 hover:text-white transition font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast Alert overlay */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 transform transition duration-300 flex items-center bg-[#090d16] border border-indigo-500/20 text-white px-4 py-3.5 rounded-xl shadow-2xl max-w-sm">
          <div
            className={`p-1.5 rounded-lg mr-3 ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : toast.type === "error"
                ? "bg-rose-500/10 text-rose-400"
                : "bg-indigo-600/20 text-indigo-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 animate-bounce" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-extrabold">{toast.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{toast.body}</p>
          </div>
        </div>
      )}

      {/* Onboarding / Login View if not logged in */}
      {!currentUser && (
        <OnboardingView
          onGuestAuth={handleGuestAuth}
          onEmailLogin={handleEmailLogin}
          onEmailRegister={handleEmailRegister}
          onPasswordReset={handlePasswordReset}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          isAuthenticated={!!currentUser}
        />
      )}

      {/* Welcome Screen if authenticated but hasn't joined any room yet */}
      {currentUser && rooms.length === 0 && (
        <OnboardingView
          onGuestAuth={handleGuestAuth}
          onEmailLogin={handleEmailLogin}
          onEmailRegister={handleEmailRegister}
          onPasswordReset={handlePasswordReset}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          isAuthenticated={!!currentUser}
        />
      )}

      {currentUser && rooms.length > 0 && activeRoom && (
        <>
          <div className="flex-grow flex-1 h-full max-h-full min-h-0 flex overflow-hidden w-full">
            {/* Mobile Drawer Overlay */}
            {isMobileSidebarOpen && (
              <div className="fixed inset-0 z-50 flex md:hidden">
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
                
                {/* Drawer Content container */}
                <div className="relative flex h-full w-[312px] max-w-[85vw] bg-[#08090A] animate-in slide-in-from-left duration-200 z-10 shadow-2xl shrink-0">
                  <SidebarRail
                    rooms={rooms}
                    activeRoomId={activeRoom.id}
                    activeTab={activeTab}
                    unreadPmCount={unreadPmCount}
                    onSwitchTab={(tab) => {
                      setActiveTab(tab);
                      setIsMobileSidebarOpen(false);
                    }}
                    onSelectRoom={(roomId) => {
                      handleSelectRoom(roomId);
                      setIsMobileSidebarOpen(false);
                    }}
                    onLeaveRoom={handleLeaveRoom}
                    onOpenJoinCreateModal={() => {
                      setIsJoinCreateOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    userProfileName={profile?.username || "Trader"}
                    onLogout={handleLogout}
                  />

                  <ActiveRoomSidebar
                    activeRoom={activeRoom}
                    channels={channels}
                    activeChannelName={activeChannelName}
                    onSelectChannel={(name, type) => {
                      handleSelectChannelWithLockCheck(name, type, true);
                    }}
                    activeVoiceChannel={activeVoiceChannel}
                    onToggleVoiceRoom={handleToggleVoiceRoomWithLockCheck}
                    voiceUsers={voiceUsers}
                    profile={profile ? {
                      ...profile,
                      marketPresence: publicUsers.find(u => u.uid === currentUser?.uid)?.marketPresence || "active",
                      customStatus: publicUsers.find(u => u.uid === currentUser?.uid)?.customStatus || "",
                    } : null}
                    activeTab={activeTab}
                    unreadPmCount={unreadPmCount}
                    onSwitchTab={(tab) => {
                      setActiveTab(tab);
                      setIsMobileSidebarOpen(false);
                    }}
                    onOpenLogModal={() => {
                      setIsLogModalOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    onOpenTiltGuardModal={() => {
                      setIsTiltGuardModalOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    onOpenFlexModal={() => {
                      setFlexModalLog(null);
                      setIsFlexModalOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    onOpenGuide={() => {
                      setIsGuideModalOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    onDisconnectVoice={handleDisconnectVoice}
                    isMuted={isMuted}
                    isDeafened={isDeafened}
                    isMutedAll={isMutedAll}
                    onToggleMic={handleToggleMic}
                    onToggleDeafen={handleToggleDeafen}
                    onToggleMuteAll={handleToggleMuteAll}
                    onConsultAiAdvisor={handleConsultAiAdvisor}
                    isCreatorOrMod={isCreatorOrMod}
                    onKickVoiceUser={handleKickVoiceUser}
                    onAddChannelClick={(type) => {
                      handleOpenCreateChannelModal(type);
                      setIsMobileSidebarOpen(false);
                    }}
                    onMoveChannel={handleMoveChannel}
                    onCopyRoomCode={() => {
                      navigator.clipboard.writeText(activeRoom.id);
                      triggerToast("Room Code Copied", "Share invite code with your partners.", "info");
                    }}
                    onUnsubscribeFromRoom={handleUnsubscribeFromRoom}
                    currentUser={currentUser}
                    globalVolume={globalVolume}
                    onChangeGlobalVolume={handleChangeGlobalVolume}
                    inputVolume={inputVolume}
                    onChangeInputVolume={handleChangeInputVolume}
                    mutedUsers={mutedUsers}
                    onToggleMuteUser={handleToggleMuteUser}
                    userVolumes={userVolumes}
                    onChangeUserVolume={handleChangeUserVolume}
                    isScreenSharing={isScreenSharing}
                    onToggleScreenShare={handleToggleScreenShare}
                    onOpenScreenShareModal={handleOpenScreenShareModal}
                    remoteScreenStreams={remoteScreenStreams}
                  />
                </div>
              </div>
            )}

            {/* Desktop Sidebars: hidden on mobile */}
            <div className="hidden md:flex h-full shrink-0">
              {/* 1. Far Left Narrow Sidebar (Discord-style room swapper rail) */}
              <SidebarRail
                rooms={rooms}
                activeRoomId={activeRoom.id}
                activeTab={activeTab}
                unreadPmCount={unreadPmCount}
                onSwitchTab={setActiveTab}
                onSelectRoom={handleSelectRoom}
                onLeaveRoom={handleLeaveRoom}
                onOpenJoinCreateModal={() => setIsJoinCreateOpen(true)}
                userProfileName={profile?.username || "Trader"}
                onLogout={handleLogout}
              />

              {/* 2. Room-specific middle navigation bar (collapsible on PC) */}
              {!isSidebarCollapsed && (
                <ActiveRoomSidebar
                  activeRoom={activeRoom}
                  channels={channels}
                  activeChannelName={activeChannelName}
                  onSelectChannel={(name, type) => {
                    handleSelectChannelWithLockCheck(name, type, false);
                  }}
                  activeVoiceChannel={activeVoiceChannel}
                  onToggleVoiceRoom={handleToggleVoiceRoomWithLockCheck}
                  voiceUsers={voiceUsers}
                  profile={profile ? {
                    ...profile,
                    marketPresence: publicUsers.find(u => u.uid === currentUser?.uid)?.marketPresence || "active",
                    customStatus: publicUsers.find(u => u.uid === currentUser?.uid)?.customStatus || "",
                  } : null}
                  activeTab={activeTab}
                  unreadPmCount={unreadPmCount}
                  onSwitchTab={setActiveTab}
                  onOpenLogModal={() => setIsLogModalOpen(true)}
                  onOpenTiltGuardModal={() => setIsTiltGuardModalOpen(true)}
                  onOpenFlexModal={() => {
                    setFlexModalLog(null);
                    setIsFlexModalOpen(true);
                  }}
                  onOpenGuide={() => setIsGuideModalOpen(true)}
                  onDisconnectVoice={handleDisconnectVoice}
                  isMuted={isMuted}
                  isDeafened={isDeafened}
                  isMutedAll={isMutedAll}
                  onToggleMic={handleToggleMic}
                  onToggleDeafen={handleToggleDeafen}
                  onToggleMuteAll={handleToggleMuteAll}
                  onConsultAiAdvisor={handleConsultAiAdvisor}
                  isCreatorOrMod={isCreatorOrMod}
                  onKickVoiceUser={handleKickVoiceUser}
                  onAddChannelClick={handleOpenCreateChannelModal}
                  onMoveChannel={handleMoveChannel}
                  onCopyRoomCode={() => {
                    navigator.clipboard.writeText(activeRoom.id);
                    triggerToast("Room Code Copied", "Share invite code with your partners.", "info");
                  }}
                  onUnsubscribeFromRoom={handleUnsubscribeFromRoom}
                  currentUser={currentUser}
                  isChatSidePanelOpen={isChatSidePanelOpen}
                  globalVolume={globalVolume}
                  onChangeGlobalVolume={handleChangeGlobalVolume}
                  inputVolume={inputVolume}
                  onChangeInputVolume={handleChangeInputVolume}
                  mutedUsers={mutedUsers}
                  onToggleMuteUser={handleToggleMuteUser}
                  userVolumes={userVolumes}
                  onChangeUserVolume={handleChangeUserVolume}
                  isScreenSharing={isScreenSharing}
                  onToggleScreenShare={handleToggleScreenShare}
                  onOpenScreenShareModal={handleOpenScreenShareModal}
                  remoteScreenStreams={remoteScreenStreams}
                />
              )}
            </div>

             {/* 3. Main Central App Dashboard Container */}
             <main className="flex-grow flex-1 min-w-0 flex flex-col overflow-hidden bg-dark-bg relative">
               {/* Glowing decorative ambient orbs */}
               {(() => {
                 const isPremiumSkin = subscriptionState.isPremium;
                 const currentSkin = isPremiumSkin ? activeSkin : "default";
                 if (currentSkin === "amber") {
                   return (
                     <>
                       <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.12)_0%,rgba(245,158,11,0)_70%)] pointer-events-none z-0" />
                       <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(217,119,6,0.08)_0%,rgba(217,119,6,0)_70%)] pointer-events-none z-0" />
                     </>
                   );
                 }
                 if (currentSkin === "emerald") {
                   return (
                     <>
                       <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12)_0%,rgba(16,185,129,0)_70%)] pointer-events-none z-0" />
                       <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(4,120,87,0.08)_0%,rgba(4,120,87,0)_70%)] pointer-events-none z-0" />
                     </>
                   );
                 }
                 return (
                   <>
                     <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-1 z-0" />
                     <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full ambient-glow-2 z-0" />
                   </>
                 );
               })()}

              {/* Global Header Bar */}
              <header className="h-14 border-b border-dark-border/30 bg-dark-card/30 backdrop-blur-md px-3 md:px-6 flex items-center justify-between shrink-0 z-10 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {/* Mobile Hamburger toggle */}
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden p-1.5 hover:bg-[#1E2023] text-gray-400 hover:text-white rounded border border-[#2A2D31]/50 transition cursor-pointer flex items-center gap-1 shrink-0"
                    title={activeTab !== "dashboard" ? "Back to Channels & Rooms" : "Open Navigation Drawer"}
                  >
                    {activeTab !== "dashboard" ? (
                      <>
                        <ArrowLeft className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider pr-0.5 hidden sm:inline">Channels</span>
                      </>
                    ) : (
                      <Menu className="w-4.5 h-4.5" />
                    )}
                  </button>

                  {/* PC Sidebar minimize/maximize toggle */}
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex items-center gap-1.5 p-1.5 hover:bg-[#1E2023] text-gray-400 hover:text-white rounded border border-[#2A2D31]/50 transition cursor-pointer shrink-0"
                    title={isSidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
                  >
                    {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">{isSidebarCollapsed ? "Expand" : "Collapse"}</span>
                  </button>

                  {/* Quick Chat Access Button */}
                  <button
                    onClick={() => {
                      if (activeTab !== "chat") {
                        setActiveTab("chat");
                      } else {
                        setActiveTab("dashboard");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition cursor-pointer shrink-0 text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                      activeTab === "chat"
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                        : "bg-[#1E2023] hover:bg-[#2A2D31] text-gray-300 hover:text-white border-[#2A2D31]"
                    }`}
                    title={activeTab === "chat" ? "Switch back to Dashboard" : "Open Full Trading Desk Chat"}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{activeTab === "chat" ? "Desk Chat (Active)" : "Desk Chat"}</span>
                  </button>

                  {/* Optional Split-Screen Side-Panel Toggle */}
                  {activeTab !== "chat" && (
                    <button
                      onClick={() => toggleChatSidePanel()}
                      className={`hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border transition cursor-pointer shrink-0 text-[10px] font-bold uppercase tracking-wider ${
                        isChatSidePanelOpen
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                          : "bg-transparent hover:bg-[#1E2023] text-gray-400 hover:text-white border-[#2A2D31]/40"
                      }`}
                      title={isChatSidePanelOpen ? "Hide Side Split Chat" : "Open Split-Screen Side Chat"}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{isChatSidePanelOpen ? "Split: On" : "Split Chat"}</span>
                    </button>
                  )}

                  <h2 className="font-extrabold text-white text-[11px] md:text-sm uppercase tracking-wider truncate flex-1 min-w-0">
                    {activeTab === "dashboard" ? (
                      <>
                        <span className="hidden sm:inline">Dashboard statistics overview</span>
                        <span className="sm:hidden">Dashboard</span>
                      </>
                    ) : activeTab === "chat" ? (
                      <>
                        <span className="hidden sm:inline">Desk Chat (#</span>
                        <span className="text-indigo-400 font-black">#</span>
                        <span>{activeChannelName}</span>
                        <span className="hidden sm:inline">)</span>
                      </>
                    ) : activeTab === "leaderboard" ? (
                      <>
                        <span className="hidden sm:inline">Institutional standing boards</span>
                        <span className="sm:hidden">Leaderboard</span>
                      </>
                    ) : activeTab === "logs" ? (
                      <>
                        <span className="hidden sm:inline">P&L Ledger log sheets</span>
                        <span className="sm:hidden">P&L Logs</span>
                      </>
                    ) : activeTab === "pms" ? (
                      <>
                        <span className="hidden sm:inline">Direct Messages & Encrypted Chat</span>
                        <span className="sm:hidden">Private Messages</span>
                      </>
                    ) : activeTab === "friends" ? (
                      <>
                        <span className="hidden sm:inline">Friends & Linked Co-Traders</span>
                        <span className="sm:hidden">Friends</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Workspace Customizer settings</span>
                        <span className="sm:hidden">Settings</span>
                      </>
                    )}
                  </h2>
                </div>

                <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                  {/* Screen Share / Watch Live Streams Button in Global Header */}
                  <button
                    onClick={() => {
                      if (remoteScreenStreams.size > 0 && !isScreenSharing) {
                        handleOpenScreenShareModal();
                      } else {
                        handleToggleScreenShare();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm select-none ${
                      isScreenSharing
                        ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500 animate-pulse"
                        : remoteScreenStreams.size > 0
                        ? "bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border-emerald-500/50 animate-pulse"
                        : activeVoiceChannel
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400"
                        : "bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/30"
                    }`}
                    title={
                      isScreenSharing
                        ? "Stop sharing your trading terminal"
                        : remoteScreenStreams.size > 0
                        ? `Watch ${remoteScreenStreams.size} live trader stream(s)`
                        : "Start sharing your screen (P2P zero data cost)"
                    }
                  >
                    {isScreenSharing ? (
                      <>
                        <MonitorX className="w-3.5 h-3.5" />
                        <span>Stop Share</span>
                      </>
                    ) : remoteScreenStreams.size > 0 ? (
                      <>
                        <Tv className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Watch Stream ({remoteScreenStreams.size})</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Share Screen</span>
                      </>
                    )}
                  </button>

                  {/* View What's New / App Update Release Notes button */}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("syncpl_open_latest_update"));
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition cursor-pointer text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm"
                    title="View latest app release notes & changelog"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span className="hidden sm:inline">Updates</span>
                  </button>

                  <button
                    onClick={handleRequestNotificationPermission}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                      notificationPermission === "granted"
                        ? "bg-emerald-950/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30"
                        : notificationPermission === "denied"
                        ? "bg-rose-950/15 border-rose-500/20 text-rose-400"
                        : "bg-amber-950/15 border-amber-500/20 text-amber-400 hover:bg-amber-950/30 animate-pulse"
                    }`}
                    title={
                      notificationPermission === "granted"
                        ? "Browser Push Notifications Active"
                        : notificationPermission === "denied"
                        ? "Notifications Blocked in Browser Settings"
                        : "Enable Browser Push Notifications"
                    }
                  >
                    <Bell className={`w-3.5 h-3.5 ${notificationPermission === "default" ? "animate-bounce" : ""}`} />
                    <span className="hidden lg:inline">
                      {notificationPermission === "granted"
                        ? "Alerts Active"
                        : notificationPermission === "denied"
                        ? "Alerts Blocked"
                        : "Enable Alerts"}
                    </span>
                  </button>

                  <div className="flex items-center space-x-2.5 text-[10px] md:text-xs bg-indigo-950/20 px-2 md:px-3 py-1.5 rounded-xl border border-indigo-500/10 shrink-0">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span className="text-gray-400 hidden lg:inline">Trading Room:</span>
                    <span className="text-indigo-400 font-mono font-bold tracking-wider">{activeRoom.id}</span>
                  </div>
                </div>
              </header>

              <div className="flex-grow flex-1 min-h-0 w-full relative z-10 overflow-hidden flex flex-row min-w-0">
                {/* Left/Middle Tab Contents */}
                <div className="flex-grow flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  {isRoomLocked && activeTab !== "partners" ? (
                    <div className="flex-1 w-full bg-[#121417] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                      <div className="max-w-md w-full bg-[#1E2023] border border-[#2A2D31] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#5865F2]/5 rounded-full blur-2xl pointer-events-none" />

                        {/* Lock Icon */}
                        <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full border border-amber-500/25 flex items-center justify-center text-amber-400">
                          <Lock className="w-8 h-8" />
                        </div>

                        {/* Title and Room description */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
                            Premium Workspace Desk
                          </span>
                          <h3 className="text-xl font-black text-white tracking-tight">
                            Room {activeRoom.id} is Private
                          </h3>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            This synchronized trade station is a paid-only desk hosted by expert trader <span className="text-indigo-400 font-bold">@{activeRoom.creatorName || "Desk Owner"}</span>. Subscribe to unlock premium indicators, voice desks, live checklists, and verified P&L logging feeds.
                          </p>
                        </div>

                        {/* Stats Dashboard to prove worthiness */}
                        <div className="grid grid-cols-3 gap-2 bg-[#121417]/80 p-3.5 rounded-xl border border-[#2A2D31]/40 text-center">
                          <div>
                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Win Rate</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5 block">68.2%</span>
                          </div>
                          <div className="border-x border-[#2A2D31]/60">
                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Profit Fac.</span>
                            <span className="text-xs sm:text-sm font-black text-indigo-400 mt-0.5 block">2.41</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Trades</span>
                            <span className="text-xs sm:text-sm font-black text-white mt-0.5 block">{pnlLogs.length + 14}</span>
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="py-2 flex items-center justify-center gap-1">
                          <span className="text-3xl font-black text-white">${(activeRoom.monthlyPrice || 29.00).toFixed(2)}</span>
                          <span className="text-xs text-[#8E9297] font-semibold mt-2">/ month</span>
                        </div>

                        {/* Checkout Action */}
                        <div className="space-y-4">
                          {isSubmittingPayment ? (
                            <div className="space-y-3 bg-[#121417] p-5 rounded-xl border border-[#2A2D31]/60 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-mono font-bold text-indigo-400">Processing Direct Transaction...</span>
                              </div>
                              <p className="text-[11px] text-gray-300 font-mono animate-pulse">{paymentStep}</p>
                            </div>
                          ) : (
                            <div className="space-y-4 text-left">
                              {/* Payment Method Switcher Tabs */}
                              <div className="flex bg-[#121417] p-1 rounded-xl border border-[#2A2D31]/60 gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPaywallPaymentTab("card")}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    paywallPaymentTab === "card"
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "text-gray-400 hover:text-white"
                                  }`}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Credit / Debit Card</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaywallPaymentTab("p2p")}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    paywallPaymentTab === "p2p"
                                      ? "bg-[#2A2D31] text-white shadow-sm"
                                      : "text-gray-400 hover:text-white"
                                  }`}
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  <span>Other Methods & Sandbox</span>
                                </button>
                              </div>

                              {/* TAB 1: Direct Credit Card Form */}
                              {paywallPaymentTab === "card" && (
                                <form onSubmit={handleDirectCardSubscribe} className="space-y-3 bg-[#121417]/90 p-4 rounded-xl border border-[#2A2D31]/70 animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between pb-1 border-b border-[#2A2D31]/50">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-emerald-400" /> Direct Stripe Card Processing
                                    </span>
                                    <div className="flex items-center gap-1 text-[9px] font-mono text-gray-400 uppercase">
                                      <span className={getCardBrand(directCardNumber) === "visa" ? "text-blue-400 font-bold" : "opacity-40"}>VISA</span>
                                      <span className={getCardBrand(directCardNumber) === "mastercard" ? "text-amber-400 font-bold" : "opacity-40"}>MC</span>
                                      <span className={getCardBrand(directCardNumber) === "amex" ? "text-cyan-400 font-bold" : "opacity-40"}>AMEX</span>
                                      <span className={getCardBrand(directCardNumber) === "discover" ? "text-orange-400 font-bold" : "opacity-40"}>DISC</span>
                                    </div>
                                  </div>

                                  {directCardError && (
                                    <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[11px] text-rose-300 font-medium flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                      <span>{directCardError}</span>
                                    </div>
                                  )}

                                  {/* Cardholder Name */}
                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                      Name on Card
                                    </label>
                                    <input
                                      type="text"
                                      value={directCardholderName}
                                      onChange={(e) => setDirectCardholderName(e.target.value)}
                                      placeholder={profile?.username || "Full Name"}
                                      className="w-full bg-[#1E2023] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition"
                                    />
                                  </div>

                                  {/* Card Number */}
                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                      Card Number
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={directCardNumber}
                                        onChange={(e) => handleCardNumberChange(e.target.value)}
                                        placeholder="•••• •••• •••• ••••"
                                        className="w-full bg-[#1E2023] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition"
                                      />
                                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                        <CreditCard className="w-4 h-4 text-gray-500" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expiration & CVC & Zip */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                        Expires
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={directCardExp}
                                        onChange={(e) => handleCardExpChange(e.target.value)}
                                        placeholder="MM/YY"
                                        className="w-full bg-[#1E2023] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                        CVC / CVV
                                      </label>
                                      <input
                                        type="password"
                                        inputMode="numeric"
                                        value={directCardCvc}
                                        onChange={(e) => handleCardCvcChange(e.target.value)}
                                        placeholder="123"
                                        maxLength={4}
                                        className="w-full bg-[#1E2023] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                        ZIP / Postal
                                      </label>
                                      <input
                                        type="text"
                                        value={directCardZip}
                                        onChange={(e) => setDirectCardZip(e.target.value)}
                                        placeholder="90210"
                                        className="w-full bg-[#1E2023] border border-[#2A2D31] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="submit"
                                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Pay ${(activeRoom.monthlyPrice || 29.00).toFixed(2)}/mo with Stripe</span>
                                  </button>

                                  <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1">
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> 256-Bit Encrypted
                                    </span>
                                    <span>Cancel anytime in Settings</span>
                                  </div>
                                </form>
                              )}

                              {/* TAB 2: P2P & Sandbox Options */}
                              {paywallPaymentTab === "p2p" && (
                                <div className="space-y-3 bg-[#121417]/90 p-4 rounded-xl border border-[#2A2D31]/60 animate-in fade-in duration-150">
                                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                                    Select Alternative Payout Channel:
                                  </span>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {activeRoom.paypalLink && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPaywallChannel("paypal")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                          selectedPaywallChannel === "paypal"
                                            ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                            : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                        }`}
                                      >
                                        PayPal
                                      </button>
                                    )}
                                    {activeRoom.venmoUsername && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPaywallChannel("venmo")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                          selectedPaywallChannel === "venmo"
                                            ? "bg-[#008CFF]/10 border-[#008CFF] text-[#008CFF]"
                                            : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                        }`}
                                      >
                                        Venmo
                                      </button>
                                    )}
                                    {activeRoom.cashappTag && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPaywallChannel("cashapp")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                          selectedPaywallChannel === "cashapp"
                                            ? "bg-emerald-600/10 border-emerald-500 text-emerald-400"
                                            : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                        }`}
                                      >
                                        Cash App
                                      </button>
                                    )}
                                    {activeRoom.stripePaymentLink && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPaywallChannel("stripe")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                          selectedPaywallChannel === "stripe"
                                            ? "bg-[#635BFF]/10 border-[#635BFF] text-[#635BFF]"
                                            : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                        }`}
                                      >
                                        Stripe Link
                                      </button>
                                    )}
                                    {activeRoom.customPaymentInstructions && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPaywallChannel("custom")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                          selectedPaywallChannel === "custom"
                                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                            : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                        }`}
                                      >
                                        Alternative
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPaywallChannel("sandbox")}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                        selectedPaywallChannel === "sandbox"
                                          ? "bg-gray-600/10 border-gray-500 text-gray-300"
                                          : "bg-[#1E2023] border-transparent text-gray-400 hover:text-white"
                                      }`}
                                    >
                                      Sandbox
                                    </button>
                                  </div>

                                  <div className="border-t border-[#2A2D31]/40 pt-2.5 mt-2">
                                    {selectedPaywallChannel === "paypal" && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] text-gray-400">
                                          Transfer exactly <span className="font-bold text-white">${(activeRoom.monthlyPrice || 29.00).toFixed(2)}</span> to the creator's PayPal account to settle.
                                        </p>
                                        <a
                                          href={activeRoom.paypalLink.startsWith("http") ? activeRoom.paypalLink : `https://paypal.me/${activeRoom.paypalLink}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="inline-flex w-full justify-center items-center gap-1.5 bg-[#003087] hover:bg-[#0079C1] text-white text-xs font-black py-2 rounded-lg transition"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" /> Pay on PayPal
                                        </a>
                                      </div>
                                    )}

                                    {selectedPaywallChannel === "venmo" && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] text-gray-400">
                                          Send <span className="font-bold text-white">${(activeRoom.monthlyPrice || 29.00).toFixed(2)}</span> to Venmo handle: <span className="text-blue-400 font-bold font-mono">{activeRoom.venmoUsername}</span>.
                                        </p>
                                        <a
                                          href={`https://venmo.com/${activeRoom.venmoUsername.replace('@', '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="inline-flex w-full justify-center items-center gap-1.5 bg-[#008CFF] hover:bg-[#0074D9] text-white text-xs font-black py-2 rounded-lg transition"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" /> Pay with Venmo
                                        </a>
                                      </div>
                                    )}

                                    {selectedPaywallChannel === "cashapp" && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] text-gray-400">
                                          Send <span className="font-bold text-white">${(activeRoom.monthlyPrice || 29.00).toFixed(2)}</span> to Cash App Cashtag: <span className="text-emerald-400 font-bold font-mono">{activeRoom.cashappTag}</span>.
                                        </p>
                                        <a
                                          href={`https://cash.app/$${activeRoom.cashappTag.replace('$', '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="inline-flex w-full justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 rounded-lg transition"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" /> Pay with Cash App
                                        </a>
                                      </div>
                                    )}

                                    {selectedPaywallChannel === "stripe" && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] text-gray-400">
                                          Click below to pay safely using Stripe Hosted Checkout.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={handleDirectWorkspaceStripeCheckout}
                                          className="inline-flex w-full justify-center items-center gap-1.5 bg-[#635BFF] hover:bg-[#5249EC] text-white text-xs font-black py-2 rounded-lg transition cursor-pointer"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" /> Hosted Stripe Checkout (${(activeRoom.monthlyPrice || 29).toFixed(2)}/mo)
                                        </button>
                                      </div>
                                    )}

                                    {selectedPaywallChannel === "custom" && (
                                      <div className="space-y-2">
                                        <span className="text-[9px] uppercase font-bold text-gray-500">Alternative Instructions:</span>
                                        <div className="bg-[#1E2023] p-2.5 rounded border border-[#2A2D31] text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-normal">
                                          {activeRoom.customPaymentInstructions}
                                        </div>
                                      </div>
                                    )}

                                    {selectedPaywallChannel === "sandbox" && (
                                      <div className="space-y-1">
                                        <p className="text-[11px] text-gray-400">
                                          Bypass payments instantly to test workspace operations using a sandboxed subscription simulator.
                                        </p>
                                      </div>
                                    )}

                                    {/* Proof of Payment input for P2P */}
                                    {selectedPaywallChannel !== "sandbox" && (
                                      <div className="mt-3.5 space-y-1 animate-in fade-in duration-150">
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                                          Sender Handle / Proof of Transfer
                                        </label>
                                        <input
                                          type="text"
                                          value={p2pPaymentProof}
                                          onChange={(e) => setP2pPaymentProof(e.target.value)}
                                          placeholder="e.g. Sent from @MyVenmo / ref #12345"
                                          className="w-full bg-[#1E2023] border border-[#2A2D31] rounded px-2.5 py-1.5 text-xs text-white"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleSubscribeToRoom}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-[#121417] font-black text-xs py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                                  >
                                    <Coins className="w-4 h-4" /> 
                                    {selectedPaywallChannel === "sandbox" ? "Subscribe via Instant Sandbox Test" : `Confirm Direct ${selectedPaywallChannel.toUpperCase()} Payment`}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-[#8E9297] pt-1">
                            <span>Subscribing grants full workspace member access.</span>
                            {activeRoom.subscribers?.includes(currentUser?.uid) && (
                              <button
                                type="button"
                                onClick={() => handleUnsubscribeFromRoom(activeRoom.id)}
                                className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                              >
                                Cancel Existing Pass
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(activeTab === "dashboard" || activeTab === "group-dashboard") && (
                        <DashboardView
                          pnlLogs={pnlLogs}
                          userId={currentUser.uid}
                          userProfile={profile}
                          traders={traders}
                          roomName={activeRoom.name}
                          roomCode={activeRoom.id}
                          initialMode={activeTab === "group-dashboard" ? "group" : "personal"}
                          payouts={payouts}
                          onSwitchTab={setActiveTab}
                          isPremium={subscriptionState.isPremium}
                          onOpenUpgradeModal={handleOpenProModal}
                          onOpenTiltGuardModal={() => setIsTiltGuardModalOpen(true)}
                          onOpenFlexModal={() => {
                            setFlexModalLog(null);
                            setIsFlexModalOpen(true);
                          }}
                          onOpenLogModal={() => setIsLogModalOpen(true)}
                          onOpenGuide={() => setIsGuideModalOpen(true)}
                        />
                      )}

                      {activeTab === "chat" && (
                        <ChatView
                          activeRoom={activeRoom}
                          activeChannelName={activeChannelName}
                          chatMessages={chatMessages}
                          roomTraders={traders}
                          userId={currentUser.uid}
                          onSendChatMessage={handleSendChatMessage}
                          onDeleteChatMessage={handleDeleteChatMessage}
                          roomAdminId={activeRoom.creatorId}
                          roomMods={activeRoom.moderators || []}
                          isCreatorOrMod={isCreatorOrMod}
                          onToggleModRole={handleToggleModRole}
                          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                          channels={channels}
                          onSelectChannel={(name, type) => {
                            handleSelectChannelWithLockCheck(name, type, true);
                          }}
                          profile={profile}
                          currentUser={currentUser}
                          db={db}
                          triggerToast={triggerToast}
                          activeVoiceChannel={activeVoiceChannel}
                          onToggleVoiceRoom={handleToggleVoiceRoomWithLockCheck}
                          isScreenSharing={isScreenSharing}
                          onToggleScreenShare={handleToggleScreenShare}
                          onOpenScreenShareModal={handleOpenScreenShareModal}
                          remoteScreenStreams={remoteScreenStreams}
                          voiceUsers={voiceUsers}
                          isMuted={isMuted}
                          isDeafened={isDeafened}
                          onToggleMic={handleToggleMic}
                          onToggleDeafen={handleToggleDeafen}
                          onDisconnectVoice={handleDisconnectVoice}
                          onOpenPmWithUser={handleOpenPmWithUser}
                        />
                      )}

                      {activeTab === "leaderboard" && (
                        <LeaderboardView
                          pnlLogs={pnlLogs}
                          traders={traders}
                          currentUserId={currentUser.uid}
                          onOpenLogModal={() => setIsLogModalOpen(true)}
                        />
                      )}

                      {activeTab === "challenges" && (
                        <RoomChallengesView
                          roomCode={activeRoom.id}
                          pnlLogs={pnlLogs}
                          traders={traders}
                          currentUserId={currentUser.uid}
                          isCreatorOrMod={isCreatorOrMod}
                          onOpenFlexModal={(log) => {
                            setFlexModalLog(log || null);
                            setIsFlexModalOpen(true);
                          }}
                          triggerToast={triggerToast}
                        />
                      )}

                      {activeTab === "payouts" && (
                        <PayoutsView
                          payouts={payouts}
                          onAddPayout={handleAddPayout}
                          onDeletePayout={handleDeletePayout}
                          userProfile={profile}
                          activeGroupId={activeRoom.id}
                        />
                      )}

                      {activeTab === "logs" && (
                        <LogsView
                          pnlLogs={pnlLogs}
                          userId={currentUser.uid}
                          username={profile?.username || "Trader"}
                          onDeleteLog={handleDeleteTradeLog}
                          onOpenLogModal={() => setIsLogModalOpen(true)}
                          onImportTrades={handleImportTrades}
                          roomCode={activeRoom.id}
                          traders={traders}
                          isCreatorOrMod={isCreatorOrMod}
                          isPremium={subscriptionState.isPremium}
                          onOpenUpgradeModal={handleOpenProModal}
                        />
                      )}

                      {activeTab === "checklist" && (
                        <ChecklistView
                          rules={tradingRules}
                          onAddRule={handleAddRule}
                          onUpdateRule={handleUpdateRule}
                          onDeleteRule={handleDeleteRule}
                          onSeedDefaultRules={handleSeedDefaultRules}
                          isCreatorOrMod={isCreatorOrMod}
                        />
                      )}

                      {activeTab === "friends" && (
                        <FriendsView
                          currentUser={currentUser}
                          db={db}
                          profile={profile}
                          publicUsers={publicUsers}
                          onJoinRoomCode={handleJoinRoom}
                          onOpenPmWithUser={handleOpenPmWithUser}
                          triggerToast={triggerToast}
                        />
                      )}

                      {activeTab === "pms" && (
                        <PrivateMessagesView
                          currentUser={currentUser}
                          db={db}
                          profile={profile}
                          publicUsers={publicUsers}
                          initialPartnerId={selectedPmUserId}
                          onClearInitialPartner={() => setSelectedPmUserId(null)}
                          onJoinRoomCode={handleJoinRoom}
                          triggerToast={triggerToast}
                        />
                      )}
                    </>
                  )}

                  {activeTab === "partners" && (
                    <SettingsView
                      profile={profile}
                      activeRoom={activeRoom}
                      channels={channels}
                      onUpdateProfile={handleUpdateProfile}
                      onAddChannel={handleAddChannel}
                      onDeleteChannel={handleDeleteChannel}
                      onRenameChannel={handleRenameChannelTrigger}
                      onSetChannelPin={handleSetChannelPin}
                      onMoveChannel={handleMoveChannel}
                      onCopyRoomCode={() => {
                        navigator.clipboard.writeText(activeRoom.id);
                        triggerToast("Room Code Copied", "Share invite code with your partners.", "info");
                      }}
                      onJoinRoomCode={handleJoinRoom}
                      onCreateNewRoom={handleCreateRoom}
                      onRenameRoom={handleRenameRoom}
                      onDeleteRoom={handleDeleteRoom}
                      isCreatorOrMod={isCreatorOrMod}
                      onConsultAiAdvisor={handleConsultAiAdvisor}
                      voiceName={voiceName}
                      setVoiceName={setVoiceName}
                      vocalPrompt={vocalPrompt}
                      setVocalPrompt={setVocalPrompt}
                      subscriptionState={subscriptionState}
                      stripeConfig={stripeConfig}
                      onSubscribe={handleSubscribe}
                      onManageBilling={handleManageBilling}
                      onUpdateSubscriptionTier={handleUpdateSubscriptionTier}
                      onUpdateRoomMonetization={handleUpdateRoomMonetization}
                      onUpdateStripeConnect={handleUpdateStripeConnect}
                      onUpdateDiscordWebhook={handleUpdateDiscordWebhook}
                      chatSoundEnabled={chatSoundEnabled}
                      onToggleChatSound={handleToggleChatSound}
                      chatSoundType={chatSoundType}
                      onChangeChatSoundType={handleChangeChatSoundType}
                      chatSoundVolume={chatSoundVolume}
                      onChangeChatSoundVolume={handleChangeChatSoundVolume}
                      isRoomOwner={
                        activeRoom.creatorId === currentUser?.uid ||
                        currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
                        profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" ||
                        profile?.role === "owner"
                      }
                      currentUser={currentUser}
                      userRooms={rooms}
                      onUnsubscribeFromRoom={handleUnsubscribeFromRoom}
                      triggerToast={triggerToast}
                      onOpenUpgradeModal={handleOpenProModal}
                      isAppOwner={Boolean(currentUser?.email?.toLowerCase() === "1nathandrew6@gmail.com" || profile?.email?.toLowerCase() === "1nathandrew6@gmail.com" || profile?.role === "owner")}
                    />
                  )}
                </div>

                {/* Right-Side Persistent/Collapsible Split-Screen Chat Panel */}
                {activeTab !== "chat" && isChatSidePanelOpen && (
                  <div className="hidden md:flex w-[380px] lg:w-[440px] shrink-0 border-l border-[#2A2D31] bg-[#1E2023] h-full flex flex-col overflow-hidden relative z-20">
                    {/* Header for Chat Side Panel */}
                    <div className="h-10 bg-[#121417] border-b border-[#2A2D31] px-3 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider truncate">
                          Room Chat: #{activeChannelName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            toggleChatSidePanel(false);
                            setActiveTab("chat");
                          }}
                          className="px-2 py-0.5 hover:bg-[#2A2D31] text-indigo-400 hover:text-white rounded text-[10px] font-bold transition cursor-pointer"
                          title="Expand into full screen chat"
                        >
                          Full Screen
                        </button>
                        <button
                          onClick={() => toggleChatSidePanel(false)}
                          className="p-1 hover:bg-[#2A2D31] text-gray-400 hover:text-white rounded transition cursor-pointer"
                          title="Close Chat Side Panel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 w-full">
                      <ChatView
                        activeRoom={activeRoom}
                        activeChannelName={activeChannelName}
                        chatMessages={chatMessages}
                        roomTraders={traders}
                        userId={currentUser.uid}
                        onSendChatMessage={handleSendChatMessage}
                        onDeleteChatMessage={handleDeleteChatMessage}
                        roomAdminId={activeRoom.creatorId}
                        roomMods={activeRoom.moderators || []}
                        isCreatorOrMod={isCreatorOrMod}
                        onToggleModRole={handleToggleModRole}
                        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                        profile={profile}
                        currentUser={currentUser}
                        db={db}
                        triggerToast={triggerToast}
                      />
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>

          {/* Modal Overlay: Join / Create Room manually */}
          {isJoinCreateOpen && (
            <div className="fixed inset-0 z-50 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#1E2023] border border-[#2A2D31] rounded w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
                <button
                  onClick={() => setIsJoinCreateOpen(false)}
                  className="absolute top-4 right-4 text-[#8E9297] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-4 pt-2">
                  <h3 className="font-extrabold text-lg text-white">Join or Establish a Sync Room</h3>
                  <p className="text-xs text-[#8E9297] leading-relaxed">
                    Collaborate with fellow traders. Paste their invitation room code below or establish a new node.
                  </p>

                  <div className="space-y-3 pt-2">
                    {!isModalCreatingNamed ? (
                      <button
                        onClick={() => setIsModalCreatingNamed(true)}
                        className="w-full bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] font-extrabold text-xs py-2.5 px-4 rounded hover:bg-[#5865F2]/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Establish New Sync Room
                      </button>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await handleCreateRoom(modalCreateRoomName.trim());
                          setModalCreateRoomName("");
                          setIsModalCreatingNamed(false);
                        }}
                        className="bg-[#121417] p-3 rounded-lg border border-[#2A2D31] space-y-2 text-left"
                      >
                        <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                          New Room Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. FX Scalpers Desk"
                          value={modalCreateRoomName}
                          onChange={(e) => setModalCreateRoomName(e.target.value)}
                          className="w-full bg-[#08090A] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsModalCreatingNamed(false)}
                            className="w-1/3 bg-[#1E2023] hover:bg-[#25282E] text-gray-300 text-xs font-bold py-1.5 rounded transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-1.5 rounded transition cursor-pointer"
                          >
                            Establish
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-[#2A2D31]/50"></div>
                      <span className="flex-shrink mx-3 text-[#72767D] text-[10px] font-bold uppercase tracking-wider">
                        Or enter join code
                      </span>
                      <div className="flex-grow border-t border-[#2A2D31]/50"></div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleJoinRoom(modalJoinCode);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="PL-XXXX"
                        value={modalJoinCode}
                        onChange={(e) => setModalJoinCode(e.target.value.toUpperCase())}
                        className="bg-[#121417] border border-[#2A2D31] rounded px-4 py-2 text-xs text-white uppercase font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-[#5865F2] flex-grow text-center font-mono"
                      />
                      <button
                        type="submit"
                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-5 rounded transition"
                      >
                        Join
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Overlay: Log P&L Trade Setup */}
          {isLogModalOpen && (
            <div className="fixed inset-0 z-40 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#1E2023] border border-[#2A2D31] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200 max-h-[calc(100vh-2rem)] flex flex-col">
                <div className="p-4 sm:p-5 border-b border-[#2A2D31]/60 flex items-center justify-between bg-[#121417] shrink-0">
                  <h3 className="font-extrabold text-gray-100 text-sm flex items-center gap-2">
                    <TrendingUp className="text-[#5865F2] w-5 h-5" /> Log Verified Trade Setup
                  </h3>
                  <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleLogTradeSubmit} className="flex-grow flex flex-col overflow-hidden">
                  <div className="p-4 sm:p-6 space-y-4 text-[#DCDDDE] overflow-y-auto flex-grow">
                    <div>
                      <label className="block text-xs font-bold text-[#8E9297] uppercase mb-2">
                        P&L Amount ($ USD)
                      </label>
                      <div className="flex rounded overflow-hidden border border-[#2A2D31]">
                        <button
                          type="button"
                          onClick={() => setLogType("profit")}
                          className={`flex-grow py-2.5 text-sm font-extrabold transition cursor-pointer ${
                            logType === "profit" ? "bg-[#43B581]/10 text-[#43B581]" : "bg-[#121417] text-gray-500"
                          }`}
                        >
                          PROFIT (+)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogType("loss")}
                          className={`flex-grow py-2.5 text-sm font-extrabold transition cursor-pointer ${
                            logType === "loss" ? "bg-[#F04747]/10 text-[#F04747]" : "bg-[#121417] text-gray-500"
                          }`}
                        >
                          LOSS (-)
                        </button>
                      </div>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#72767D] font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={logAmount}
                          onChange={(e) => setLogAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#121417] border border-[#2A2D31] rounded pl-8 pr-4 py-2.5 text-lg font-black text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Account Ledger Category Selector */}
                    <div>
                      <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5 flex items-center justify-between">
                        <span>Account Type</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold capitalize">
                          {logAccountType} Account
                        </span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#121417] border border-[#2A2D31] rounded-lg">
                        {(
                          [
                            { id: "funded", label: "Funded", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
                            { id: "live", label: "Live", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" },
                            { id: "eval", label: "Eval", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
                            { id: "practice", label: "Practice", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
                          ] as const
                        ).map((tab) => {
                          const isActive = logAccountType === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setLogAccountType(tab.id)}
                              className={`py-1.5 px-1 rounded text-xs font-black uppercase tracking-wider transition border cursor-pointer text-center ${
                                isActive
                                  ? `${tab.color} shadow-sm`
                                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1E2023]"
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Date</label>
                        <input
                          type="date"
                          required
                          value={logDate}
                          onChange={(e) => setLogDate(e.target.value)}
                          className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Time</label>
                        <input
                          type="time"
                          required
                          value={logTime}
                          onChange={(e) => setLogTime(e.target.value)}
                          className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Asset / Ticker</label>
                        <input
                          type="text"
                          required
                          value={logAsset}
                          onChange={(e) => setLogAsset(e.target.value)}
                          placeholder="BTC"
                          className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-[#8E9297] uppercase">Strategy</label>
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomStrategy((prev) => !prev)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{isAddingCustomStrategy ? "Close" : "+ Add Own"}</span>
                          </button>
                        </div>
                        <select
                          value={isAddingCustomStrategy ? "__custom_new__" : logStrategy}
                          onChange={(e) => {
                            if (e.target.value === "__custom_new__") {
                              setIsAddingCustomStrategy(true);
                            } else {
                              setIsAddingCustomStrategy(false);
                              setLogStrategy(e.target.value);
                            }
                          }}
                          className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                        >
                          <optgroup label="Popular Strategies">
                            {DEFAULT_STRATEGIES.map((strat) => (
                              <option key={strat} value={strat}>
                                {strat}
                              </option>
                            ))}
                          </optgroup>
                          {customStrategies.length > 0 && (
                            <optgroup label="Your Custom Strategies">
                              {customStrategies.map((strat) => (
                                <option key={strat} value={strat}>
                                  ★ {strat}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="__custom_new__">+ Add Your Own Strategy...</option>
                        </select>
                      </div>
                    </div>

                    {/* Inline Custom Strategy Creator */}
                    {isAddingCustomStrategy && (
                      <div className="bg-[#0F1113] border border-indigo-500/40 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Create Custom Strategy
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCustomStrategy(false);
                              setNewCustomStrategyInput("");
                            }}
                            className="text-gray-400 hover:text-white text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCustomStrategyInput}
                            onChange={(e) => setNewCustomStrategyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomStrategy(newCustomStrategyInput);
                              }
                            }}
                            placeholder="e.g. 5m ICT Silver Bullet, 200 EMA Bounce..."
                            className="flex-1 bg-[#121417] border border-[#2A2D31] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={!newCustomStrategyInput.trim()}
                            onClick={() => handleAddCustomStrategy(newCustomStrategyInput)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition cursor-pointer shrink-0 shadow"
                          >
                            Save & Use
                          </button>
                        </div>
                        {customStrategies.length > 0 && (
                          <div className="pt-1.5 border-t border-[#2A2D31]/40 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-semibold mr-1">Your Saved:</span>
                            {customStrategies.map((cs) => (
                              <span
                                key={cs}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1E2023] border border-[#2A2D31] text-gray-300"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLogStrategy(cs);
                                    setIsAddingCustomStrategy(false);
                                  }}
                                  className="hover:text-indigo-400 transition cursor-pointer"
                                >
                                  {cs}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomStrategy(cs)}
                                  className="text-gray-500 hover:text-rose-400 transition ml-0.5 cursor-pointer"
                                  title="Delete custom strategy"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Strategy Suggestion Chips */}
                    {!isAddingCustomStrategy && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            Quick Pick Strategy
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold truncate max-w-[180px]">
                            Selected: {logStrategy}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                          {["Breakout", "Mean Reversion", "Supply & Demand (OB/FVG)", "Scalp / Momentum", "Liquidity Sweep / ICT", "Trend Following / Pullback", ...customStrategies.slice(0, 3)].map((chip) => {
                            const isSelected = logStrategy === chip;
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setLogStrategy(chip)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer border ${
                                  isSelected
                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                                    : "bg-[#121417] text-gray-400 border-[#2A2D31] hover:text-gray-200 hover:bg-[#1E2023]"
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Notes</label>
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="Add technical indicator confirmations or leverage notes..."
                        rows={2}
                        className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#121417] border-t border-[#2A2D31]/60 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsLogModalOpen(false)}
                      className="w-1/3 bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2.5 rounded transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2.5 rounded transition shadow cursor-pointer"
                    >
                      Sync Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Overlay: Custom Create Channel */}
          {isCreateChannelOpen && (
            <div className="fixed inset-0 z-50 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
              <form onSubmit={handleConfirmCreateChannel} className="bg-[#1E2023] border border-[#2A2D31] rounded w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-[#2A2D31]/60 flex items-center justify-between bg-[#121417]">
                  <h3 className="font-extrabold text-gray-100 text-sm flex items-center gap-2">
                    <Plus className="text-[#5865F2] w-5 h-5" />
                    <span>Create {createChannelType === "text" ? "Text Channel" : "Voice Room"}</span>
                  </h3>
                  <button type="button" onClick={() => setIsCreateChannelOpen(false)} className="text-gray-400 hover:text-white transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-[#DCDDDE]">
                  <div>
                    <label className="block text-xs font-bold text-[#8E9297] uppercase tracking-widest mb-2">
                      Channel Type
                    </label>
                    <div className="bg-[#121417] border border-[#2A2D31] rounded p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {createChannelType === "text" ? (
                          <span className="text-indigo-400 font-extrabold text-sm">#</span>
                        ) : (
                          <Volume2 className="text-emerald-400 w-4 h-4" />
                        )}
                        <span className="text-xs font-bold capitalize text-white">
                          {createChannelType} Channel
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">Selected</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      required
                      value={createChannelName}
                      onChange={(e) => setCreateChannelName(e.target.value)}
                      placeholder={createChannelType === "text" ? "e.g. trading-setups" : "e.g. Scalp Room 1"}
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-semibold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      {createChannelType === "text"
                        ? "Text channels allow sharing charts, links and technical logs."
                        : "Voice rooms support active technical syncs, screen share grids, and audio."}
                    </p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateChannelOpen(false)}
                      className="w-1/3 bg-[#121417] hover:bg-[#08090A] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2 rounded transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2 rounded transition cursor-pointer"
                    >
                      Create Channel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Modal Overlay: Rename Channel */}
          {isRenameOpen && renameTarget && (
            <div className="fixed inset-0 z-50 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#1E2023] border border-[#2A2D31] rounded w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6">
                <h3 className="font-extrabold text-lg text-white mb-2">Rename Workspace Channel</h3>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#8E9297] uppercase tracking-widest mb-1.5">
                      Current Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={renameTarget.name}
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-4 py-2 text-xs text-[#72767D] font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      New Name
                    </label>
                    <input
                      type="text"
                      required
                      value={renameNewName}
                      onChange={(e) => setRenameNewName(e.target.value)}
                      placeholder="crypto-setups"
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-mono lowercase"
                    />
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => {
                        setIsRenameOpen(false);
                        setRenameTarget(null);
                      }}
                      className="w-1/3 bg-[#121417] hover:bg-[#08090A] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2 rounded transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRename}
                      className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2 rounded transition"
                    >
                      Save Name
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Overlay: PIN Unlock */}
          {pendingChannelToUnlock && (
            <div className="fixed inset-0 z-[90] bg-[#0F1113]/95 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#1E2023] border border-[#2A2D31] rounded w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6">
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                  <Lock className="w-5 h-5 fill-amber-500/10" />
                  <h3 className="font-extrabold text-lg text-white">Unlock Channel</h3>
                </div>
                <p className="text-xs text-[#8E9297] mb-4">
                  The {pendingChannelToUnlock.type === "text" ? "text channel" : "voice room"}{" "}
                  <span className="text-white font-bold">#{pendingChannelToUnlock.name}</span> is PIN-protected. Please enter the room PIN to join.
                </p>
                <form onSubmit={handleVerifyChannelPin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Enter PIN Code
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="e.g. 1234"
                      value={enteredPin}
                      onChange={(e) => {
                        setEnteredPin(e.target.value);
                        if (pinError) setPinError("");
                      }}
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-4 py-2.5 text-center text-lg text-white tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    {pinError && (
                      <p className="text-rose-500 text-xs font-semibold mt-1.5 animate-pulse text-center">
                        {pinError}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingChannelToUnlock(null);
                        setEnteredPin("");
                        setPinError("");
                      }}
                      className="w-1/3 bg-[#121417] hover:bg-[#08090A] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2 rounded transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                    >
                      Unlock Room
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Custom Confirmation Dialog */}
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[100] bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-[#1E2023] border border-[#2A2D31] rounded w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white mb-1">{confirmDialog.title}</h3>
                    <p className="text-xs text-[#8E9297] leading-relaxed">{confirmDialog.message}</p>
                  </div>
                </div>
                <div className="pt-5 flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-[#121417] hover:bg-[#08090A] border border-[#2A2D31] text-gray-300 font-semibold text-xs rounded transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded transition cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live WebRTC Screen Share Modal */}
          {isScreenModalOpen && (
            <LiveScreenShareModal
              isOpen={isScreenModalOpen}
              onClose={() => setIsScreenModalOpen(false)}
              stream={
                activeScreenStreamUid === currentUser?.uid
                  ? localScreenStream
                  : (activeScreenStreamUid ? remoteScreenStreams.get(activeScreenStreamUid) || null : null)
              }
              streamerUser={(() => {
                if (activeScreenStreamUid === currentUser?.uid) {
                  return {
                    uid: currentUser?.uid || "",
                    username: profile?.username || "You",
                    avatarColor: profile?.avatarColor,
                    avatarType: profile?.avatarType,
                    avatarVal: profile?.avatarVal,
                  };
                }
                const vUser = voiceUsers.find((u) => u.userId === activeScreenStreamUid || u.id === activeScreenStreamUid);
                if (vUser) {
                  return {
                    uid: vUser.userId || vUser.id,
                    username: vUser.username,
                    avatarColor: vUser.avatarColor,
                    avatarType: vUser.avatarType,
                    avatarVal: vUser.avatarVal,
                  };
                }
                const pUser = publicUsers.find((u) => u.uid === activeScreenStreamUid);
                if (pUser) {
                  return {
                    uid: pUser.uid,
                    username: pUser.username || "Trader",
                    avatarColor: pUser.avatarColor,
                    avatarType: pUser.avatarType,
                    avatarVal: pUser.avatarVal,
                  };
                }
                return {
                  uid: activeScreenStreamUid || "",
                  username: "Desk Trader",
                };
              })()}
              isLocalUserStream={activeScreenStreamUid === currentUser?.uid}
              onStopScreenShare={handleToggleScreenShare}
              activeVoiceUsers={voiceUsers}
              availableStreams={(() => {
                const streams: Array<{ uid: string; username: string; stream: MediaStream; isLocal: boolean }> = [];
                if (isScreenSharing && localScreenStream && currentUser) {
                  streams.push({
                    uid: currentUser.uid,
                    username: profile?.username || "You",
                    stream: localScreenStream,
                    isLocal: true,
                  });
                }
                remoteScreenStreams.forEach((stream, uid) => {
                  const u = voiceUsers.find((v) => v.userId === uid || v.id === uid) || publicUsers.find((p) => p.uid === uid);
                  streams.push({
                    uid,
                    username: u?.username || "Desk Peer",
                    stream,
                    isLocal: false,
                  });
                });
                return streams;
              })()}
              onSelectStream={(uid) => setActiveScreenStreamUid(uid)}
            />
          )}

          <ProUpgradeModal
            isOpen={proModalState.isOpen}
            onClose={() => setProModalState((prev) => ({ ...prev, isOpen: false }))}
            profile={profile}
            currentUser={currentUser}
            subscriptionState={subscriptionState}
            triggerToast={triggerToast}
            reason={proModalState.reason}
            onUpdateLocalProfile={(updated) => setProfile(updated)}
          />

          <TiltGuardModal
            isOpen={isTiltGuardModalOpen}
            onClose={() => setIsTiltGuardModalOpen(false)}
            userId={currentUser.uid}
            username={profile?.username || "Trader"}
            pnlLogs={pnlLogs}
            triggerToast={triggerToast}
          />

          <CleanFlexCardModal
            isOpen={isFlexModalOpen}
            onClose={() => {
              setIsFlexModalOpen(false);
              setFlexModalLog(null);
            }}
            tradeLog={flexModalLog}
            dailyRecap={
              !flexModalLog
                ? {
                    date: getLocalDateString(new Date()),
                    totalPnl: pnlLogs
                      .filter((l) => l.userId === currentUser.uid && l.date === getLocalDateString(new Date()))
                      .reduce((sum, l) => sum + l.amount, 0),
                    winRate: (() => {
                      const today = pnlLogs.filter(
                        (l) => l.userId === currentUser.uid && l.date === getLocalDateString(new Date())
                      );
                      const wins = today.filter((l) => l.amount >= 0).length;
                      return today.length > 0 ? Math.round((wins / today.length) * 100) : 0;
                    })(),
                    tradesCount: pnlLogs.filter(
                      (l) => l.userId === currentUser.uid && l.date === getLocalDateString(new Date())
                    ).length,
                    bestTrade: Math.max(
                      0,
                      ...pnlLogs
                        .filter((l) => l.userId === currentUser.uid && l.date === getLocalDateString(new Date()))
                        .map((l) => l.amount)
                    ),
                  }
                : null
            }
            trader={profile}
            deskName={activeRoom.name || "Trading Desk"}
            roomCode={activeRoom.id}
            triggerToast={triggerToast}
          />

          <GettingStartedGuideModal
            isOpen={isGuideModalOpen}
            onClose={handleCloseGuide}
            onSwitchTab={setActiveTab}
            onOpenLogModal={() => {
              handleCloseGuide();
              setIsLogModalOpen(true);
            }}
            onOpenTiltGuardModal={() => {
              handleCloseGuide();
              setIsTiltGuardModalOpen(true);
            }}
            onOpenFlexModal={() => {
              handleCloseGuide();
              setFlexModalLog(null);
              setIsFlexModalOpen(true);
            }}
          />

          <UpdateNotifier />
          <WebUpdateNotifier />
        </>
      )}
    </div>
  );
}
