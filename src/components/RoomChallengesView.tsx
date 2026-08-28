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
  FlaskConical,
  GraduationCap,
  Layers,
  BarChart2,
  BookOpen,
  Sliders,
  DollarSign,
  Play,
  RotateCcw,
} from "lucide-react";
import { PnlLog, UserProfile, AccountType } from "../types";
import { TraderStreakBounty } from "../types/growthFeatures";
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

export type GoalViewMode = "real_only" | "practice_only" | "combined";

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

  // Goal Mode: Real Capital vs Practice Incubator vs Combined
  const [goalMode, setGoalMode] = useState<GoalViewMode>("combined");

  // Real Capital Desk Goal (Stored per room)
  const [realDeskGoal, setRealDeskGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`syncpl_deskgoal_${roomCode}`);
      return stored ? parseFloat(stored) : 2500;
    } catch {
      return 2500;
    }
  });

  // Practice / Simulation Reps Desk Goal (Stored per room)
  const [practiceRepsGoal, setPracticeRepsGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`syncpl_practicerepsgoal_${roomCode}`);
      return stored ? parseInt(stored, 10) : 15;
    } catch {
      return 15;
    }
  });

  // Practice / Simulation P&L Desk Goal
  const [practicePnlGoal, setPracticePnlGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`syncpl_practicepnlgoal_${roomCode}`);
      return stored ? parseFloat(stored) : 2000;
    } catch {
      return 2000;
    }
  });

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newRealGoalVal, setNewRealGoalVal] = useState(realDeskGoal.toString());
  const [newPracticeRepsVal, setNewPracticeRepsVal] = useState(practiceRepsGoal.toString());
  const [newPracticePnlVal, setNewPracticePnlVal] = useState(practicePnlGoal.toString());

  // 1. Calculate Today's Collective Logs & Segregate by Account Type
  const todayLogs = useMemo(() => {
    return pnlLogs.filter((l) => l.date === todayStr);
  }, [pnlLogs, todayStr]);

  const todayStatsByAccount = useMemo(() => {
    let fundedPnl = 0, fundedCount = 0;
    let evalPnl = 0, evalCount = 0;
    let livePnl = 0, liveCount = 0;
    let practicePnl = 0, practiceCount = 0;
    let practiceWins = 0;

    todayLogs.forEach((l) => {
      const acct = l.accountType || "funded";
      if (acct === "funded") {
        fundedPnl += l.amount;
        fundedCount++;
      } else if (acct === "eval") {
        evalPnl += l.amount;
        evalCount++;
      } else if (acct === "live") {
        livePnl += l.amount;
        liveCount++;
      } else if (acct === "practice") {
        practicePnl += l.amount;
        practiceCount++;
        if (l.amount >= 0) practiceWins++;
      }
    });

    const realPnl = fundedPnl + evalPnl + livePnl;
    const realCount = fundedCount + evalCount + liveCount;
    const totalPnl = realPnl + practicePnl;
    const totalCount = realCount + practiceCount;
    const practiceWinRate = practiceCount > 0 ? Math.round((practiceWins / practiceCount) * 100) : 0;

    return {
      funded: { pnl: fundedPnl, count: fundedCount },
      eval: { pnl: evalPnl, count: evalCount },
      live: { pnl: livePnl, count: liveCount },
      practice: { pnl: practicePnl, count: practiceCount, wins: practiceWins, winRate: practiceWinRate },
      real: { pnl: realPnl, count: realCount },
      total: { pnl: totalPnl, count: totalCount },
    };
  }, [todayLogs]);

  // Determine Active Display Goal according to Goal Mode
  const activeGoalMetrics = useMemo(() => {
    if (goalMode === "real_only") {
      const pnl = todayStatsByAccount.real.pnl;
      const target = realDeskGoal;
      const pct = Math.min(100, Math.max(0, Math.round((pnl / target) * 100)));
      return {
        label: "Live / Funded Real Capital Target",
        sublabel: "Excludes simulated sandbox testing",
        currentPnl: pnl,
        targetAmount: target,
        progressPercent: pct,
        tradesCount: todayStatsByAccount.real.count,
        unit: "USD",
        badge: "Real Capital Only",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        accent: "from-emerald-950/30 via-[#121417] to-[#0A0C0E]",
        targetAchieved: pct >= 100,
      };
    } else if (goalMode === "practice_only") {
      const pnl = todayStatsByAccount.practice.pnl;
      const reps = todayStatsByAccount.practice.count;
      const targetReps = practiceRepsGoal;
      const pct = Math.min(100, Math.max(0, Math.round((reps / targetReps) * 100)));
      return {
        label: "Practice & Simulation Incubator Target",
        sublabel: "Testing setups & building execution discipline with zero capital risk",
        currentPnl: pnl,
        currentReps: reps,
        targetReps: targetReps,
        targetAmount: practicePnlGoal,
        progressPercent: pct,
        tradesCount: reps,
        unit: "REPS",
        badge: "Practice Sandbox Goal",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
        accent: "from-sky-950/30 via-[#121417] to-[#0A0C0E]",
        targetAchieved: reps >= targetReps,
      };
    } else {
      // Combined All-Desk Target
      const pnl = todayStatsByAccount.total.pnl;
      const target = realDeskGoal;
      const pct = Math.min(100, Math.max(0, Math.round((pnl / target) * 100)));
      return {
        label: "All-Hands Desk Target (Real + Practice)",
        sublabel: "Collective desk performance across all funded, eval, live, and practice logs",
        currentPnl: pnl,
        targetAmount: target,
        progressPercent: pct,
        tradesCount: todayStatsByAccount.total.count,
        unit: "USD",
        badge: "All-Hands Desk Target",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        accent: "from-amber-950/20 via-[#121417] to-[#0A0C0E]",
        targetAchieved: pct >= 100,
      };
    }
  }, [goalMode, todayStatsByAccount, realDeskGoal, practiceRepsGoal, practicePnlGoal]);

  // 2. Compute Trader Win Streaks, Bounties, and Practice Reps
  const traderStreaks = useMemo<TraderStreakBounty[]>(() => {
    const map: Record<
      string,
      {
        current: number;
        best: number;
        dailyPnl: number;
        username: string;
        practiceToday: number;
        practicePnl: number;
        fundedToday: number;
        liveToday: number;
        evalToday: number;
      }
    > = {};

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
      let practiceToday = 0;
      let practicePnl = 0;
      let fundedToday = 0;
      let liveToday = 0;
      let evalToday = 0;
      const username = logs[0]?.username || "Trader";

      logs.forEach((l) => {
        const isPractice = (l.accountType || "funded") === "practice";

        if (l.date === todayStr) {
          dailySum += l.amount;
          if (isPractice) {
            practiceToday++;
            practicePnl += l.amount;
          } else if (l.accountType === "live") {
            liveToday++;
          } else if (l.accountType === "eval") {
            evalToday++;
          } else {
            fundedToday++;
          }
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
      else if (practiceToday >= 5) badge = "🧪 Lab Scientist";
      else if (dailySum >= 1000) badge = "💎 Diamond Discipline";
      else if (dailySum > 0) badge = "🛡️ Iron Risk Guard";
      else if (practiceToday > 0) badge = "🧘 Zero-Risk Discipline";

      map[uid] = {
        current: currentStreak,
        best: maxStreak,
        dailyPnl: dailySum,
        username,
        practiceToday,
        practicePnl,
        fundedToday,
        liveToday,
        evalToday,
      };
    });

    return Object.keys(map)
      .map((uid) => {
        const data = map[uid];
        let badge: TraderStreakBounty["bountyBadge"];
        if (data.current >= 10) badge = "👑 10-Streak Legend";
        else if (data.current >= 5) badge = "⚡ 5-Streak Sniper";
        else if (data.current >= 3) badge = "🔥 3-Streak";
        else if (data.practiceToday >= 5) badge = "🧪 Lab Scientist";
        else if (data.dailyPnl >= 1000) badge = "💎 Diamond Discipline";
        else if (data.practiceToday > 0) badge = "🧘 Zero-Risk Discipline";

        return {
          userId: uid,
          username: data.username,
          currentWinStreak: data.current,
          bestWinStreak: data.best,
          dailyPnl: data.dailyPnl,
          bountyBadge: badge,
          practiceTradesToday: data.practiceToday,
          practicePnlToday: data.practicePnl,
          fundedTradesToday: data.fundedToday,
          liveTradesToday: data.liveToday,
          evalTradesToday: data.evalToday,
        };
      })
      .sort((a, b) => {
        // In practice mode, rank by practice reps
        if (goalMode === "practice_only") {
          return (b.practiceTradesToday || 0) - (a.practiceTradesToday || 0) || b.currentWinStreak - a.currentWinStreak;
        }
        return b.currentWinStreak - a.currentWinStreak || b.dailyPnl - a.dailyPnl;
      });
  }, [pnlLogs, todayStr, goalMode]);

  // Strategy distribution in practice mode
  const practiceStrategies = useMemo(() => {
    const map: Record<string, { count: number; pnl: number }> = {};
    todayLogs
      .filter((l) => (l.accountType || "funded") === "practice")
      .forEach((l) => {
        const strat = l.strategy || "Sandbox Testing";
        if (!map[strat]) map[strat] = { count: 0, pnl: 0 };
        map[strat].count++;
        map[strat].pnl += l.amount;
      });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [todayLogs]);

  const handleSaveGoal = () => {
    const realVal = parseFloat(newRealGoalVal);
    const practiceReps = parseInt(newPracticeRepsVal, 10);
    const practicePnl = parseFloat(newPracticePnlVal);

    if (!isNaN(realVal) && realVal > 0) {
      setRealDeskGoal(realVal);
      localStorage.setItem(`syncpl_deskgoal_${roomCode}`, realVal.toString());
    }
    if (!isNaN(practiceReps) && practiceReps > 0) {
      setPracticeRepsGoal(practiceReps);
      localStorage.setItem(`syncpl_practicerepsgoal_${roomCode}`, practiceReps.toString());
    }
    if (!isNaN(practicePnl) && practicePnl > 0) {
      setPracticePnlGoal(practicePnl);
      localStorage.setItem(`syncpl_practicepnlgoal_${roomCode}`, practicePnl.toString());
    }

    setIsEditingGoal(false);
    triggerToast?.("Goals Updated", "Daily Desk Real & Practice Targets successfully saved!", "success");
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
                Work together with your trading desk to hit collective milestones, practice setups with zero risk, and unlock bounties.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Target Type Selector Pills */}
          <div className="flex items-center gap-1 bg-[#090A0C] p-1 rounded-xl border border-[#22262C]">
            <button
              onClick={() => setGoalMode("combined")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 ${
                goalMode === "combined"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>All-Desk Target</span>
            </button>

            <button
              onClick={() => setGoalMode("real_only")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 ${
                goalMode === "real_only"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span>Real Capital</span>
            </button>

            <button
              onClick={() => setGoalMode("practice_only")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 ${
                goalMode === "practice_only"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FlaskConical className="w-3 h-3 text-sky-400" />
              <span>Practice Incubator</span>
              <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1 rounded-full font-mono">
                {todayStatsByAccount.practice.count}
              </span>
            </button>
          </div>

          {isCreatorOrMod && (
            <button
              onClick={() => setIsEditingGoal(true)}
              className="px-3 py-1.5 bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-xs font-bold text-gray-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Set Desk Goals</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Main Co-Op Desk Target Card */}
      <div className={`p-6 rounded-2xl bg-gradient-to-r ${activeGoalMetrics.accent} border border-amber-500/30 relative overflow-hidden shadow-xl`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  DAILY COLLECTIVE TARGET
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${activeGoalMetrics.badgeColor}`}>
                  {activeGoalMetrics.badge}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-1">
                <span>Desk Goal:</span>
                {goalMode === "practice_only" ? (
                  <span className="text-sky-400">{practiceRepsGoal} Practice Reps</span>
                ) : (
                  <span className="text-amber-400">{formatCurrency(realDeskGoal)}</span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{activeGoalMetrics.sublabel}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase block font-extrabold">
                  {goalMode === "practice_only" ? "Practice Drill Progress" : "Today's Pool"}
                </span>
                {goalMode === "practice_only" ? (
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-xl sm:text-2xl font-black text-sky-400">
                      {todayStatsByAccount.practice.count} / {practiceRepsGoal}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">Reps</span>
                  </div>
                ) : (
                  <span
                    className={`text-xl sm:text-2xl font-black ${
                      activeGoalMetrics.currentPnl >= 0 ? "text-emerald-400" : "text-rose-500"
                    }`}
                  >
                    {activeGoalMetrics.currentPnl >= 0 ? "+" : ""}
                    {formatCurrency(activeGoalMetrics.currentPnl)}
                  </span>
                )}
              </div>
              <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] text-amber-400 font-bold block">Status</span>
                <span className="text-sm font-black text-white">{activeGoalMetrics.progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#08090A] h-4 rounded-full overflow-hidden border border-[#2A2D31] p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  goalMode === "practice_only"
                    ? "bg-gradient-to-r from-sky-500 via-teal-400 to-indigo-400"
                    : "bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400"
                }`}
                style={{ width: `${activeGoalMetrics.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-mono">
              <span>{goalMode === "practice_only" ? "0 Reps" : "$0.00"}</span>
              <span>{activeGoalMetrics.tradesCount} Executions Logged Today</span>
              <span>
                {goalMode === "practice_only"
                  ? `${practiceRepsGoal} Reps Target`
                  : `${formatCurrency(realDeskGoal)} Target`}
              </span>
            </div>
          </div>

          {/* 🌟 UNMISTAKABLE ACCOUNT EXECUTION COMPOSITION BAR */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-black text-gray-300 uppercase text-[10px] tracking-wider">
                Today's Account Composition:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Funded Pill */}
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-emerald-300">Funded Prop:</span>
                <span className="font-black text-white font-mono">
                  {formatCurrency(todayStatsByAccount.funded.pnl)}
                </span>
                <span className="text-[10px] text-gray-400">({todayStatsByAccount.funded.count} trades)</span>
              </div>

              {/* Eval Pill */}
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-bold text-amber-300">Eval:</span>
                <span className="font-black text-white font-mono">
                  {formatCurrency(todayStatsByAccount.eval.pnl)}
                </span>
                <span className="text-[10px] text-gray-400">({todayStatsByAccount.eval.count} trades)</span>
              </div>

              {/* Live Direct Pill */}
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="font-bold text-indigo-300">Live Broker:</span>
                <span className="font-black text-white font-mono">
                  {formatCurrency(todayStatsByAccount.live.pnl)}
                </span>
                <span className="text-[10px] text-gray-400">({todayStatsByAccount.live.count} trades)</span>
              </div>

              {/* Practice Sim Pill - Specially Highlighted */}
              <div className="flex items-center gap-1.5 bg-sky-500/15 border border-sky-500/40 px-2.5 py-1 rounded-lg shadow-sm">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-black text-sky-300">Practice (Sim):</span>
                <span className="font-black text-white font-mono">
                  {formatCurrency(todayStatsByAccount.practice.pnl)}
                </span>
                <span className="text-[10px] bg-sky-500/20 text-sky-200 px-1.5 py-0.2 rounded font-bold">
                  {todayStatsByAccount.practice.count} Reps
                </span>
              </div>
            </div>
          </div>

          {activeGoalMetrics.targetAchieved && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-xs font-bold animate-in zoom-in-95">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  🎉 {activeGoalMetrics.badge} Achieved! The entire trading desk reached today's collective milestone.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Dedicated Practice Trading Mastery & Drill Incubator */}
      <div className="p-5 rounded-2xl bg-[#14171B] border border-sky-500/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Practice Sandbox & Execution Drill Incubator
                </h3>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                  Zero Capital Risk
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Encouraging members to refine entries, test technical playbooks, and practice risk discipline before committing real capital.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-[#090A0C] border border-[#22262C] rounded-xl flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-semibold">Today's Sim Win Rate:</span>
              <span
                className={`font-black ${
                  todayStatsByAccount.practice.winRate >= 50 ? "text-sky-400" : "text-gray-300"
                }`}
              >
                {todayStatsByAccount.practice.count > 0 ? `${todayStatsByAccount.practice.winRate}%` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Quick Practice Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#090A0C] border border-[#22262C] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Sim Drill Reps</span>
              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-black text-sky-300">
              {todayStatsByAccount.practice.count}{" "}
              <span className="text-xs font-normal text-gray-400">of {practiceRepsGoal} target</span>
            </div>
            <p className="text-[10px] text-gray-500">Backtests & setup rehearsals logged today</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090A0C] border border-[#22262C] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Sim Net P&L</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div
              className={`text-xl font-black ${
                todayStatsByAccount.practice.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(todayStatsByAccount.practice.pnl)}
            </div>
            <p className="text-[10px] text-gray-500">Simulated gains with zero real balance impact</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090A0C] border border-[#22262C] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Most Tested Playbook</span>
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-sm font-black text-indigo-300 truncate">
              {practiceStrategies.length > 0 ? practiceStrategies[0][0] : "No setup rehearsals yet"}
            </div>
            <p className="text-[10px] text-gray-500">
              {practiceStrategies.length > 0
                ? `${practiceStrategies[0][1].count} practice executions`
                : "Log practice trades to track drill setups"}
            </p>
          </div>
        </div>
      </div>

      {/* Goal Edit Modal */}
      {isEditingGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#121417] border border-[#2A2D31] rounded-2xl p-6 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" /> Configure Daily Desk Targets
              </h3>
              <button
                onClick={() => setIsEditingGoal(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Real Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>1. Real Capital Daily Desk Target ($ USD)</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Funded / Live Capital</span>
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={newRealGoalVal}
                  onChange={(e) => setNewRealGoalVal(e.target.value)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-xl px-3 py-2 text-white font-mono text-sm"
                  placeholder="2500"
                />
              </div>

              {/* Practice Reps Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>2. Practice Daily Drill Target (Total Reps)</span>
                  <span className="text-[10px] text-sky-400 font-bold">Execution Drills</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newPracticeRepsVal}
                  onChange={(e) => setNewPracticeRepsVal(e.target.value)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-xl px-3 py-2 text-white font-mono text-sm"
                  placeholder="15"
                />
                <p className="text-[10px] text-gray-500">
                  Target number of practice simulated executions for members to drill setups.
                </p>
              </div>

              {/* Practice P&L Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>3. Practice Simulated Profit Target ($ USD)</span>
                  <span className="text-[10px] text-sky-400 font-bold">Sim P&L Benchmark</span>
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={newPracticePnlVal}
                  onChange={(e) => setNewPracticePnlVal(e.target.value)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-xl px-3 py-2 text-white font-mono text-sm"
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-[#2A2D31]">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="px-3.5 py-1.5 bg-[#1E2023] hover:bg-[#24272C] text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl cursor-pointer transition shadow-md"
              >
                Save Desk Goals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Win Streak & Bounty Roster with Practice Reps Badges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-black text-white">Live Win-Streak & Bounty Roster</h3>
          </div>
          <span className="text-xs text-gray-400">
            {goalMode === "practice_only" ? "Ranked by Practice Drill Reps" : "Ranked by active win streak & daily P&L"}
          </span>
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

                {/* Account Type Contribution Bar for Trader */}
                <div className="pt-2 border-t border-[#2A2D31]/60 flex items-center justify-between flex-wrap gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Practice Reps Badge */}
                    {(trader.practiceTradesToday || 0) > 0 && (
                      <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <FlaskConical className="w-2.5 h-2.5 text-sky-400" />
                        <span>{trader.practiceTradesToday} Practice Reps</span>
                      </span>
                    )}

                    {/* Funded Badge */}
                    {(trader.fundedTradesToday || 0) > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        {trader.fundedTradesToday} Funded
                      </span>
                    )}

                    {/* Eval Badge */}
                    {(trader.evalTradesToday || 0) > 0 && (
                      <span className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                        {trader.evalTradesToday} Eval
                      </span>
                    )}
                  </div>

                  {trader.bountyBadge && (
                    <span className="font-bold bg-zinc-900 border border-zinc-700/60 px-2 py-0.5 rounded-lg text-amber-300 text-[10px]">
                      {trader.bountyBadge}
                    </span>
                  )}
                </div>

                {/* Action Link */}
                <div className="mt-2.5 pt-2 border-t border-[#2A2D31]/30 flex items-center justify-end">
                  <button
                    onClick={() => onOpenFlexModal?.()}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  >
                    Flex Card &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
