export interface Room {
  id: string;
  creatorId: string;
  creatorName: string;
  moderators: string[];
  createdAt: string;
  name?: string;
  isPaid?: boolean;
  monthlyPrice?: number;
  subscribers?: string[];
  paypalLink?: string;
  venmoUsername?: string;
  cashappTag?: string;
  stripePaymentLink?: string;
  customPaymentInstructions?: string;
}

export interface UserProfile {
  id?: string;
  email?: string;
  role?: string;
  username: string;
  avatarColor: "indigo" | "pink" | "emerald" | "amber" | "sky";
  avatarType: "emoji" | "url";
  avatarVal: string;
  groupIds: string[];
  activeGroupId: string;
  createdAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "none";
  subscriptionPeriodEnd?: string;
  trialEndDate?: string;
  subscriptionTier?: "free" | "pro" | "elite" | "premium";
  earningsMRR?: number;
  stripeConnectLinked?: boolean;
  stripeConnectAccountId?: string;
  discordWebhookUrl?: string;
  marketPresence?: "active" | "idle" | "dnd" | "offline";
  customStatus?: string;
  lastActiveAt?: string;
}

export type AccountType = "funded" | "live" | "practice" | "eval";

export interface PnlLog {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  strategy: string;
  asset: string;
  notes: string;
  win: boolean;
  timestamp: string;
  accountType?: AccountType;
  isLive?: boolean;
  direction?: "long" | "short";
  entryPrice?: number;
  tp?: number;
  sl?: number;
  currentPrice?: number;
  status?: "open" | "closed";
  outcome?: "TP" | "SL" | "manual" | "";
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  groupId: string;
  createdAt: string;
  pin?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarColor: string;
  avatarType: "emoji" | "url";
  avatarVal: string;
  groupId: string;
  text: string;
  channel: string;
  timestamp: string;
  imageUrl?: string;
  isEmbed?: boolean;
  amount?: number;
  asset?: string;
  notes?: string;
  accountType?: AccountType;
}

export interface VoiceUser {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  channel: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  joinedAt: string;
  avatarColor?: string;
  avatarType?: "emoji" | "url";
  avatarVal?: string;
}

export interface LiveTrade {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  asset: string;
  direction: "long" | "short";
  entryPrice: number;
  tp: number;
  sl: number;
  currentPrice: number;
  status: "open" | "closed";
  outcome: "TP" | "SL" | "manual" | "";
  profitAmount?: number;
  notes: string;
  timestamp: string;
  isLive?: boolean;
  quantity?: number;
  exitPrice?: number;
}

export interface TradingRule {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  order: number;
}

export interface Friendship {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarColor: string;
  senderAvatarVal: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarColor: string;
  receiverAvatarVal: string;
  status: "pending" | "accepted";
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  propFirm?: string; // e.g. Apex, Topstep, MyFundedFX, FTMO, FundedNext, Personal
  notes?: string;
  timestamp: string;
}




