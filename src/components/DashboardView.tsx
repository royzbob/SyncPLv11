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
  Info,
  Lightbulb,
  Zap,
  PlayCircle,
  Table,
  Clock,
  LineChart as LineChartIcon,
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
  BarChart,
  Bar,
} from "recharts";
import { PnlLog, PayoutRecord, AccountType, UserProfile } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

export type DashboardAccountFilter = "all" | "real_only" | AccountType;
export type DashboardExperienceLevel = "simple" | "pro";
export type ProDashboardSubTab = "overview" | "calendar" | "accounts" | "group";

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
  const [proTab, setProTab] = useState<ProDashboardSubTab>("overview");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);

  const [experienceLevel, setExperienceLevel] = useState<DashboardExperienceLevel>(() => {
    try {
      const saved = localStorage.getItem("syncpl_dashboard_experience_level");
      if (saved === "simple" || saved === "pro") return saved;
    } catch {}
    return "simple";
  });

  const handleSetExperienceLevel = (level: DashboardExperienceLevel) => {
    setExperienceLevel(level);
    try {
      localStorage.setItem("syncpl_dashboard_experience_level", level);
    } catch {}
  };

  const [activeConcept, setActiveConcept] = useState<{
    title: string;
    description: string;
    example: string;
    actionLabel?: string;
    actionFn?: () => void;
  } | null>(null);

  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);

  // Sync initialMode if prop changes
  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Filter logs by selected account type
  const filteredRoomLogs = useMemo(() => {
    if (accountFilter === "all") return pnlLogs;
    if (accountFilter === "real_only") {
      return pnlLogs.filter((l) => (l.accountType || "funded") !== "practice");
    }
    return pnlLogs.filter((l) => (l.accountType || "funded") === accountFilter);
  }, [pnlLogs, accountFilter]);

  // Unfiltered base user logs
  const allUserLogs = useMemo(() => {
    return pnlLogs.filter((l) => l.userId === userId);
  }, [pnlLogs, userId]);

  // User logs under active filter
  const userLogs = useMemo(() => {
    return filteredRoomLogs.filter((l) => l.userId === userId);
  }, [filteredRoomLogs, userId]);

  // Active logs based on viewMode (Personal vs Desk)
  const activeLogs = useMemo(() => {
    return viewMode === "group" ? filteredRoomLogs : userLogs;
  }, [viewMode, filteredRoomLogs, userLogs]);

  const allActiveLogs = useMemo(() => {
    return viewMode === "group" ? pnlLogs : allUserLogs;
  }, [viewMode, pnlLogs, allUserLogs]);

  // Comprehensive Active Stats (computes metrics for currently selected mode: Personal or Desk)
  const activeStats = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let dailySum = 0;
    let todayTradesCount = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let maxDrawdown = 0;
    let peakEquity = 0;
    let currentCumulative = 0;

    // Sort chronologically for equity curve
    const sorted = [...activeLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((log) => {
      const amt = log.amount;
      const logDate = new Date(log.date);

      if (log.date === todayStr) {
        dailySum += amt;
        todayTradesCount++;
      }

      if (logDate >= startOfWeek) {
        weeklySum += amt;
      }

      if (logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth) {
        monthlySum += amt;
      }

      if (amt > 0) {
        totalWins++;
        grossProfit += amt;
      } else if (amt < 0) {
        totalLosses++;
        grossLoss += Math.abs(amt);
      }

      currentCumulative += amt;
      if (currentCumulative > peakEquity) {
        peakEquity = currentCumulative;
      }
      const dd = peakEquity - currentCumulative;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    });

    const totalTrades = activeLogs.length;
    const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgWin = totalWins > 0 ? grossProfit / totalWins : 0;
    const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0;
    const netPnl = grossProfit - grossLoss;
    const expectancy = totalTrades > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;

    return {
      dailySum,
      todayTradesCount,
      weeklySum,
      monthlySum,
      totalWins,
      totalLosses,
      totalTrades,
      winRate,
      profitFactor,
      grossProfit,
      grossLoss,
      netPnl,
      avgWin,
      avgLoss,
      maxDrawdown,
      expectancy,
    };
  }, [activeLogs]);

  // Group / Desk Stats summary
  const groupStats = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    let deskTodaySum = 0;
    let deskTotalSum = 0;
    let deskWins = 0;
    let deskTotalTrades = filteredRoomLogs.length;

    filteredRoomLogs.forEach((l) => {
      deskTotalSum += l.amount;
      if (l.date === todayStr) {
        deskTodaySum += l.amount;
      }
      if (l.amount > 0) {
        deskWins++;
      }
    });

    const deskWinRate = deskTotalTrades > 0 ? Math.round((deskWins / deskTotalTrades) * 100) : 0;

    return {
      deskTodaySum,
      deskTotalSum,
      deskTotalTrades,
      deskWinRate,
    };
  }, [filteredRoomLogs]);

  // Trader Meta Helper
  const getTraderMeta = (logUserId: string, fallbackUsername?: string) => {
    const trader = traders.find((t) => t.id === logUserId);
    const name = trader?.username || fallbackUsername || (logUserId === userId ? (userProfile?.username || "You") : "Trader");
    const isMe = logUserId === userId;
    const avatarColor = trader?.avatarColor || "indigo";
    const avatarType = trader?.avatarType || "emoji";
    const avatarVal = trader?.avatarVal || name.slice(0, 2).toUpperCase();

    const colorClass = {
      indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
      pink: "bg-pink-500/20 text-pink-300 border-pink-500/40",
      emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      sky: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    }[avatarColor] || "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";

    return { name, isMe, avatarColor, avatarType, avatarVal, colorClass, trader };
  };

  // Group Member Leaderboard & Contribution Stats
  const traderLeaderboard = useMemo(() => {
    const map: Record<
      string,
      {
        userId: string;
        username: string;
        avatarColor: string;
        avatarType: string;
        avatarVal: string;
        tradesCount: number;
        wins: number;
        losses: number;
        netPnl: number;
        bestTrade: number;
        worstTrade: number;
        lastTradeDate: string;
      }
    > = {};

    filteredRoomLogs.forEach((l) => {
      const uId = l.userId;
      if (!map[uId]) {
        const meta = getTraderMeta(uId, l.username);
        map[uId] = {
          userId: uId,
          username: meta.name,
          avatarColor: meta.avatarColor,
          avatarType: meta.avatarType,
          avatarVal: meta.avatarVal,
          tradesCount: 0,
          wins: 0,
          losses: 0,
          netPnl: 0,
          bestTrade: -Infinity,
          worstTrade: Infinity,
          lastTradeDate: l.date,
        };
      }
      const entry = map[uId];
      entry.tradesCount++;
      entry.netPnl += l.amount;
      if (l.amount > 0) entry.wins++;
      else if (l.amount < 0) entry.losses++;
      if (l.amount > entry.bestTrade) entry.bestTrade = l.amount;
      if (l.amount < entry.worstTrade) entry.worstTrade = l.amount;
      if (new Date(l.date) >= new Date(entry.lastTradeDate)) {
        entry.lastTradeDate = `${l.date} ${l.time || ""}`.trim();
      }
    });

    return Object.values(map).sort((a, b) => b.netPnl - a.netPnl);
  }, [filteredRoomLogs, traders, userId, userProfile]);

  // Equity Curve Data (Active Mode) with Trader Attribution
  const activeChartData = useMemo(() => {
    let running = 0;
    const sorted = [...activeLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let filtered = sorted;
    if (timeRange === "7d") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      filtered = sorted.filter((l) => new Date(l.date) >= cutoff);
    } else if (timeRange === "30d") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      filtered = sorted.filter((l) => new Date(l.date) >= cutoff);
    }

    return filtered.map((log) => {
      running += log.amount;
      const meta = getTraderMeta(log.userId, log.username);
      return {
        date: log.date.slice(5),
        fullDate: log.date,
        time: log.time || "",
        amount: log.amount,
        equity: running,
        asset: log.asset || "SETUP",
        traderName: meta.name,
        isMe: meta.isMe,
        accountType: log.accountType || "funded",
        strategy: log.strategy || "",
      };
    });
  }, [activeLogs, timeRange, traders, userId, userProfile]);

  // 4-Way Account Performance Breakdown Matrix
  const activeAccountBreakdown = useMemo(() => {
    const totalBase = allActiveLogs.length;
    const types: AccountType[] = ["funded", "eval", "live", "practice"];

    return types.map((accType) => {
      const logsForType = allActiveLogs.filter((l) => (l.accountType || "funded") === accType);
      let net = 0;
      let wins = 0;
      let losses = 0;
      let grossProfit = 0;
      let grossLoss = 0;

      logsForType.forEach((l) => {
        const amt = l.amount;
        net += amt;
        if (amt > 0) {
          wins++;
          grossProfit += amt;
        } else if (amt < 0) {
          losses++;
          grossLoss += Math.abs(amt);
        }
      });

      const total = logsForType.length;
      const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
      const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

      return {
        type: accType,
        meta: accountTypeMeta[accType],
        total,
        wins,
        losses,
        winRate: wr,
        netPnl: net,
        profitFactor: pf,
        volumePct: totalBase > 0 ? Math.round((total / totalBase) * 100) : 0,
        isActive: accountFilter === accType,
      };
    });
  }, [allActiveLogs, accountFilter]);

  // Strategy Playbook breakdown
  const strategyStats = useMemo(() => {
    const map: Record<string, { count: number; wins: number; netPnl: number }> = {};
    activeLogs.forEach((l) => {
      const s = l.strategy || "General Setup";
      if (!map[s]) map[s] = { count: 0, wins: 0, netPnl: 0 };
      map[s].count++;
      map[s].netPnl += l.amount;
      if (l.amount > 0) map[s].wins++;
    });

    return Object.entries(map).map(([strategy, data]) => ({
      strategy,
      count: data.count,
      netPnl: data.netPnl,
      winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    }));
  }, [activeLogs]);

  // 30-Day Heatmap Matrix
  const heatmapDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateString(d);
      const logsOnDay = activeLogs.filter((l) => l.date === dateStr);
      let dayPnl = 0;
      logsOnDay.forEach((l) => (dayPnl += l.amount));

      days.push({
        dateStr,
        dayNum: d.getDate(),
        monthStr: d.toLocaleString("default", { month: "short" }),
        tradeCount: logsOnDay.length,
        pnl: dayPnl,
        hasTrades: logsOnDay.length > 0,
      });
    }
    return days;
  }, [activeLogs]);

  // Helper for Chart Tooltip
  const renderChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isWin = data.amount >= 0;
      return (
        <div className="bg-[#090A0C] border border-[#262A30] rounded-xl p-3 shadow-xl space-y-1.5 min-w-[200px] text-xs">
          <div className="flex items-center justify-between border-b border-[#22262C] pb-1.5">
            <span className="text-[10px] text-gray-400 font-bold">
              {data.fullDate} {data.time}
            </span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-white/10 text-white">
              {data.asset}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-gray-400 text-[11px]">Trader:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold">@{data.traderName}</span>
              {data.isMe && (
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1 rounded border border-indigo-500/30">
                  YOU
                </span>
              )}
            </div>
          </div>

          {data.strategy && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Strategy:</span>
              <span className="text-gray-300">{data.strategy}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-[#22262C]">
            <span className="text-gray-400">Trade Result:</span>
            <span className={`font-black ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
              {data.amount >= 0 ? "+" : ""}${Math.abs(data.amount).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cumulative P&L:</span>
            <span className="font-black text-white">
              {data.equity >= 0 ? "+" : ""}${Math.round(data.equity).toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Selected Day Logs for Calendar Tab
  const selectedDayLogs = useMemo(() => {
    if (!selectedHeatmapDate) return [];
    return activeLogs.filter((l) => l.date === selectedHeatmapDate);
  }, [activeLogs, selectedHeatmapDate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E1013] text-[#DCDDDE] overflow-y-auto p-4 md:p-6 space-y-5 font-sans pb-20">
      {/* ========================================================================= */}
      {/* 🧭 UNCLUTTERED TOP HEADER & CONTROL TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14171B] p-3.5 sm:p-4 rounded-2xl border border-[#262A30] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
            {viewMode === "personal" ? <TrendingUp className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {viewMode === "personal" ? "Personal Dashboard" : "Group Dashboard"}
              </h2>
              {viewMode === "group" && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {roomName}
                </span>
              )}
              <span className="text-[10px] bg-white/10 text-gray-300 font-bold px-2 py-0.5 rounded-full border border-white/10">
                {experienceLevel === "simple" ? "Simple View" : "Pro Analytics"}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {viewMode === "personal"
                ? "Live personal execution summary, risk discipline, and verified account performance"
                : `Collective trading performance, trader attribution, and group trade flow for ${roomName}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Simple vs Pro Switcher */}
          <div className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C]">
            <button
              onClick={() => handleSetExperienceLevel("simple")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                experienceLevel === "simple"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => handleSetExperienceLevel("pro")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                experienceLevel === "pro"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pro
            </button>
          </div>

          {/* Personal vs Group Dashboard Toggle */}
          <div className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C]">
            <button
              onClick={() => setViewMode("personal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "personal"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>
            <button
              onClick={() => setViewMode("group")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "group"
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Group</span>
            </button>
          </div>

          {/* Account Filter Dropdown */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value as DashboardAccountFilter)}
            className="bg-[#090A0C] border border-[#22262C] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Accounts ({viewMode === "group" ? pnlLogs.length : allUserLogs.length})</option>
            <option value="real_only">Real Money Only</option>
            <option value="funded">Funded Prop</option>
            <option value="live">Live Brokerage</option>
            <option value="eval">Evaluation Challenge</option>
            <option value="practice">Practice Demo (Sim)</option>
          </select>

          {/* Quick Action Buttons */}
          {onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Log Trade</span>
            </button>
          )}

          {onOpenTiltGuardModal && (
            <button
              onClick={onOpenTiltGuardModal}
              className="p-2 bg-[#090A0C] hover:bg-rose-500/10 text-rose-400 border border-[#22262C] rounded-xl text-xs transition cursor-pointer"
              title="Tilt Guard Max Daily Loss"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 1. PRISTINE & UNCLUTTERED SIMPLE VIEW (BEGINNER FRIENDLY) */}
      {/* ========================================================================= */}
      {experienceLevel === "simple" && (
        <div className="space-y-5">
          {/* 3 Clear, Airy Hero Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Today's Result */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {viewMode === "group" ? "Group Today P&L" : "Today's Result (P&L)"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeStats.dailySum > 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : activeStats.dailySum < 0
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {activeStats.dailySum > 0
                    ? "Profitable Day"
                    : activeStats.dailySum < 0
                    ? "Drawdown"
                    : "No Trades Yet"}
                </span>
              </div>
              <p
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  activeStats.dailySum > 0
                    ? "text-emerald-400"
                    : activeStats.dailySum < 0
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {formatCurrency(activeStats.dailySum)}
              </p>
              <p className="text-xs text-gray-400">
                {activeStats.todayTradesCount} execution{activeStats.todayTradesCount !== 1 ? "s" : ""}{" "}
                {viewMode === "group" ? "across group today" : "recorded today"}
              </p>
            </div>

            {/* Card 2: Win Rate & Discipline */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {viewMode === "group" ? "Group Win Rate %" : "Win Rate %"}
                </span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {activeStats.totalWins}W - {activeStats.totalLosses}L
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {activeStats.winRate}%
              </p>
              <p className="text-xs text-gray-400">
                Avg Win: <span className="text-emerald-400 font-bold">+${Math.round(activeStats.avgWin)}</span> • Avg
                Loss: <span className="text-rose-400 font-bold">-${Math.round(activeStats.avgLoss)}</span>
              </p>
            </div>

            {/* Card 3: Total Cumulative Growth */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {viewMode === "group" ? "Group Cumulative P&L" : "Cumulative P&L"}
                </span>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Total {activeLogs.length} Trades
                </span>
              </div>
              <p
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  activeStats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(activeStats.netPnl)}
              </p>
              <p className="text-xs text-gray-400">
                Profit Factor: <span className="font-bold text-white">{activeStats.profitFactor.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Visual Growth Chart */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-white text-base">
                  {viewMode === "group" ? "Group Equity Growth Trajectory" : "Equity Growth Trajectory"}
                </h3>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C] text-xs">
                <button
                  onClick={() => setTimeRange("7d")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    timeRange === "7d" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => setTimeRange("30d")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    timeRange === "30d" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  30D
                </button>
                <button
                  onClick={() => setTimeRange("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    timeRange === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="h-[220px] w-full pt-2">
              {activeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cleanSimpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip content={renderChartTooltip} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      name="Cumulative P&L"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#cleanSimpleGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                  <Activity className="w-8 h-8 opacity-40 text-emerald-400" />
                  <span>
                    {viewMode === "group"
                      ? "No group trades logged yet. Be the first to log a trade!"
                      : "No trades logged yet. Click '+ Log Trade' to record your first trade!"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions with Trader Attribution */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>{viewMode === "group" ? "Recent Group Executions" : "Recent Activity"}</span>
              </h3>
              {onOpenLogModal && (
                <button
                  onClick={onOpenLogModal}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log Trade</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {activeLogs.slice(0, 6).map((log) => {
                const isWin = log.amount >= 0;
                const traderMeta = getTraderMeta(log.userId, log.username);

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#090A0C] border border-[#22262C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#323842] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isWin
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {isWin ? "WIN" : "LOSS"}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          {/* Trader Identity Pill */}
                          <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${traderMeta.colorClass}`}
                          >
                            <span className="text-[11px]">{traderMeta.avatarVal}</span>
                            <span>@{traderMeta.name}</span>
                            {traderMeta.isMe && (
                              <span className="text-[9px] bg-white/20 text-white font-black px-1 rounded">
                                YOU
                              </span>
                            )}
                          </div>

                          <span className="font-black text-white text-sm">{log.asset || "SETUP"}</span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              accountTypeMeta[log.accountType || "funded"].badge
                            }`}
                          >
                            {accountTypeMeta[log.accountType || "funded"].label}
                          </span>

                          {log.strategy && (
                            <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full hidden sm:inline">
                              {log.strategy}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{log.date}</span>
                          {log.time && <span>• {log.time}</span>}
                          {log.notes && (
                            <span className="text-gray-500 truncate max-w-xs sm:max-w-md hidden sm:inline">
                              - "{log.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={`text-base sm:text-lg font-black ${
                          isWin ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(log.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {activeLogs.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-xs">
                  {viewMode === "group"
                    ? "No trades recorded in this group yet. Log a trade to get started!"
                    : "No trades recorded yet. Start by logging your first practice or funded trade!"}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Trading Concepts / Cheat Sheet Button */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#14171B] border border-[#262A30]">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-300">
                Need a quick refresher on 1:2 R:R math, P&L calculations, or Tilt Guard?
              </span>
            </div>
            <button
              onClick={() => setIsCheatSheetOpen(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition cursor-pointer"
            >
              View Quick Cheat Sheet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 2. CLEAN & TABBED PRO ANALYTICS VIEW */}
      {/* ========================================================================= */}
      {experienceLevel === "pro" && (
        <div className="space-y-5">
          {/* Pro Sub-Navigation Tabs */}
          <div className="flex items-center overflow-x-auto bg-[#14171B] p-1.5 rounded-2xl border border-[#262A30] gap-1 shadow-md">
            <button
              onClick={() => setProTab("overview")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                proTab === "overview"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Performance & Ratios</span>
            </button>

            <button
              onClick={() => setProTab("calendar")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                proTab === "calendar"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Heatmap & Calendar</span>
            </button>

            <button
              onClick={() => setProTab("accounts")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                proTab === "accounts"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Accounts & Playbooks</span>
            </button>

            <button
              onClick={() => setProTab("group")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                proTab === "group"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group Leaderboard & Activity</span>
            </button>
          </div>

          {/* SUB-TAB 1: PERFORMANCE & RATIOS */}
          {proTab === "overview" && (
            <div className="space-y-5">
              {/* 4 Hero Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    {viewMode === "group" ? "Group Today P&L" : "Today P&L"}
                  </span>
                  <p
                    className={`text-2xl sm:text-3xl font-black mt-1 ${
                      activeStats.dailySum >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(activeStats.dailySum)}
                  </p>
                  <span className="text-[11px] text-gray-500">
                    {activeStats.todayTradesCount} trades {viewMode === "group" ? "in group" : "today"}
                  </span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    {viewMode === "group" ? "Group This Week" : "This Week"}
                  </span>
                  <p
                    className={`text-2xl sm:text-3xl font-black mt-1 ${
                      activeStats.weeklySum >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(activeStats.weeklySum)}
                  </p>
                  <span className="text-[11px] text-gray-500">
                    {viewMode === "group" ? "Group weekly sum" : "Weekly aggregate"}
                  </span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    {viewMode === "group" ? "Group Win Rate" : "Win Rate"}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">{activeStats.winRate}%</p>
                  <span className="text-[11px] text-indigo-400 font-bold">
                    {activeStats.totalWins}W - {activeStats.totalLosses}L
                  </span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    {viewMode === "group" ? "Group Profit Factor" : "Profit Factor"}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {activeStats.profitFactor.toFixed(2)}
                  </p>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Net: {formatCurrency(activeStats.netPnl)}
                  </span>
                </div>
              </div>

              {/* Quantitative Ratios Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14171B] p-4 rounded-2xl border border-[#262A30] text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Win Trade</span>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">
                    +${Math.round(activeStats.avgWin)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Loss Trade</span>
                  <p className="text-sm font-black text-rose-400 mt-0.5">
                    -${Math.round(activeStats.avgLoss)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Max Drawdown</span>
                  <p className="text-sm font-black text-amber-400 mt-0.5">
                    -${Math.round(activeStats.maxDrawdown)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Expectancy / Trade</span>
                  <p className="text-sm font-black text-indigo-400 mt-0.5">
                    {formatCurrency(activeStats.expectancy)}
                  </p>
                </div>
              </div>

              {/* Detailed Equity Curve */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>
                      {viewMode === "group"
                        ? "Group Performance Trajectory"
                        : "Cumulative Performance Trajectory"}
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">{activeChartData.length} executions plotted</span>
                </div>

                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="proGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={renderChartTooltip} />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        name="Equity"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#proGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comprehensive Recent Trade Executions & Trader Flow Ledger */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>
                      {viewMode === "group" ? "Group Trade Flow & Execution Ledger" : "Recent Trade Executions"}
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    Showing latest {Math.min(activeLogs.length, 12)} of {activeLogs.length} trades
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262A30] text-gray-500 uppercase text-[10px]">
                        <th className="pb-2.5">Trader</th>
                        <th className="pb-2.5">Asset / Strategy</th>
                        <th className="pb-2.5">Account</th>
                        <th className="pb-2.5">Date & Time</th>
                        <th className="pb-2.5 text-right">Net P&L</th>
                        <th className="pb-2.5 pl-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262C]">
                      {activeLogs.slice(0, 12).map((log) => {
                        const isWin = log.amount >= 0;
                        const meta = getTraderMeta(log.userId, log.username);

                        return (
                          <tr key={log.id} className="hover:bg-white/5 transition">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${meta.colorClass}`}
                                >
                                  <span className="text-[11px]">{meta.avatarVal}</span>
                                  <span>@{meta.name}</span>
                                  {meta.isMe && (
                                    <span className="text-[9px] bg-white/20 text-white font-black px-1 rounded">
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 font-black text-white">
                              <div>
                                <span>{log.asset || "SETUP"}</span>
                                {log.strategy && (
                                  <span className="block text-[10px] font-normal text-gray-400">
                                    {log.strategy}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  accountTypeMeta[log.accountType || "funded"].badge
                                }`}
                              >
                                {accountTypeMeta[log.accountType || "funded"].label}
                              </span>
                            </td>

                            <td className="py-3 text-gray-400 font-mono text-[11px]">
                              {log.date} {log.time || ""}
                            </td>

                            <td
                              className={`py-3 text-right font-black text-sm ${
                                isWin ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(log.amount)}
                            </td>

                            <td className="py-3 pl-4 text-gray-400 text-[11px] italic max-w-xs truncate">
                              {log.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}

                      {activeLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No trades recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: HEATMAP & 30-DAY CALENDAR */}
          {proTab === "calendar" && (
            <div className="space-y-5">
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-black text-white text-base">30-Day P&L Heatmap Matrix</h3>
                  </div>
                  <span className="text-xs text-gray-400">Click any day to view trade executions & traders</span>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                  {heatmapDays.map((day, idx) => {
                    const isSelected = selectedHeatmapDate === day.dateStr;
                    let cellBg = "bg-[#090A0C] border-[#22262C] text-gray-600";
                    if (day.hasTrades) {
                      if (day.pnl > 0) {
                        cellBg = "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-bold";
                      } else if (day.pnl < 0) {
                        cellBg = "bg-rose-950/50 border-rose-500/40 text-rose-300 font-bold";
                      } else {
                        cellBg = "bg-gray-800/50 border-gray-600 text-gray-300";
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedHeatmapDate(day.dateStr)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-between min-h-[68px] transition cursor-pointer hover:scale-105 ${cellBg} ${
                          isSelected ? "ring-2 ring-indigo-500 shadow-lg scale-105" : ""
                        }`}
                        title={`${day.dateStr}: ${formatCurrency(day.pnl)} (${day.tradeCount} trades)`}
                      >
                        <span className="text-[10px] text-gray-400">
                          {day.monthStr} {day.dayNum}
                        </span>
                        <span className="text-xs font-black">
                          {day.hasTrades ? (day.pnl !== 0 ? formatCurrency(day.pnl) : "$0") : "-"}
                        </span>
                        <span className="text-[9px] opacity-75 font-mono">{day.tradeCount} tr</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Trade Details */}
              {selectedHeatmapDate && (
                <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-black text-white text-base">
                        Executions on {selectedHeatmapDate} ({selectedDayLogs.length} trades)
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedHeatmapDate(null)}
                      className="text-xs text-gray-400 hover:text-white font-bold"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedDayLogs.map((log) => {
                      const isWin = log.amount >= 0;
                      const meta = getTraderMeta(log.userId, log.username);

                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${meta.colorClass}`}
                            >
                              <span>{meta.avatarVal}</span>
                              <span>@{meta.name}</span>
                              {meta.isMe && (
                                <span className="text-[9px] bg-white/20 text-white font-black px-1 rounded">
                                  YOU
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white text-xs">{log.asset || "SETUP"}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    accountTypeMeta[log.accountType || "funded"].badge
                                  }`}
                                >
                                  {accountTypeMeta[log.accountType || "funded"].label}
                                </span>
                                {log.strategy && (
                                  <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.2 rounded">
                                    {log.strategy}
                                  </span>
                                )}
                              </div>
                              {log.notes && <p className="text-[11px] text-gray-400 italic">"{log.notes}"</p>}
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-sm font-black ${
                                isWin ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(log.amount)}
                            </span>
                            {log.time && <span className="block text-[10px] text-gray-500">{log.time}</span>}
                          </div>
                        </div>
                      );
                    })}

                    {selectedDayLogs.length === 0 && (
                      <p className="text-xs text-gray-500 py-3 text-center">
                        No trades logged on this specific date.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 3: ACCOUNTS & PLAYBOOKS */}
          {proTab === "accounts" && (
            <div className="space-y-5">
              {/* 4-Way Account Differentiation Matrix */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-black text-white text-base">Multi-Account Portfolio Matrix</h3>
                  </div>
                  <span className="text-xs text-gray-400">Funded vs Live vs Challenge vs Sandbox</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeAccountBreakdown.map((acc) => (
                    <div
                      key={acc.type}
                      onClick={() => setAccountFilter(acc.type)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                        accountFilter === acc.type
                          ? "bg-indigo-600/10 border-indigo-500 shadow-md"
                          : "bg-[#090A0C] border-[#22262C] hover:border-[#333]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${acc.meta.bg} ${acc.meta.text}`}
                        >
                          {acc.meta.label}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{acc.total} trades</span>
                      </div>

                      <p
                        className={`text-xl font-black ${
                          acc.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(acc.netPnl)}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-[#22262C]">
                        <span>
                          Win Rate: <strong className="text-white">{acc.winRate}%</strong>
                        </span>
                        <span>
                          PF: <strong className="text-white">{acc.profitFactor.toFixed(1)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy Playbook Table */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Strategy Playbook Performance</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262A30] text-gray-500 uppercase text-[10px]">
                        <th className="pb-2">Strategy Setup</th>
                        <th className="pb-2">Executions</th>
                        <th className="pb-2">Win Rate</th>
                        <th className="pb-2 text-right">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262C]">
                      {strategyStats.map((st, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-2.5 font-bold text-white">{st.strategy}</td>
                          <td className="py-2.5 text-gray-400">{st.count}</td>
                          <td className="py-2.5 font-bold text-indigo-300">{st.winRate}%</td>
                          <td
                            className={`py-2.5 text-right font-black ${
                              st.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatCurrency(st.netPnl)}
                          </td>
                        </tr>
                      ))}

                      {strategyStats.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-500">
                            No strategy tags logged yet. Add a strategy tag when logging trades!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: GROUP RACE & TRADER STATS */}
          {proTab === "group" && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="font-black text-white text-base">Group Leaderboard & Contribution</h3>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">
                    Total Group Net: {formatCurrency(groupStats.deskTotalSum)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Group Today P&L</span>
                    <p
                      className={`text-2xl font-black mt-1 ${
                        groupStats.deskTodaySum >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(groupStats.deskTodaySum)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Group Win Rate</span>
                    <p className="text-2xl font-black text-white mt-1">{groupStats.deskWinRate}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Total Group Executions</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{groupStats.deskTotalTrades}</p>
                  </div>
                </div>
              </div>

              {/* Individual Trader Leaderboard Table */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
                <h4 className="font-black text-white text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Member Performance Breakdown</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262A30] text-gray-500 uppercase text-[10px]">
                        <th className="pb-2.5">Rank</th>
                        <th className="pb-2.5">Trader</th>
                        <th className="pb-2.5">Trades</th>
                        <th className="pb-2.5">Win Rate</th>
                        <th className="pb-2.5">Best Trade</th>
                        <th className="pb-2.5 text-right">Net P&L Contributed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262C]">
                      {traderLeaderboard.map((trader, idx) => {
                        const isMe = trader.userId === userId;
                        const winRate =
                          trader.tradesCount > 0
                            ? Math.round((trader.wins / trader.tradesCount) * 100)
                            : 0;

                        return (
                          <tr key={trader.userId} className="hover:bg-white/5 transition">
                            <td className="py-3 font-bold text-gray-400">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                                  {trader.avatarVal}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">@{trader.username}</span>
                                    {isMe && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 rounded border border-emerald-500/30">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500">
                                    Last trade: {trader.lastTradeDate}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-gray-300 font-bold">{trader.tradesCount}</td>
                            <td className="py-3">
                              <span className="font-bold text-indigo-300">{winRate}%</span>
                              <span className="text-[10px] text-gray-500 block">
                                {trader.wins}W - {trader.losses}L
                              </span>
                            </td>
                            <td className="py-3 text-emerald-400 font-bold">
                              {trader.bestTrade !== -Infinity ? formatCurrency(trader.bestTrade) : "—"}
                            </td>
                            <td
                              className={`py-3 text-right font-black text-sm ${
                                trader.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(trader.netPnl)}
                            </td>
                          </tr>
                        );
                      })}

                      {traderLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-gray-500">
                            No member trades recorded in this group yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💡 EDUCATIONAL CHEAT SHEET MODAL (CLEAN & NON-INTRUSIVE) */}
      {/* ========================================================================= */}
      {isCheatSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14171B] border border-[#262A30] max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Trading Essentials Cheat Sheet</h3>
              </div>
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C]">
                <strong className="text-emerald-400 block mb-1">💰 1. What is P&L?</strong>
                <p>P&L is Profit and Loss: the net money you made or lost after subtracting fees and slippage.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C]">
                <strong className="text-amber-400 block mb-1">🎯 2. The 1:2 R:R Golden Rule</strong>
                <p>
                  Risk $50 on stop-loss to target $100 profit. This guarantees you make money even with only 4 wins
                  out of 10 trades!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C]">
                <strong className="text-rose-400 block mb-1">🛡️ 3. Tilt Guard Protection</strong>
                <p>
                  Tilt Guard prevents revenge trading by locking your desk after hitting your max daily loss limit.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
