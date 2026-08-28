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
export type ProDashboardSubTab = "overview" | "calendar" | "accounts" | "desk";

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

  // Basic Personal Stats
  const personalStats = useMemo(() => {
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
    const sorted = [...userLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    const totalTrades = userLogs.length;
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
  }, [userLogs]);

  // Group / Desk Stats
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

  // Equity Curve Data
  const personalChartData = useMemo(() => {
    let running = 0;
    const sorted = [...userLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      return {
        date: log.date.slice(5),
        amount: log.amount,
        equity: running,
        asset: log.asset || "SETUP",
      };
    });
  }, [userLogs, timeRange]);

  // 4-Way Account Performance Breakdown Matrix
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
  }, [allUserLogs, accountFilter]);

  // Strategy Playbook breakdown
  const strategyStats = useMemo(() => {
    const map: Record<string, { count: number; wins: number; netPnl: number }> = {};
    userLogs.forEach((l) => {
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
  }, [userLogs]);

  // 30-Day Heatmap Matrix
  const heatmapDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateString(d);
      const logsOnDay = userLogs.filter((l) => l.date === dateStr);
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
  }, [userLogs]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E1013] text-[#DCDDDE] overflow-y-auto p-4 md:p-6 space-y-5 font-sans pb-20">
      {/* ========================================================================= */}
      {/* 🧭 UNCLUTTERED TOP HEADER & CONTROL TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14171B] p-3.5 sm:p-4 rounded-2xl border border-[#262A30] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {viewMode === "personal" ? "Trading Dashboard" : `${roomName} Desk`}
              </h2>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                {experienceLevel === "simple" ? "Simple View" : "Pro Analytics"}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {viewMode === "personal"
                ? "Live execution summary, risk discipline, and verified account performance"
                : "Collective trading room metrics and member activity"}
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

          {/* Personal vs Desk Toggle */}
          <div className="flex items-center bg-[#090A0C] p-1 rounded-xl border border-[#22262C]">
            <button
              onClick={() => setViewMode("personal")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "personal"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>
            <button
              onClick={() => setViewMode("group")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "group"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Desk</span>
            </button>
          </div>

          {/* Account Filter Dropdown */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value as DashboardAccountFilter)}
            className="bg-[#090A0C] border border-[#22262C] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Accounts ({allUserLogs.length})</option>
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
                  Today's Result (P&L)
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    personalStats.dailySum > 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : personalStats.dailySum < 0
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {personalStats.dailySum > 0
                    ? "Profitable Day"
                    : personalStats.dailySum < 0
                    ? "Drawdown"
                    : "No Trades Yet"}
                </span>
              </div>
              <p
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  personalStats.dailySum > 0
                    ? "text-emerald-400"
                    : personalStats.dailySum < 0
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {formatCurrency(personalStats.dailySum)}
              </p>
              <p className="text-xs text-gray-400">
                {personalStats.todayTradesCount} execution{personalStats.todayTradesCount !== 1 ? "s" : ""} recorded today
              </p>
            </div>

            {/* Card 2: Win Rate & Discipline */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Win Rate %
                </span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {personalStats.totalWins}W - {personalStats.totalLosses}L
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {personalStats.winRate}%
              </p>
              <p className="text-xs text-gray-400">
                Avg Win: <span className="text-emerald-400 font-bold">+${Math.round(personalStats.avgWin)}</span> • Avg Loss: <span className="text-rose-400 font-bold">-${Math.round(personalStats.avgLoss)}</span>
              </p>
            </div>

            {/* Card 3: Total Cumulative Growth */}
            <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Cumulative P&L
                </span>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Total {userLogs.length} Trades
                </span>
              </div>
              <p
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  personalStats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(personalStats.netPnl)}
              </p>
              <p className="text-xs text-gray-400">
                Profit Factor: <span className="font-bold text-white">{personalStats.profitFactor.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Visual Growth Chart */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-white text-base">Equity Growth Trajectory</h3>
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
              {personalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={personalChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090A0C",
                        borderColor: "#262A30",
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
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
                  <span>No trades logged yet. Click "+ Log Trade" to record your first trade!</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions (Streamlined 4 Items) */}
          <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Recent Activity</span>
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

            <div className="space-y-2">
              {userLogs.slice(0, 4).map((log) => {
                const isWin = log.amount >= 0;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C] flex items-center justify-between gap-3 hover:border-[#323842] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          isWin
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {isWin ? "W" : "L"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
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
                        <span className="text-[11px] text-gray-400">{log.date}</span>
                      </div>
                    </div>

                    <span className={`text-base font-black ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(log.amount)}
                    </span>
                  </div>
                );
              })}

              {userLogs.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-xs">
                  No trades recorded yet. Start by logging your first practice or funded trade!
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
              onClick={() => setProTab("desk")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                proTab === "desk"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Desk Race & Room Stats</span>
            </button>
          </div>

          {/* SUB-TAB 1: PERFORMANCE & RATIOS */}
          {proTab === "overview" && (
            <div className="space-y-5">
              {/* 4 Hero Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">Today P&L</span>
                  <p
                    className={`text-2xl sm:text-3xl font-black mt-1 ${
                      personalStats.dailySum >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(personalStats.dailySum)}
                  </p>
                  <span className="text-[11px] text-gray-500">{personalStats.todayTradesCount} trades today</span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">This Week</span>
                  <p
                    className={`text-2xl sm:text-3xl font-black mt-1 ${
                      personalStats.weeklySum >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(personalStats.weeklySum)}
                  </p>
                  <span className="text-[11px] text-gray-500">Weekly aggregate</span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">Win Rate</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">{personalStats.winRate}%</p>
                  <span className="text-[11px] text-indigo-400 font-bold">
                    {personalStats.totalWins}W - {personalStats.totalLosses}L
                  </span>
                </div>

                <div className="bg-[#14171B] p-4 rounded-2xl border border-[#262A30]">
                  <span className="text-[10px] font-black uppercase text-gray-400">Profit Factor</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {personalStats.profitFactor.toFixed(2)}
                  </p>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Net: {formatCurrency(personalStats.netPnl)}
                  </span>
                </div>
              </div>

              {/* Quantitative Ratios Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#14171B] p-4 rounded-2xl border border-[#262A30] text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Win Trade</span>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">
                    +${Math.round(personalStats.avgWin)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Loss Trade</span>
                  <p className="text-sm font-black text-rose-400 mt-0.5">
                    -${Math.round(personalStats.avgLoss)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Max Drawdown</span>
                  <p className="text-sm font-black text-amber-400 mt-0.5">
                    -${Math.round(personalStats.maxDrawdown)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Expectancy / Trade</span>
                  <p className="text-sm font-black text-indigo-400 mt-0.5">
                    {formatCurrency(personalStats.expectancy)}
                  </p>
                </div>
              </div>

              {/* Detailed Equity Curve */}
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Cumulative Performance Trajectory</span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">{personalChartData.length} executions plotted</span>
                </div>

                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={personalChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="proGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090A0C",
                          borderColor: "#262A30",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
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
                  <span className="text-xs text-gray-400">Green = Profitable Day • Red = Loss</span>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                  {heatmapDays.map((day, idx) => {
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
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-between min-h-[64px] transition hover:scale-105 ${cellBg}`}
                        title={`${day.dateStr}: ${formatCurrency(day.pnl)} (${day.tradeCount} trades)`}
                      >
                        <span className="text-[10px] text-gray-400">{day.monthStr} {day.dayNum}</span>
                        <span className="text-xs font-black">
                          {day.hasTrades ? (day.pnl !== 0 ? formatCurrency(day.pnl) : "$0") : "-"}
                        </span>
                        <span className="text-[9px] opacity-60">{day.tradeCount} tr</span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  {personalAccountBreakdown.map((acc) => (
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
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${acc.meta.bg} ${acc.meta.text}`}>
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
                        <span>Win Rate: <strong className="text-white">{acc.winRate}%</strong></span>
                        <span>PF: <strong className="text-white">{acc.profitFactor.toFixed(1)}</strong></span>
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

          {/* SUB-TAB 4: DESK RACE & ROOM STATS */}
          {proTab === "desk" && (
            <div className="space-y-5">
              <div className="bg-[#14171B] p-5 rounded-2xl border border-[#262A30] shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="font-black text-white text-base">Desk Leaderboard & Volume</h3>
                  </div>
                  <span className="text-xs text-gray-400">Total Desk P&L: {formatCurrency(groupStats.deskTotalSum)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Desk Today P&L</span>
                    <p className={`text-2xl font-black mt-1 ${groupStats.deskTodaySum >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(groupStats.deskTodaySum)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Desk Win Rate</span>
                    <p className="text-2xl font-black text-white mt-1">{groupStats.deskWinRate}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#090A0C] border border-[#22262C]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Total Desk Executions</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{groupStats.deskTotalTrades}</p>
                  </div>
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
                <p>Risk $50 on stop-loss to target $100 profit. This guarantees you make money even with only 4 wins out of 10 trades!</p>
              </div>

              <div className="p-3 rounded-xl bg-[#090A0C] border border-[#22262C]">
                <strong className="text-rose-400 block mb-1">🛡️ 3. Tilt Guard Protection</strong>
                <p>Tilt Guard prevents revenge trading by locking your desk after hitting your max daily loss limit.</p>
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
