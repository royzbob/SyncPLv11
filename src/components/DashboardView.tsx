import React, { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarRange,
  CalendarDays,
  Percent,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Banknote,
  ArrowRight,
  Layers,
  Crown,
  Sparkles,
  User,
  Users,
  ShieldAlert,
  Share2,
  PlusCircle,
  Activity,
  Award,
  Flame,
  CheckCircle2,
  Target,
  Trophy,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { PnlLog, PayoutRecord, AccountType, UserProfile } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

interface DashboardViewProps {
  pnlLogs: PnlLog[];
  userId: string;
  userProfile?: UserProfile | null;
  traders?: UserProfile[];
  roomName?: string;
  roomCode?: string;
  initialMode?: "personal" | "group";
  payouts?: PayoutRecord[];
  onSwitchTab?: (tab: string) => void;
  isPremium?: boolean;
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
  onOpenTiltGuardModal?: () => void;
  onOpenFlexModal?: () => void;
  onOpenLogModal?: () => void;
}

export default function DashboardView({
  pnlLogs,
  userId,
  userProfile,
  traders = [],
  roomName = "Trading Desk",
  roomCode = "ROOM",
  initialMode = "personal",
  payouts = [],
  onSwitchTab,
  isPremium = false,
  onOpenUpgradeModal,
  onOpenTiltGuardModal,
  onOpenFlexModal,
  onOpenLogModal,
}: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<"personal" | "group">(initialMode);
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");

  // Sync initialMode if prop changes
  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Filter logs by selected account type if specified
  const filteredRoomLogs = useMemo(() => {
    if (accountFilter === "all") return pnlLogs;
    return pnlLogs.filter((l) => (l.accountType || "funded") === accountFilter);
  }, [pnlLogs, accountFilter]);

  // 1. Calculate stats for current user
  const userLogs = useMemo(() => {
    return filteredRoomLogs.filter((l) => l.userId === userId);
  }, [filteredRoomLogs, userId]);

  // 2. Individual Trader Performance Stats
  const personalStats = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Find Monday of current week
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mondayStr = getLocalDateString(new Date(d.setDate(diff)));

    const currentYearMonth = todayStr.substring(0, 7); // e.g. "2026-08"

    let dailySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let winsCount = 0;
    let lossesCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    userLogs.forEach((log) => {
      const amount = log.amount;
      if (amount > 0) {
        winsCount++;
        grossProfit += amount;
        if (amount > bestTrade) bestTrade = amount;
      } else if (amount < 0) {
        lossesCount++;
        grossLoss += Math.abs(amount);
        if (amount < worstTrade) worstTrade = amount;
      }

      if (log.date === todayStr) dailySum += amount;
      if (log.date >= mondayStr) weeklySum += amount;
      if (log.date.startsWith(currentYearMonth)) monthlySum += amount;
    });

    const totalTrades = userLogs.length;
    const winRate = totalTrades > 0 ? Math.round((winsCount / totalTrades) * 100) : 0;
    const avgWin = winsCount > 0 ? grossProfit / winsCount : 0;
    const avgLoss = lossesCount > 0 ? grossLoss / lossesCount : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    const todayTrades = userLogs.filter((l) => l.date === todayStr);

    return {
      dailySum,
      weeklySum,
      monthlySum,
      winRate,
      totalTrades,
      winsCount,
      lossesCount,
      todayTradesCount: todayTrades.length,
      todayStr,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
    };
  }, [userLogs]);

  // 3. Collective Desk Group Performance Stats
  const groupStats = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mondayStr = getLocalDateString(new Date(d.setDate(diff)));

    const currentYearMonth = todayStr.substring(0, 7);

    let dailySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let winsCount = 0;
    let totalTrades = filteredRoomLogs.length;

    const activeTradersTodaySet = new Set<string>();
    const traderDailyPnLMap: Record<string, { username: string; pnl: number }> = {};

    filteredRoomLogs.forEach((log) => {
      const amount = log.amount;
      if (amount >= 0) winsCount++;

      if (log.date === todayStr) {
        dailySum += amount;
        activeTradersTodaySet.add(log.userId);
        if (!traderDailyPnLMap[log.userId]) {
          traderDailyPnLMap[log.userId] = { username: log.username, pnl: 0 };
        }
        traderDailyPnLMap[log.userId].pnl += amount;
      }
      if (log.date >= mondayStr) weeklySum += amount;
      if (log.date.startsWith(currentYearMonth)) monthlySum += amount;
    });

    const winRate = totalTrades > 0 ? Math.round((winsCount / totalTrades) * 100) : 0;

    // Find top trader today
    const sortedTodayTraders = Object.values(traderDailyPnLMap).sort((a, b) => b.pnl - a.pnl);
    const topTraderToday = sortedTodayTraders[0] || null;

    return {
      dailySum,
      weeklySum,
      monthlySum,
      winRate,
      totalTrades,
      activeTradersCount: activeTradersTodaySet.size,
      topTraderToday,
      todayStr,
    };
  }, [filteredRoomLogs]);

  // 4. Heatmap Calendar Grid for Selected Month
  const [calDate, setCalDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const handlePrevMonth = () => {
    setCalDate((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      return { year: y, month: m };
    });
  };

  const handleNextMonth = () => {
    setCalDate((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCalDate({ year: now.getFullYear(), month: now.getMonth() });
  };

  // Compute Heatmap based on active viewMode (personal vs group)
  const heatmapDays = useMemo(() => {
    const year = calDate.year;
    const month = calDate.month;

    const firstDay = new Date(year, month, 1);
    let startDayIndex = firstDay.getDay();
    startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1; // Mon=0, Sun=6

    const totalDays = new Date(year, month + 1, 0).getDate();

    // Determine target dataset based on viewMode
    const targetLogs = viewMode === "personal" ? userLogs : filteredRoomLogs;

    const dailyPnLMap: Record<number, number> = {};
    const dailyTradesMap: Record<number, number> = {};

    targetLogs.forEach((log) => {
      if (!log.date) return;
      const parts = log.date.split("-");
      if (parts.length !== 3) return;
      const ly = parseInt(parts[0], 10);
      const lm = parseInt(parts[1], 10) - 1;
      const ld = parseInt(parts[2], 10);

      if (ly === year && lm === month) {
        dailyPnLMap[ld] = (dailyPnLMap[ld] || 0) + log.amount;
        dailyTradesMap[ld] = (dailyTradesMap[ld] || 0) + 1;
      }
    });

    // Count green and red days this month
    let greenDaysCount = 0;
    let redDaysCount = 0;
    let monthTotal = 0;

    Object.values(dailyPnLMap).forEach((val) => {
      monthTotal += val;
      if (val > 0) greenDaysCount++;
      else if (val < 0) redDaysCount++;
    });

    const tempDate = new Date(year, month, 1);

    return {
      startDayIndex,
      totalDays,
      dailyPnLMap,
      dailyTradesMap,
      greenDaysCount,
      redDaysCount,
      monthTotal,
      monthName: tempDate.toLocaleString("default", { month: "long" }),
      year,
      month,
    };
  }, [viewMode, userLogs, filteredRoomLogs, calDate]);

  // 5. Personal Strategy Aggregates
  const personalStrategyStats = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    userLogs.forEach((log) => {
      const strat = log.strategy || "Standard Execution";
      if (!map[strat]) map[strat] = { wins: 0, total: 0, pnl: 0 };
      map[strat].total++;
      map[strat].pnl += log.amount;
      if (log.amount >= 0) map[strat].wins++;
    });

    return Object.keys(map)
      .map((strat) => {
        const data = map[strat];
        const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
        return {
          strategy: strat,
          total: data.total,
          winRate: wr,
          pnl: data.pnl,
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [userLogs]);

  // 6. Personal Cumulative Equity Curve Data
  const personalChartData = useMemo(() => {
    const sortedLogs = [...userLogs].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    let runningEquity = 0;
    const dateMap: Record<string, number> = {};

    sortedLogs.forEach((log) => {
      runningEquity += log.amount;
      dateMap[log.date] = Number(runningEquity.toFixed(2));
    });

    const dates = Object.keys(dateMap).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return dates.map((date) => ({
      date,
      equity: dateMap[date],
    }));
  }, [userLogs]);

  // 7. Group Multi-Trader Cumulative Curve
  const groupChartData = useMemo(() => {
    const dates = (Array.from(new Set(filteredRoomLogs.map((l) => l.date))) as string[]).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const traderNames = Array.from(
      new Set(filteredRoomLogs.map((l) => l.username || "Trader"))
    ) as string[];

    const traderPnLMap: Record<string, number> = {};
    traderNames.forEach((t: string) => {
      traderPnLMap[t] = 0;
    });

    return dates.map((date: string) => {
      const point: Record<string, any> = { date };

      filteredRoomLogs
        .filter((l) => l.date === date)
        .forEach((log) => {
          const tname = log.username || "Trader";
          traderPnLMap[tname] = (traderPnLMap[tname] || 0) + log.amount;
        });

      traderNames.forEach((t: string) => {
        point[t] = Number(traderPnLMap[t].toFixed(2));
      });

      return point;
    });
  }, [filteredRoomLogs]);

  const uniqueTradersInLogs = useMemo(() => {
    return Array.from(new Set(filteredRoomLogs.map((l) => l.username || "Trader"))) as string[];
  }, [filteredRoomLogs]);

  // 8. Desk Traders Leaderboard & Contribution Roster
  const deskTradersRoster = useMemo(() => {
    const map: Record<
      string,
      { username: string; totalPnl: number; tradesCount: number; winsCount: number; todayPnl: number }
    > = {};

    filteredRoomLogs.forEach((log) => {
      const uid = log.userId;
      if (!map[uid]) {
        map[uid] = {
          username: log.username || "Trader",
          totalPnl: 0,
          tradesCount: 0,
          winsCount: 0,
          todayPnl: 0,
        };
      }
      map[uid].totalPnl += log.amount;
      map[uid].tradesCount++;
      if (log.amount >= 0) map[uid].winsCount++;
      if (log.date === getLocalDateString(new Date())) {
        map[uid].todayPnl += log.amount;
      }
    });

    return Object.entries(map)
      .map(([uid, val]) => ({
        userId: uid,
        username: val.username,
        totalPnl: val.totalPnl,
        tradesCount: val.tradesCount,
        winRate: val.tradesCount > 0 ? Math.round((val.winsCount / val.tradesCount) * 100) : 0,
        todayPnl: val.todayPnl,
        isCurrentUser: uid === userId,
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [filteredRoomLogs, userId]);

  const lineColors = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#3b82f6",
    "#14b8a6",
    "#f97316",
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full text-[#DCDDDE] bg-[#0E1013] font-sans pb-16">
      {/* Top Header & View Switcher Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#14171B] p-3 rounded-2xl border border-[#262A30] shadow-md">
        {/* Mode Segmented Toggle Switch */}
        <div className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C] w-full md:w-auto">
          <button
            id="btn-switch-personal-dashboard"
            onClick={() => setViewMode("personal")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "personal"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" />
            <span className="tracking-wide">My Individual Dashboard</span>
          </button>

          <button
            id="btn-switch-group-dashboard"
            onClick={() => setViewMode("group")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "group"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="tracking-wide">Desk Group Dashboard</span>
            <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-black">
              ROOM
            </span>
          </button>
        </div>

        {/* Right Controls: Account Filter & Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Account Filter Pill */}
          <div className="flex items-center gap-1 bg-[#090A0C] p-1 rounded-xl border border-[#22262C]">
            <Layers className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
            <span className="text-[10px] font-bold text-gray-400 uppercase hidden sm:inline mr-1">
              Account:
            </span>
            <button
              onClick={() => setAccountFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                accountFilter === "all"
                  ? "bg-white/15 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All
            </button>
            {(
              [
                { id: "funded", label: "Funded", clr: "text-emerald-400" },
                { id: "live", label: "Live", clr: "text-indigo-400" },
                { id: "eval", label: "Eval", clr: "text-amber-400" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setAccountFilter(t.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
                  accountFilter === t.id
                    ? `bg-white/15 ${t.clr}`
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onOpenLogModal && (
              <button
                onClick={onOpenLogModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Log a new trade"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Trade</span>
              </button>
            )}

            {onOpenTiltGuardModal && (
              <button
                onClick={onOpenTiltGuardModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Open Tilt Guard & Max Loss Protector"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tilt Guard</span>
              </button>
            )}

            {onOpenFlexModal && (
              <button
                onClick={onOpenFlexModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Generate Social P&L Flex Card"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flex Card</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode Clarification Header Card */}
      {viewMode === "personal" ? (
        <div className="bg-gradient-to-r from-indigo-950/40 via-[#151921] to-[#121417] p-4 rounded-2xl border border-indigo-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 font-black text-base shadow-inner">
              {userProfile?.avatarType === "url" && userProfile.avatarVal ? (
                <img
                  src={userProfile.avatarVal}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : userProfile?.avatarVal ? (
                <span className="text-lg">{userProfile.avatarVal}</span>
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                  Personal Trader Workspace
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {userProfile?.username || "You"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  • {personalStats.totalTrades} Setups in Ledger
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                My Individual Trading Performance
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                This view calculates <strong className="text-indigo-300">only your personal trades</strong>. All win rates, profit curves, and calendar habit chains reflect your individual execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="text-right bg-[#090A0C]/80 px-3 py-1.5 rounded-xl border border-[#22262C]">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Personal P&L</span>
              <span
                className={`text-sm font-black ${
                  personalStats.monthlySum >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(personalStats.monthlySum)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#151F1C] to-[#121417] p-4 rounded-2xl border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-black text-base shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                  Collective Desk Workspace
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {roomName}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  • #{roomCode} • {traders.length || uniqueTradersInLogs.length || 1} Traders
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Trading Desk Group Overview
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                This view aggregates the <strong className="text-emerald-300">combined performance of all traders</strong> inside this active room. Compare equity curves and sync collective milestones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="text-right bg-[#090A0C]/80 px-3 py-1.5 rounded-xl border border-[#22262C]">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Desk Total Pool</span>
              <span
                className={`text-sm font-black ${
                  groupStats.monthlySum >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(groupStats.monthlySum)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Free Tier Upgrade CTA Banner */}
      {!isPremium && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#191C20] to-[#121417] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Crown className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Upgrade to SyncPL Pro ($25/mo)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                  1st Month Free
                </span>
              </div>
              <p className="text-[11px] text-[#8E9297] mt-0.5">
                Unlock unlimited trade ledger records, instant AI voice analysis, and custom desk glow skins.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenUpgradeModal?.("general")}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Unlock Pro Access</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👤 VIEW 1: MY INDIVIDUAL DASHBOARD */}
      {/* ========================================================================= */}
      {viewMode === "personal" && (
        <>
          {/* Primary 4 Hero Metric Cards (Individual) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Stat 1: Today's Personal P&L */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  My Today's P&L
                </span>
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    personalStats.dailySum > 0
                      ? "text-emerald-400"
                      : personalStats.dailySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(personalStats.dailySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  {personalStats.todayTradesCount} trades logged today
                </p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      personalStats.dailySum >= 0 ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{ width: personalStats.dailySum !== 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 2: This Week's Personal P&L */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  My This Week
                </span>
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <CalendarRange className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    personalStats.weeklySum > 0
                      ? "text-emerald-400"
                      : personalStats.weeklySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(personalStats.weeklySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Weekly personal aggregate</p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: personalStats.weeklySum >= 0 ? "75%" : "25%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 3: This Month's Personal P&L */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  My This Month
                </span>
                <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                  <CalendarDays className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    personalStats.monthlySum > 0
                      ? "text-emerald-400"
                      : personalStats.monthlySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(personalStats.monthlySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Monthly personal aggregate</p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full"
                    style={{ width: personalStats.monthlySum >= 0 ? "85%" : "15%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 4: Personal Win Rate */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  My Win Rate
                </span>
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <Percent className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    personalStats.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {personalStats.winRate}%
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  {personalStats.winsCount}W - {personalStats.lossesCount}L ({personalStats.totalTrades} total)
                </p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      personalStats.winRate >= 50 ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{ width: `${personalStats.winRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Personal Edge Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14171B] p-3.5 rounded-2xl border border-[#262A30]">
            <div className="p-2.5 rounded-xl bg-[#090A0C] border border-[#22262C]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Profit Factor
              </span>
              <span className="text-base font-black text-white mt-0.5 block">
                {personalStats.profitFactor >= 99 ? "∞" : personalStats.profitFactor.toFixed(2)} PF
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090A0C] border border-[#22262C]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Avg Win / Avg Loss
              </span>
              <span className="text-xs font-black text-emerald-400 mt-1 block truncate">
                +${Math.round(personalStats.avgWin)} <span className="text-gray-500">/</span>{" "}
                <span className="text-rose-400">-${Math.round(personalStats.avgLoss)}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090A0C] border border-[#22262C]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Best Trade Win
              </span>
              <span className="text-base font-black text-emerald-400 mt-0.5 block">
                +{formatCurrency(personalStats.bestTrade)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090A0C] border border-[#22262C]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Max Loss Trade
              </span>
              <span className="text-base font-black text-rose-400 mt-0.5 block">
                {personalStats.worstTrade !== 0 ? formatCurrency(personalStats.worstTrade) : "$0.00"}
              </span>
            </div>
          </div>

          {/* Personal Consistency Calendar */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Calendar className="text-indigo-400 w-4 h-4" />
                  My Personal Consistency Calendar ({heatmapDays.monthName} {heatmapDays.year})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualizing <strong className="text-indigo-300">your individual daily results</strong>. Green = profitable day, Red = loss day, Grey = flat/no trades.
                </p>
              </div>

              {/* Month Controls & Summary Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] font-bold bg-[#090A0C] px-3 py-1.5 rounded-xl border border-[#22262C]">
                  <span className="text-emerald-400">{heatmapDays.greenDaysCount} Green Days</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-rose-400">{heatmapDays.redDaysCount} Red Days</span>
                </div>

                <div className="flex items-center gap-1 bg-[#090A0C] border border-[#22262C] rounded-xl p-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-[#22262C] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCurrentMonth}
                    className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 hover:bg-[#22262C] rounded-lg transition uppercase cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-[#22262C] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto pb-1">
              <div className="grid grid-cols-7 gap-2 text-center min-w-[500px]">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                  <div key={day} className="text-[10px] font-black text-gray-500 tracking-wider py-1">
                    {day}
                  </div>
                ))}

                {Array.from({ length: heatmapDays.startDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-11 bg-transparent" />
                ))}

                {Array.from({ length: heatmapDays.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayPnL = heatmapDays.dailyPnLMap[dayNum];
                  const dayTrades = heatmapDays.dailyTradesMap[dayNum] || 0;

                  let cellClass = "bg-[#090A0C]/50 text-gray-600 border border-[#22262C]";
                  let textClass = "text-gray-400";
                  let amountLabel = "";

                  if (dayPnL !== undefined) {
                    if (dayPnL > 0) {
                      cellClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/30";
                      textClass = "text-emerald-300";
                      amountLabel = `+$${Math.round(dayPnL)}`;
                    } else if (dayPnL < 0) {
                      cellClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-950/30";
                      textClass = "text-rose-300";
                      amountLabel = `-$${Math.abs(Math.round(dayPnL))}`;
                    } else {
                      cellClass = "bg-[#22262C] text-gray-400 border border-[#22262C]";
                      textClass = "text-gray-400";
                      amountLabel = "Flat";
                    }
                  }

                  const now = new Date();
                  const isToday =
                    now.getDate() === dayNum &&
                    now.getMonth() === heatmapDays.month &&
                    now.getFullYear() === heatmapDays.year;

                  return (
                    <div
                      key={`personal-day-${dayNum}`}
                      className={`h-12 rounded-xl flex flex-col justify-center items-center select-none transition cursor-help ${cellClass} ${
                        isToday ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#14171B]" : ""
                      }`}
                      title={
                        dayPnL !== undefined
                          ? `My Net P&L: ${formatCurrency(dayPnL)} (${dayTrades} trades)`
                          : "No trades logged on this date"
                      }
                    >
                      <span className="text-[10px] font-black">{dayNum}</span>
                      {amountLabel && (
                        <span className={`text-[9px] font-black block truncate w-full px-1 text-center ${textClass}`}>
                          {amountLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cumulative Equity Curve & Strategy Playbook Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* My Cumulative Balance Curve */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] xl:col-span-2 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <TrendingUp className="text-indigo-400 w-4 h-4" /> My Cumulative Equity Growth
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Continuous balance trajectory across all your recorded trades
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-[#090A0C] border border-[#22262C] px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">
                    Personal Curve
                  </span>
                </div>
              </div>

              <div className="h-[270px] w-full">
                {personalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={personalChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="personalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090A0C",
                          borderColor: "#262A30",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        name="My Cumulative P&L"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#personalGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <BarChart2 className="w-10 h-10 text-gray-700 mb-2 animate-pulse" />
                    <p className="text-xs font-bold">No personal trades logged yet</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Log your first trade to generate your personal equity curve
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* My Strategy Win Rates */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between shadow-md">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2 mb-0.5">
                  <BarChart2 className="text-indigo-400 w-4 h-4" /> My Strategy Playbook
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Your win rate & net P&L grouped by technical setup
                </p>
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 max-h-[250px] pr-1">
                {personalStrategyStats.length > 0 ? (
                  personalStrategyStats.map((item) => (
                    <div
                      key={item.strategy}
                      className="p-3 bg-[#090A0C] border border-[#22262C] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-gray-200">{item.strategy}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {item.total} setups executed
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-black ${
                            item.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {item.winRate}% WR
                        </p>
                        <p
                          className={`text-xs font-bold mt-0.5 ${
                            item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(item.pnl)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500 italic text-xs">
                    Assign a strategy (e.g. Breakout, Scalp) when logging trades to compute setup stats
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 👥 VIEW 2: DESK GROUP DASHBOARD */}
      {/* ========================================================================= */}
      {viewMode === "group" && (
        <>
          {/* Primary 4 Hero Metric Cards (Collective Desk) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Stat 1: Desk Today's Pool P&L */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  Desk Today's Pool
                </span>
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    groupStats.dailySum > 0
                      ? "text-emerald-400"
                      : groupStats.dailySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(groupStats.dailySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  {groupStats.activeTradersCount} active traders today
                </p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      groupStats.dailySum >= 0 ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{ width: groupStats.dailySum !== 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 2: Desk This Week */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  Desk This Week
                </span>
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                  <CalendarRange className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    groupStats.weeklySum > 0
                      ? "text-emerald-400"
                      : groupStats.weeklySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(groupStats.weeklySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Collective room weekly total</p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: groupStats.weeklySum >= 0 ? "80%" : "20%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 3: Desk This Month */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  Desk This Month
                </span>
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <CalendarDays className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    groupStats.monthlySum > 0
                      ? "text-emerald-400"
                      : groupStats.monthlySum < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(groupStats.monthlySum)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">Collective room monthly total</p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: groupStats.monthlySum >= 0 ? "90%" : "10%" }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 4: Desk Combined Win Rate */}
            <div className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                  Desk Win Rate
                </span>
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <Percent className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${
                    groupStats.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {groupStats.winRate}%
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  Across {groupStats.totalTrades} room trades
                </p>
                <div className="w-full bg-[#08090A] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      groupStats.winRate >= 50 ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                    style={{ width: `${groupStats.winRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Collective Desk Consistency Calendar */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Calendar className="text-emerald-400 w-4 h-4" />
                  Collective Desk Consistency Calendar ({heatmapDays.monthName} {heatmapDays.year})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualizing the <strong className="text-emerald-300">aggregate team net P&L</strong> of all traders in this room.
                </p>
              </div>

              {/* Month Controls & Summary Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] font-bold bg-[#090A0C] px-3 py-1.5 rounded-xl border border-[#22262C]">
                  <span className="text-emerald-400">{heatmapDays.greenDaysCount} Desk Green Days</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-rose-400">{heatmapDays.redDaysCount} Desk Red Days</span>
                </div>

                <div className="flex items-center gap-1 bg-[#090A0C] border border-[#22262C] rounded-xl p-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-[#22262C] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCurrentMonth}
                    className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-[#22262C] rounded-lg transition uppercase cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-[#22262C] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto pb-1">
              <div className="grid grid-cols-7 gap-2 text-center min-w-[500px]">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                  <div key={day} className="text-[10px] font-black text-gray-500 tracking-wider py-1">
                    {day}
                  </div>
                ))}

                {Array.from({ length: heatmapDays.startDayIndex }).map((_, idx) => (
                  <div key={`group-empty-${idx}`} className="h-11 bg-transparent" />
                ))}

                {Array.from({ length: heatmapDays.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayPnL = heatmapDays.dailyPnLMap[dayNum];
                  const dayTrades = heatmapDays.dailyTradesMap[dayNum] || 0;

                  let cellClass = "bg-[#090A0C]/50 text-gray-600 border border-[#22262C]";
                  let textClass = "text-gray-400";
                  let amountLabel = "";

                  if (dayPnL !== undefined) {
                    if (dayPnL > 0) {
                      cellClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/30";
                      textClass = "text-emerald-300";
                      amountLabel = `+$${Math.round(dayPnL)}`;
                    } else if (dayPnL < 0) {
                      cellClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-950/30";
                      textClass = "text-rose-300";
                      amountLabel = `-$${Math.abs(Math.round(dayPnL))}`;
                    } else {
                      cellClass = "bg-[#22262C] text-gray-400 border border-[#22262C]";
                      textClass = "text-gray-400";
                      amountLabel = "Flat";
                    }
                  }

                  const now = new Date();
                  const isToday =
                    now.getDate() === dayNum &&
                    now.getMonth() === heatmapDays.month &&
                    now.getFullYear() === heatmapDays.year;

                  return (
                    <div
                      key={`group-day-${dayNum}`}
                      className={`h-12 rounded-xl flex flex-col justify-center items-center select-none transition cursor-help ${cellClass} ${
                        isToday ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-[#14171B]" : ""
                      }`}
                      title={
                        dayPnL !== undefined
                          ? `Desk Combined P&L: ${formatCurrency(dayPnL)} (${dayTrades} room trades)`
                          : "No desk trades reported on this date"
                      }
                    >
                      <span className="text-[10px] font-black">{dayNum}</span>
                      {amountLabel && (
                        <span className={`text-[9px] font-black block truncate w-full px-1 text-center ${textClass}`}>
                          {amountLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Group Multi-Trader Performance Curve & Desk Roster Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Multi-Trader Performance Race */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] xl:col-span-2 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <TrendingUp className="text-emerald-400 w-4 h-4" /> Multi-Trader Performance Race
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live cumulative equity comparison across all desk members
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-[#090A0C] border border-[#22262C] px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                    Live Room Sync
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full">
                {groupChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={groupChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090A0C",
                          borderColor: "#262A30",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      {uniqueTradersInLogs.map((trader, idx) => (
                        <Line
                          key={trader}
                          type="monotone"
                          dataKey={trader}
                          stroke={lineColors[idx % lineColors.length]}
                          strokeWidth={2.5}
                          dot={{ r: 2, strokeWidth: 1, stroke: "#090A0C" }}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <BarChart2 className="w-10 h-10 text-gray-700 mb-2 animate-pulse" />
                    <p className="text-xs font-bold">Waiting for Sync Ledger Records</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Trades logged by members will plot the group race curve here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Desk Top Contributors Roster */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <Trophy className="text-amber-400 w-4 h-4" /> Desk Contribution
                  </h3>
                  {onSwitchTab && (
                    <button
                      onClick={() => onSwitchTab("leaderboard")}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      View Full Board
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Trader rankings & volume inside this active room
                </p>
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 max-h-[250px] pr-1">
                {deskTradersRoster.length > 0 ? (
                  deskTradersRoster.map((trader, idx) => (
                    <div
                      key={trader.userId}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        trader.isCurrentUser
                          ? "bg-indigo-950/30 border-indigo-500/40"
                          : "bg-[#090A0C] border-[#22262C]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-gray-500 w-4">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <div>
                          <p className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{trader.username}</span>
                            {trader.isCurrentUser && (
                              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-bold">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {trader.tradesCount} trades • {trader.winRate}% WR
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-xs font-black ${
                            trader.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(trader.totalPnl)}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Today: {formatCurrency(trader.todayPnl)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500 italic text-xs">
                    No trades recorded in this desk yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Community Payout Tracker Summary Banner */}
      <div className="bg-gradient-to-r from-[#14171B] via-[#161F1B] to-[#14171B] border border-emerald-500/30 p-4 md:p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                Community Desk Payouts
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                {payouts.length} Recorded
              </span>
            </div>
            <h4 className="text-lg md:text-xl font-black text-white mt-0.5">
              {formatCurrency(payouts.reduce((acc, p) => acc + p.amount, 0))}{" "}
              <span className="text-xs text-gray-400 font-semibold">Total Verified Room Payouts</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {payouts.length > 0
                ? `Latest: $${payouts[0]?.amount.toLocaleString()} by ${payouts[0]?.username} (${payouts[0]?.propFirm || "Prop Firm"})`
                : "No payouts recorded yet in this room. Be the first to celebrate a funded payout!"}
            </p>
          </div>
        </div>

        {onSwitchTab && (
          <button
            onClick={() => onSwitchTab("payouts")}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer shrink-0"
          >
            <span>Open Payout Leaderboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
