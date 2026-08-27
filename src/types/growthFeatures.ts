export interface TiltGuardSettings {
  maxDailyLoss: number; // e.g. 500 ($500 max loss)
  consecutiveLossLimit: number; // e.g. 3 consecutive losses
  enabled: boolean;
  cooldownMinutes: number; // e.g. 15 minutes timeout
  soundEnabled: boolean;
}

export interface TiltStatus {
  isTilted: boolean;
  reason?: "max_daily_loss" | "consecutive_losses" | "custom";
  tiltedAt?: string;
  cooldownExpiresAt?: string;
  consecutiveLosses: number;
  dailyLoss: number;
  maxDailyLoss: number;
}

export interface RoomChallengeMilestone {
  id: string;
  roomId: string;
  title: string; // e.g. "Collective Green Day Target"
  targetAmount: number; // e.g. $5,000
  currentAmount: number; // calculated from today's room trades
  type: "daily_pnl" | "win_streak" | "contract_discipline";
  targetDate: string; // YYYY-MM-DD
  status: "active" | "achieved" | "failed";
  createdBy: string;
  createdByName: string;
}

export interface TraderStreakBounty {
  userId: string;
  username: string;
  currentWinStreak: number;
  bestWinStreak: number;
  bountyBadge?: "🔥 3-Streak" | "⚡ 5-Streak Sniper" | "👑 10-Streak Legend" | "🛡️ Iron Risk Guard" | "💎 Diamond Discipline";
  dailyPnl: number;
}
