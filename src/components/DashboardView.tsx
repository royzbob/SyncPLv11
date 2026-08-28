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
  BookOpen,
  ShieldCheck,
  Wallet,
  Cpu,
  SlidersHorizontal,
  Filter,
  Check,
  GraduationCap,
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

export type DashboardAccountFilter = "all" | "real_only" | AccountType;

export const accountTypeMeta: Record<
  AccountType,
  {
    label: string;
    shortLabel: string;
    badge: string;
    bg: string;
    text: string;
    border: string;
    ring: string;
    dotColor: string;
    desc: string;
    sublabel: string;
    accentColor: string;
  }
> = {
  funded: {
    label: "Funded Account",
    shortLabel: "Funded",
    badge: "Funded Prop",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/40",
    dotColor: "bg-emerald-400",
    desc: "Prop firm funded accounts (real payout eligibility)",
    sublabel: "Funded Capital",
    accentColor: "#10b981",
  },
  live: {
    label: "Live Brokerage",
    shortLabel: "Live",
    badge: "Direct Live",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    ring: "ring-indigo-500/40",
    dotColor: "bg-indigo-400",
    desc: "Personal cash/margin brokerage account",
    sublabel: "Personal Live Capital",
    accentColor: "#6366f1",
  },
  eval: {
    label: "Evaluation Challenge",
    shortLabel: "Eval",
    badge: "Challenge Phase",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    ring: "ring-amber-500/40",
    dotColor: "bg-amber-400",
    desc: "Prop firm evaluation / combine phase testing",
    sublabel: "Evaluation Target Phase",
    accentColor: "#f59e0b",
  },
  practice: {
    label: "Practice / Demo",
    shortLabel: "Practice (Sim)",
    badge: "Simulated Sandbox",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/30",
    ring: "ring-sky-500/40",
    dotColor: "bg-sky-400",
    desc: "Simulated paper trading sandbox & setup testing (zero capital risk)",
    sublabel: "Paper / Simulation",
    accentColor: "#38bdf8",
  },
};

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
  onOpenGuide?: () => void;
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
  onOpenGuide,
}: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<"personal" | "group">(initialMode);
  const [accountFilter, setAccountFilter] = useState<DashboardAccountFilter>("all");

  // Sync initialMode if prop changes
  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Filter logs by selected account type if specified
  const filteredRoomLogs = useMemo(() => {
    if (accountFilter === "all") return pnlLogs;
    if (accountFilter === "real_only") {
      return pnlLogs.filter((l) => (l.accountType || "funded") !== "practice");
    }
    return pnlLogs.filter((l) => (l.accountType || "funded") === accountFilter);
  }, [pnlLogs, accountFilter]);

  // Unfiltered base user logs for multi-account metrics
  const allUserLogs = useMemo(() => {
    return pnlLogs.filter((l) => l.userId === userId);
  }, [pnlLogs, userId]);

  // 1. Calculate stats for current user under active filter
  const userLogs = useMemo(() => {
    return filteredRoomLogs.filter((l) => l.userId === userId);
  }, [filteredRoomLogs, userId]);

  // Account Counts for quick badges
  const accountCounts = useMemo(() => {
    const targetBase = viewMode === "personal" ? allUserLogs : pnlLogs;
    const funded = targetBase.filter((l) => (l.accountType || "funded") === "funded").length;
    const live = targetBase.filter((l) => l.accountType === "live").length;
    const evalCount = targetBase.filter((l) => l.accountType === "eval").length;
    const practice = targetBase.filter((l) => l.accountType === "practice").length;
    const realOnly = targetBase.filter((l) => (l.accountType || "funded") !== "practice").length;

    return {
      all: targetBase.length,
      real_only: realOnly,
      funded,
      live,
      eval: evalCount,
      practice,
    };
  }, [viewMode, allUserLogs, pnlLogs]);

  // Account Performance Breakdown Matrix (Individual Trader)
  const personalAccountBreakdown = useMemo(() => {
    const totalBase = allUserLogs.length;
    const types: AccountType[] = ["funded", "eval", "live", "practice"];

    return types.map((accType) => {
      const logsForType = allUserLogs.filter((l) => (l.accountType || "funded") === accType);
      let net = 0;
      let wins = 0;
      let losses = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let best = 0;
      let worst = 0;

      logsForType.forEach((l) => {
        const amt = l.amount;
        net += amt;
        if (amt > 0) {
          wins++;
          grossProfit += amt;
          if (amt > best) best = amt;
        } else if (amt < 0) {
          losses++;
          grossLoss += Math.abs(amt);
          if (amt < worst) worst = amt;
        }
      });

      const total = logsForType.length;
      const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
      const avg = total > 0 ? net / total : 0;
      const volPct = totalBase > 0 ? Math.round((total / totalBase) * 100) : 0;

      return {
        type: accType,
        meta: accountTypeMeta[accType],
        total,
        wins,
        losses,
        winRate: wr,
        netPnl: net,
        profitFactor: pf,
        avgTrade: avg,
        bestTrade: best,
        worstTrade: worst,
        volumePct: volPct,
        isActive: accountFilter === accType,
      };
    });
  }, [allUserLogs, accountFilter]);

  // Account Performance Breakdown Matrix (Desk Group)
  const groupAccountBreakdown = useMemo(() => {
    const totalBase = pnlLogs.length;
    const types: AccountType[] = ["funded", "eval", "live", "practice"];

    return types.map((accType) => {
      const logsForType = pnlLogs.filter((l) => (l.accountType || "funded") === accType);
      let net = 0;
      let wins = 0;
      let losses = 0;

      logsForType.forEach((l) => {
        const amt = l.amount;
        net += amt;
        if (amt >= 0) wins++;
        else losses++;
      });

      const total = logsForType.length;
      const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
      const volPct = totalBase > 0 ? Math.round((total / totalBase) * 100) : 0;

      return {
        type: accType,
        meta: accountTypeMeta[accType],
        total,
        wins,
        losses,
        winRate: wr,
        netPnl: net,
        volumePct: volPct,
        isActive: accountFilter === accType,
      };
    });
  }, [pnlLogs, accountFilter]);

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
    const dailyAccountMap: Record<number, Record<AccountType, number>> = {};

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

        const accType = log.accountType || "funded";
        if (!dailyAccountMap[ld]) {
          dailyAccountMap[ld] = { funded: 0, eval: 0, live: 0, practice: 0 };
        }
        dailyAccountMap[ld][accType] = (dailyAccountMap[ld][accType] || 0) + 1;
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
      dailyAccountMap,
      greenDaysCount,
      redDaysCount,
      monthTotal,
      monthName: tempDate.toLocaleString("default", { month: "long" }),
      year,
      month,
    };
  }, [viewMode, userLogs, filteredRoomLogs, calDate]);

  // 5. Personal Strategy Aggregates with Account Type distribution
  const personalStrategyStats = useMemo(() => {
    const map: Record<
      string,
      {
        wins: number;
        total: number;
        pnl: number;
        accounts: Record<AccountType, number>;
      }
    > = {};

    userLogs.forEach((log) => {
      const strat = log.strategy || "Standard Execution";
      const acc = log.accountType || "funded";
      if (!map[strat]) {
        map[strat] = {
          wins: 0,
          total: 0,
          pnl: 0,
          accounts: { funded: 0, eval: 0, live: 0, practice: 0 },
        };
      }
      map[strat].total++;
      map[strat].pnl += log.amount;
      map[strat].accounts[acc] = (map[strat].accounts[acc] || 0) + 1;
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
          accounts: data.accounts,
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [userLogs]);

  // 6. Personal Cumulative Equity Curve Data
  const personalChartData = useMemo(() => {
    const sortedLogs = [...userLogs].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
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
      <div id="dashboard-header-toolbar" className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#14171B] p-3 rounded-2xl border border-[#262A30] shadow-md">
        {/* Mode Segmented Toggle Switch */}
        <div id="dashboard-view-mode-toggle" className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C] w-full md:w-auto">
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
          {/* Account Filter Pill Selector */}
          <div id="dashboard-account-filters" className="flex items-center gap-1 bg-[#090A0C] p-1 rounded-xl border border-[#22262C] flex-wrap">
            <div className="flex items-center gap-1 pl-1.5 pr-1 text-gray-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase hidden sm:inline tracking-wider">
                Filter:
              </span>
            </div>

            <button
              id="filter-acc-all"
              onClick={() => setAccountFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                accountFilter === "all"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>All Types</span>
              <span className="text-[9px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono text-gray-300">
                {accountCounts.all}
              </span>
            </button>

            <button
              id="filter-acc-real-only"
              onClick={() => setAccountFilter("real_only")}
              className={`px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                accountFilter === "real_only"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5"
              }`}
              title="Exclude simulated practice demo trades"
            >
              <span>Real / Funded</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono">
                {accountCounts.real_only}
              </span>
            </button>

            {(
              [
                { id: "funded", label: "Funded", count: accountCounts.funded, clr: "text-emerald-400", activeBg: "bg-emerald-500/20 border-emerald-500/40" },
                { id: "eval", label: "Eval", count: accountCounts.eval, clr: "text-amber-400", activeBg: "bg-amber-500/20 border-amber-500/40" },
                { id: "live", label: "Live", count: accountCounts.live, clr: "text-indigo-400", activeBg: "bg-indigo-500/20 border-indigo-500/40" },
                { id: "practice", label: "Practice", count: accountCounts.practice, clr: "text-sky-400", activeBg: "bg-sky-500/20 border-sky-500/40" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                id={`filter-acc-${t.id}`}
                onClick={() => setAccountFilter(t.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer flex items-center gap-1 border border-transparent ${
                  accountFilter === t.id
                    ? `${t.activeBg} ${t.clr} border`
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <span className={t.clr}>{t.label}</span>
                <span className="text-[9px] bg-black/40 px-1 py-0.2 rounded-full font-mono text-gray-300">
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div id="dashboard-quick-actions" className="flex items-center gap-1.5">
            {onOpenLogModal && (
              <button
                id="btn-dashboard-log-trade"
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
                id="btn-dashboard-tilt-guard"
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
                id="btn-dashboard-flex"
                onClick={onOpenFlexModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Generate Social P&L Flex Card"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flex Card</span>
              </button>
            )}

            {onSwitchTab && (
              <button
                id="btn-dashboard-academy"
                onClick={() => onSwitchTab("academy")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                title="Open Fast-Track Trading Course: Zero to First Profit"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Starter Course</span>
              </button>
            )}

            {onOpenGuide && (
              <button
                id="btn-dashboard-quick-guide"
                onClick={onOpenGuide}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Open Quick Getting Started Guide"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Quick Guide</span>
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

      {/* Fast-Track Trading Academy Banner for Beginners & Next-Gen Traders */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#161920] to-[#121417] border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-black text-base shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                SyncPL Starter Academy
              </span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                5 Fast-Track Modules 🚀
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
              Zero to Your First $100+ Profit: Fast-Track Trading Course
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Master 15m trend pullbacks, 1:2 R:R math, prop firm combine rules, and interactive trade simulation drills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab("academy")}
              className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Launch Course & Sim Drills</span>
            </button>
          )}
        </div>
      </div>

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
          <div id="dashboard-hero-metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

          {/* 🌟 ACCOUNT TYPE DIFFERENTIATION MATRIX (Funded / Live / Eval / Practice) */}
          <div id="dashboard-account-breakdown-matrix" className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-black text-white text-base">
                    Account Type Performance Matrix
                  </h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Live vs Eval vs Practice
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Differentiate your trading execution across <strong>Funded accounts</strong>, <strong>Eval challenges</strong>, <strong>Live brokerages</strong>, and <strong>Practice demo simulations</strong>.
                </p>
              </div>

              {accountFilter !== "all" && (
                <button
                  onClick={() => setAccountFilter("all")}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 cursor-pointer"
                >
                  <span>Reset Filter (Showing {accountFilter})</span>
                </button>
              )}
            </div>

            {/* 4 Cards Grid for Account Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {personalAccountBreakdown.map((acc) => {
                const isSelected = accountFilter === acc.type;
                return (
                  <div
                    key={acc.type}
                    id={`card-acc-${acc.type}`}
                    onClick={() => setAccountFilter(isSelected ? "all" : acc.type)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${acc.meta.bg} ${acc.meta.border} ring-2 ${acc.meta.ring} shadow-lg`
                        : "bg-[#090A0C] border-[#22262C] hover:border-gray-600/60 hover:bg-[#101216]"
                    }`}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${acc.meta.dotColor} shrink-0`} />
                          <span className={`text-xs font-black uppercase tracking-wider ${acc.meta.text}`}>
                            {acc.meta.shortLabel}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${acc.meta.bg} ${acc.meta.text} ${acc.meta.border}`}
                        >
                          {acc.meta.badge}
                        </span>
                      </div>

                      {/* Net P&L */}
                      <div className="my-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                          Net P&L
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span
                            className={`text-xl font-black ${
                              acc.netPnl > 0
                                ? "text-emerald-400"
                                : acc.netPnl < 0
                                ? "text-rose-400"
                                : "text-gray-300"
                            }`}
                          >
                            {formatCurrency(acc.netPnl)}
                          </span>
                          {acc.type === "practice" && (
                            <span className="text-[9px] text-sky-400 font-bold bg-sky-500/10 px-1 py-0.2 rounded">
                              Sim
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#22262C] text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Win Rate</span>
                          <span
                            className={`font-black ${
                              acc.winRate >= 50 ? "text-emerald-400" : acc.total > 0 ? "text-rose-400" : "text-gray-400"
                            }`}
                          >
                            {acc.total > 0 ? `${acc.winRate}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Total Volume</span>
                          <span className="font-bold text-gray-300">
                            {acc.total} trades ({acc.volumePct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Quick Filter Action */}
                    <div className="mt-3 pt-2.5 border-t border-[#22262C] flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                        {acc.wins}W - {acc.losses}L
                      </span>
                      <span
                        className={`text-[10px] font-black flex items-center gap-1 ${
                          isSelected ? acc.meta.text : "text-gray-400 group-hover:text-white"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Active Filter</span>
                          </>
                        ) : (
                          <span>Filter &rarr;</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal Consistency Calendar */}
          <div id="dashboard-consistency-calendar" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Calendar className="text-indigo-400 w-4 h-4" />
                  My Personal Consistency Calendar ({heatmapDays.monthName} {heatmapDays.year})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualizing <strong className="text-indigo-300">your individual daily results</strong> with colored dots distinguishing account types traded.
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
                  <div key={`empty-${idx}`} className="h-14 bg-transparent" />
                ))}

                {Array.from({ length: heatmapDays.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayPnL = heatmapDays.dailyPnLMap[dayNum];
                  const dayTrades = heatmapDays.dailyTradesMap[dayNum] || 0;
                  const dayAccs = heatmapDays.dailyAccountMap[dayNum] || { funded: 0, eval: 0, live: 0, practice: 0 };

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
                      className={`h-14 rounded-xl flex flex-col justify-between p-1.5 select-none transition cursor-help relative ${cellClass} ${
                        isToday ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#14171B]" : ""
                      }`}
                      title={
                        dayPnL !== undefined
                          ? `My Net P&L: ${formatCurrency(dayPnL)} (${dayTrades} trades)\n• Funded: ${dayAccs.funded}\n• Eval: ${dayAccs.eval}\n• Live: ${dayAccs.live}\n• Practice: ${dayAccs.practice}`
                          : "No trades logged on this date"
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black">{dayNum}</span>
                        {/* Mini Account Type Indicator Dots */}
                        {dayTrades > 0 && (
                          <div className="flex items-center gap-0.5">
                            {dayAccs.funded > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`Funded: ${dayAccs.funded}`} />
                            )}
                            {dayAccs.eval > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`Eval: ${dayAccs.eval}`} />
                            )}
                            {dayAccs.live > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title={`Live: ${dayAccs.live}`} />
                            )}
                            {dayAccs.practice > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title={`Practice: ${dayAccs.practice}`} />
                            )}
                          </div>
                        )}
                      </div>

                      {amountLabel && (
                        <span className={`text-[9px] font-black block truncate w-full text-center ${textClass}`}>
                          {amountLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Dot Legend */}
            <div className="mt-3 pt-3 border-t border-[#22262C] flex items-center justify-between flex-wrap gap-2 text-[10px] text-gray-400">
              <span className="font-bold text-gray-500 uppercase tracking-wider">Account Dots:</span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <strong className="text-emerald-300">Funded</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <strong className="text-amber-300">Eval</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <strong className="text-indigo-300">Live</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <strong className="text-sky-300">Practice (Sim)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cumulative Equity Curve & Strategy Playbook Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* My Cumulative Balance Curve */}
            <div id="dashboard-equity-chart" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] xl:col-span-2 flex flex-col justify-between shadow-md">
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
            <div id="dashboard-strategy-playbook" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between shadow-md">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2 mb-0.5">
                  <BarChart2 className="text-indigo-400 w-4 h-4" /> My Strategy Playbook
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Your win rate & net P&L grouped by setup and account type
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
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-500">
                            {item.total} setups
                          </span>
                          {/* Mini Account Distribution Pills */}
                          {item.accounts.funded > 0 && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                              {item.accounts.funded} Funded
                            </span>
                          )}
                          {item.accounts.eval > 0 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded font-bold">
                              {item.accounts.eval} Eval
                            </span>
                          )}
                          {item.accounts.live > 0 && (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded font-bold">
                              {item.accounts.live} Live
                            </span>
                          )}
                          {item.accounts.practice > 0 && (
                            <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded font-bold">
                              {item.accounts.practice} Sim
                            </span>
                          )}
                        </div>
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
          <div id="group-dashboard-hero-metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

          {/* 🌟 GROUP ACCOUNT TYPE BREAKDOWN MATRIX */}
          <div id="group-account-breakdown-matrix" className="bg-[#14171B] p-4 md:p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-black text-white text-base">
                    Desk Collective Account Matrix
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Room Pool Breakdown
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Performance across all desk traders segregated by <strong>Funded</strong>, <strong>Eval</strong>, <strong>Live</strong>, and <strong>Practice</strong>.
                </p>
              </div>

              {accountFilter !== "all" && (
                <button
                  onClick={() => setAccountFilter("all")}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 cursor-pointer"
                >
                  <span>Reset Filter (Showing {accountFilter})</span>
                </button>
              )}
            </div>

            {/* 4 Cards Grid for Group Account Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {groupAccountBreakdown.map((acc) => {
                const isSelected = accountFilter === acc.type;
                return (
                  <div
                    key={`group-acc-${acc.type}`}
                    id={`group-card-acc-${acc.type}`}
                    onClick={() => setAccountFilter(isSelected ? "all" : acc.type)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${acc.meta.bg} ${acc.meta.border} ring-2 ${acc.meta.ring} shadow-lg`
                        : "bg-[#090A0C] border-[#22262C] hover:border-gray-600/60 hover:bg-[#101216]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${acc.meta.dotColor} shrink-0`} />
                          <span className={`text-xs font-black uppercase tracking-wider ${acc.meta.text}`}>
                            {acc.meta.shortLabel}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${acc.meta.bg} ${acc.meta.text} ${acc.meta.border}`}
                        >
                          {acc.meta.badge}
                        </span>
                      </div>

                      <div className="my-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                          Desk Net P&L
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span
                            className={`text-xl font-black ${
                              acc.netPnl > 0
                                ? "text-emerald-400"
                                : acc.netPnl < 0
                                ? "text-rose-400"
                                : "text-gray-300"
                            }`}
                          >
                            {formatCurrency(acc.netPnl)}
                          </span>
                          {acc.type === "practice" && (
                            <span className="text-[9px] text-sky-400 font-bold bg-sky-500/10 px-1 py-0.2 rounded">
                              Sim
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#22262C] text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Win Rate</span>
                          <span
                            className={`font-black ${
                              acc.winRate >= 50 ? "text-emerald-400" : acc.total > 0 ? "text-rose-400" : "text-gray-400"
                            }`}
                          >
                            {acc.total > 0 ? `${acc.winRate}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Desk Volume</span>
                          <span className="font-bold text-gray-300">
                            {acc.total} trades ({acc.volumePct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#22262C] flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 truncate">
                        {acc.wins}W - {acc.losses}L
                      </span>
                      <span
                        className={`text-[10px] font-black flex items-center gap-1 ${
                          isSelected ? acc.meta.text : "text-gray-400 group-hover:text-white"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <span>Filter &rarr;</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collective Desk Consistency Calendar */}
          <div id="group-dashboard-consistency-calendar" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Calendar className="text-emerald-400 w-4 h-4" />
                  Collective Desk Consistency Calendar ({heatmapDays.monthName} {heatmapDays.year})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualizing the <strong className="text-emerald-300">aggregate team net P&L</strong> with account type indicator dots.
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
                  <div key={`group-empty-${idx}`} className="h-14 bg-transparent" />
                ))}

                {Array.from({ length: heatmapDays.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayPnL = heatmapDays.dailyPnLMap[dayNum];
                  const dayTrades = heatmapDays.dailyTradesMap[dayNum] || 0;
                  const dayAccs = heatmapDays.dailyAccountMap[dayNum] || { funded: 0, eval: 0, live: 0, practice: 0 };

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
                      className={`h-14 rounded-xl flex flex-col justify-between p-1.5 select-none transition cursor-help relative ${cellClass} ${
                        isToday ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-[#14171B]" : ""
                      }`}
                      title={
                        dayPnL !== undefined
                          ? `Desk Combined P&L: ${formatCurrency(dayPnL)} (${dayTrades} room trades)\n• Funded: ${dayAccs.funded}\n• Eval: ${dayAccs.eval}\n• Live: ${dayAccs.live}\n• Practice: ${dayAccs.practice}`
                          : "No desk trades reported on this date"
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black">{dayNum}</span>
                        {/* Mini Account Indicator Dots */}
                        {dayTrades > 0 && (
                          <div className="flex items-center gap-0.5">
                            {dayAccs.funded > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`Funded: ${dayAccs.funded}`} />
                            )}
                            {dayAccs.eval > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`Eval: ${dayAccs.eval}`} />
                            )}
                            {dayAccs.live > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title={`Live: ${dayAccs.live}`} />
                            )}
                            {dayAccs.practice > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title={`Practice: ${dayAccs.practice}`} />
                            )}
                          </div>
                        )}
                      </div>

                      {amountLabel && (
                        <span className={`text-[9px] font-black block truncate w-full text-center ${textClass}`}>
                          {amountLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Dot Legend */}
            <div className="mt-3 pt-3 border-t border-[#22262C] flex items-center justify-between flex-wrap gap-2 text-[10px] text-gray-400">
              <span className="font-bold text-gray-500 uppercase tracking-wider">Account Dots:</span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <strong className="text-emerald-300">Funded</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <strong className="text-amber-300">Eval</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <strong className="text-indigo-300">Live</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <strong className="text-sky-300">Practice (Sim)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Group Multi-Trader Performance Curve & Desk Roster Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Multi-Trader Performance Race */}
            <div id="group-dashboard-race-chart" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] xl:col-span-2 flex flex-col justify-between shadow-md">
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
            <div id="group-dashboard-roster" className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] flex flex-col justify-between shadow-md">
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
