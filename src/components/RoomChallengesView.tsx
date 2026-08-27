import React, { useState, useMemo } from "react";
import {
  Trophy,
  Flame,
  Target,
  Plus,
  CheckCircle2,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Crown,
  Users,
  Shield,
  Clock,
  Check,
  X,
} from "lucide-react";
import { PnlLog, UserProfile, AccountType } from "../types";
import { RoomChallengeMilestone, TraderStreakBounty } from "../types/growthFeatures";
import { formatCurrency, getLocalDateString } from "../utils/helpers";
import { isImageAvatar } from "../utils/presence";

interface RoomChallengesProps {
  roomCode: string;
  pnlLogs: PnlLog[];
  traders: UserProfile[];
  currentUserId: string;
  isCreatorOrMod?: boolean;
  onOpenFlexModal?: (log?: PnlLog) => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function RoomChallengesView({
  roomCode,
  pnlLogs,
  traders,
  currentUserId,
  isCreatorOrMod = false,
  onOpenFlexModal,
  triggerToast,
}: RoomChallengesProps) {
  const todayStr = getLocalDateString(new Date());

  // Room Goal State stored locally or synced
  const [deskGoal, setDeskGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`syncpl_deskgoal_${roomCode}`);
      return stored ? parseFloat(stored) : 2500;
    } catch {
      return 2500;
    }
  });

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalVal, setNewGoalVal] = useState(deskGoal.toString());

  // 1. Calculate Today's Collective Desk P&L
  const todayLogs = useMemo(() => {
    return pnlLogs.filter((l) => l.date === todayStr);
  }, [pnlLogs, todayStr]);

  const todayDeskPnl = useMemo(() => {
    return todayLogs.reduce((sum, l) => sum + l.amount, 0);
  }, [todayLogs]);

  const progressPercent = Math.min(100, Math.max(0, Math.round((todayDeskPnl / deskGoal) * 100)));

  // 2. Compute Trader Win Streaks & Bounties
  const traderStreaks = useMemo<TraderStreakBounty[]>(() => {
    const map: Record<string, { current: number; best: number; dailyPnl: number; username: string }> = {};

    // Group logs by trader sorted chronologically
    const userMap: Record<string, PnlLog[]> = {};
    pnlLogs.forEach((log) => {
      if (!userMap[log.userId]) userMap[log.userId] = [];
      userMap[log.userId].push(log);
    });

    Object.keys(userMap).forEach((uid) => {
      const logs = userMap[uid].sort(
        (a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime()
      );

      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;
      let dailySum = 0;
      const username = logs[0]?.username || "Trader";

      logs.forEach((l) => {
        if (l.date === todayStr) {
          dailySum += l.amount;
        }

        if (l.amount >= 0) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      });

      // Compute current active streak starting from the newest
      const reversed = [...logs].reverse();
      for (const l of reversed) {
        if (l.amount >= 0) {
          currentStreak++;
        } else {
          break;
        }
      }

      let badge: TraderStreakBounty["bountyBadge"];
      if (currentStreak >= 10) badge = "👑 10-Streak Legend";
      else if (currentStreak >= 5) badge = "⚡ 5-Streak Sniper";
      else if (currentStreak >= 3) badge = "🔥 3-Streak";
      else if (dailySum >= 1000) badge = "💎 Diamond Discipline";
      else if (dailySum > 0) badge = "🛡️ Iron Risk Guard";

      map[uid] = {
        current: currentStreak,
        best: maxStreak,
        dailyPnl: dailySum,
        username,
      };
    });

    return Object.keys(map).map((uid) => {
      const data = map[uid];
      let badge: TraderStreakBounty["bountyBadge"];
      if (data.current >= 10) badge = "👑 10-Streak Legend";
      else if (data.current >= 5) badge = "⚡ 5-Streak Sniper";
      else if (data.current >= 3) badge = "🔥 3-Streak";
      else if (data.dailyPnl >= 1000) badge = "💎 Diamond Discipline";

      return {
        userId: uid,
        username: data.username,
        currentWinStreak: data.current,
        bestWinStreak: data.best,
        dailyPnl: data.dailyPnl,
        bountyBadge: badge,
      };
    }).sort((a, b) => b.currentWinStreak - a.currentWinStreak || b.dailyPnl - a.dailyPnl);
  }, [pnlLogs, todayStr]);

  const handleSaveGoal = () => {
    const val = parseFloat(newGoalVal);
    if (!isNaN(val) && val > 0) {
      setDeskGoal(val);
      localStorage.setItem(`syncpl_deskgoal_${roomCode}`, val.toString());
      setIsEditingGoal(false);
      triggerToast?.("Desk Goal Updated", `Today's collective target set to ${formatCurrency(val)}`, "success");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full text-[#DCDDDE]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2A2D31] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Co-Op Desk Challenges & Win Streaks</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  Live Room Milestone
                </span>
              </h2>
              <p className="text-xs text-[#8E9297]">
                Work together with your trading desk to hit collective milestones and unlock win-streak bounties
              </p>
            </div>
          </div>
        </div>

        {isCreatorOrMod && (
          <button
            onClick={() => setIsEditingGoal(true)}
            className="px-3 py-1.5 bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-xs font-bold text-gray-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Set Desk Goal</span>
          </button>
        )}
      </div>

      {/* 1. Main Co-Op Desk Target Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/20 via-[#121417] to-[#0A0C0E] border border-amber-500/30 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                DAILY COLLECTIVE TARGET
              </span>
              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                <span>Desk Goal:</span>
                <span className="text-amber-400">{formatCurrency(deskGoal)}</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase block font-extrabold">Today's Pool</span>
                <span
                  className={`text-xl font-black ${
                    todayDeskPnl >= 0 ? "text-emerald-400" : "text-rose-500"
                  }`}
                >
                  {todayDeskPnl >= 0 ? "+" : ""}
                  {formatCurrency(todayDeskPnl)}
                </span>
              </div>
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] text-amber-400 font-bold block">Status</span>
                <span className="text-xs font-black text-white">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#08090A] h-4 rounded-full overflow-hidden border border-[#2A2D31] p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-mono">
              <span>$0.00</span>
              <span>{todayLogs.length} Executions Logged Today</span>
              <span>{formatCurrency(deskGoal)} Target</span>
            </div>
          </div>

          {progressPercent >= 100 && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-xs font-bold animate-in zoom-in-95">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>🎉 Desk Target Achieved! Everyone on the desk is in high performance sync.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Goal Edit Modal */}
      {isEditingGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#121417] border border-[#2A2D31] rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" /> Set Daily Desk Target ($ USD)
            </h3>
            <input
              type="number"
              min="100"
              step="100"
              value={newGoalVal}
              onChange={(e) => setNewGoalVal(e.target.value)}
              className="w-full bg-[#08090A] border border-[#2A2D31] rounded-xl px-3 py-2 text-white font-mono text-sm"
              placeholder="2500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="px-3 py-1.5 bg-[#1E2023] text-gray-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="px-4 py-1.5 bg-amber-500 text-black text-xs font-black rounded-lg"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Win Streak & Bounty Roster */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-black text-white">Live Win-Streak & Bounty Roster</h3>
          </div>
          <span className="text-xs text-gray-400">Ranked by current win streak</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {traderStreaks.map((trader, index) => {
            const userProfile = traders.find((t) => t.id === trader.userId || t.username === trader.username);
            const isUser = trader.userId === currentUserId;

            return (
              <div
                key={trader.userId}
                className={`p-4 rounded-xl border transition-all ${
                  isUser
                    ? "bg-gradient-to-tr from-indigo-950/40 via-[#16181C] to-[#121417] border-indigo-500/40 shadow-md"
                    : "bg-[#121417] border-[#2A2D31] hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      {isImageAvatar(userProfile?.avatarType, userProfile?.avatarVal) ? (
                        <img
                          src={userProfile?.avatarVal}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-[#2A2D31]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                          {trader.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {index === 0 && (
                        <span className="absolute -top-1.5 -right-1 text-xs">👑</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate block">
                          {trader.username}
                        </span>
                        {isUser && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 rounded font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Today: {trader.dailyPnl >= 0 ? "+" : ""}{formatCurrency(trader.dailyPnl)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-orange-400 font-black text-sm justify-end">
                      <Flame className="w-4 h-4 fill-orange-400/30" />
                      <span>{trader.currentWinStreak}W</span>
                    </div>
                    <span className="text-[9px] text-gray-500">Best: {trader.bestWinStreak}W</span>
                  </div>
                </div>

                {/* Bounty Badge Pill */}
                {trader.bountyBadge ? (
                  <div className="pt-2 border-t border-[#2A2D31]/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold bg-zinc-900 border border-zinc-700/60 px-2 py-0.5 rounded-lg text-amber-300">
                      {trader.bountyBadge}
                    </span>
                    <button
                      onClick={() => onOpenFlexModal?.()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      Flex Card &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#2A2D31]/60 text-[10px] text-gray-500 italic">
                    Log green trades to earn streak bounties
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
