import React, { useState, useMemo } from "react";
import {
  Download,
  Upload,
  Plus,
  Filter,
  Award,
  Trash2,
  X,
  Clipboard,
  FolderOpen,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Bookmark,
  Crown,
  Lock,
  AlertCircle,
  Share2,
  FileSpreadsheet,
  BookOpen,
  HelpCircle,
  Info,
  BarChart3,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  GraduationCap,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { PnlLog, UserProfile, AccountType } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";
import { isImageAvatar } from "../utils/presence";
import CleanFlexCardModal from "./CleanFlexCardModal";
import ImportTradesModal, { ParsedImportTrade } from "./ImportTradesModal";

interface LogsViewProps {
  pnlLogs: PnlLog[];
  userId: string;
  username: string;
  onDeleteLog: (id: string, asset: string, amount: number) => Promise<void>;
  onBulkDeleteLogs?: (ids: string[]) => Promise<void>;
  onOpenLogModal: () => void;
  onImportTrades?: (trades: ParsedImportTrade[]) => Promise<void>;
  roomCode: string;
  traders: UserProfile[];
  isCreatorOrMod?: boolean;
  isPremium?: boolean;
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
}

const accountTypeConfig: Record<
  AccountType,
  { label: string; shortLabel: string; bg: string; text: string; border: string; dot: string }
> = {
  funded: {
    label: "Funded Prop",
    shortLabel: "Funded",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  live: {
    label: "Live Capital",
    shortLabel: "Live",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  eval: {
    label: "Combine / Eval",
    shortLabel: "Eval",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  practice: {
    label: "Practice (Sim)",
    shortLabel: "Practice",
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/40",
    dot: "bg-sky-400",
  },
};

export default function LogsView({
  pnlLogs = [],
  userId,
  username = "Trader",
  onDeleteLog,
  onBulkDeleteLogs,
  onOpenLogModal,
  onImportTrades,
  roomCode = "DESK",
  traders = [],
  isCreatorOrMod = false,
  isPremium = false,
  onOpenUpgradeModal,
}: LogsViewProps) {
  const [scope, setScope] = useState<"all" | "me">("all");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [selectedFlexLog, setSelectedFlexLog] = useState<PnlLog | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const safeLogs = Array.isArray(pnlLogs) ? pnlLogs : [];
  const safeTraders = Array.isArray(traders) ? traders : [];

  // Determine if user has unlimited access (Pro subscriber or Room Creator / App Owner / Mod)
  const isUnlimitedUser = isPremium || isCreatorOrMod;

  // Compute how many logs the current user has created
  const userLogsCount = useMemo(() => {
    return safeLogs.filter((l) => l && l.userId === userId).length;
  }, [safeLogs, userId]);

  const FREE_LOG_LIMIT = 10;
  const isLimitReached = !isUnlimitedUser && userLogsCount >= FREE_LOG_LIMIT;

  const handleAddRecordClick = () => {
    if (isLimitReached) {
      onOpenUpgradeModal?.("logs_limit");
    } else {
      onOpenLogModal();
    }
  };

  // Collect all unique strategies present in the logs
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    safeLogs.forEach((log) => {
      if (log && log.strategy && typeof log.strategy === "string" && log.strategy.trim()) {
        set.add(log.strategy.trim());
      }
    });
    return Array.from(set).sort();
  }, [safeLogs]);

  // Filter list
  const filteredLogs = useMemo(() => {
    return safeLogs.filter((log) => {
      if (!log) return false;
      if (scope === "me" && log.userId !== userId) return false;
      if (accountFilter !== "all") {
        const logAcct = log.accountType || "funded";
        if (logAcct !== accountFilter) return false;
      }
      if (strategyFilter !== "all" && log.strategy !== strategyFilter) {
        return false;
      }
      return true;
    });
  }, [safeLogs, scope, userId, accountFilter, strategyFilter]);

  // Deletable logs in current view based on user permission (owner or creator/mod)
  const deletableFilteredLogs = useMemo(() => {
    return filteredLogs.filter(
      (log) => !log.userId || log.userId === userId || log.username === username || isCreatorOrMod
    );
  }, [filteredLogs, userId, username, isCreatorOrMod]);

  const isAllSelected =
    deletableFilteredLogs.length > 0 &&
    deletableFilteredLogs.every((l) => selectedLogIds.has(l.id));

  const isSomeSelected =
    deletableFilteredLogs.some((l) => selectedLogIds.has(l.id)) && !isAllSelected;

  const handleToggleSelect = (id: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(deletableFilteredLogs.map((l) => l.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedLogIds(new Set());
  };

  const selectedLogs = useMemo(() => {
    return safeLogs.filter((l) => selectedLogIds.has(l.id));
  }, [safeLogs, selectedLogIds]);

  const selectedTotalPnl = useMemo(() => {
    return selectedLogs.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  }, [selectedLogs]);

  const handleExecuteBulkDelete = async () => {
    if (selectedLogIds.size === 0) return;
    const idsArray = Array.from(selectedLogIds);

    if (onBulkDeleteLogs) {
      setIsBulkDeleting(true);
      try {
        await onBulkDeleteLogs(idsArray);
        setSelectedLogIds(new Set());
      } catch (err) {
        console.error("Bulk delete error:", err);
      } finally {
        setIsBulkDeleting(false);
      }
    } else {
      // Fallback: delete sequentially using single onDeleteLog
      setIsBulkDeleting(true);
      try {
        for (const log of selectedLogs) {
          await onDeleteLog(log.id, log.asset, log.amount);
        }
        setSelectedLogIds(new Set());
      } catch (err) {
        console.error("Bulk delete sequential error:", err);
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  // Computed summary stats for the active view
  const journalStats = useMemo(() => {
    const total = filteredLogs.length;
    let net = 0;
    let wins = 0;
    let losses = 0;

    filteredLogs.forEach((log) => {
      const amt = Number(log.amount) || 0;
      net += amt;
      if (amt > 0) wins++;
      else if (amt < 0) losses++;
    });

    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgTrade = total > 0 ? net / total : 0;

    return { total, net, wins, losses, winRate, avgTrade };
  }, [filteredLogs]);

  // Overall account breakdown across all safeLogs
  const accountBreakdown = useMemo(() => {
    const stats: Record<AccountType, { count: number; net: number; wins: number }> = {
      funded: { count: 0, net: 0, wins: 0 },
      live: { count: 0, net: 0, wins: 0 },
      eval: { count: 0, net: 0, wins: 0 },
      practice: { count: 0, net: 0, wins: 0 },
    };

    safeLogs.forEach((log) => {
      const type = (log.accountType || "funded") as AccountType;
      if (stats[type]) {
        const amt = Number(log.amount) || 0;
        stats[type].count++;
        stats[type].net += amt;
        if (amt > 0) stats[type].wins++;
      }
    });

    return stats;
  }, [safeLogs]);

  const handleExportCSV = () => {
    if (safeLogs.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Date,Trader,Asset,Account Type,Strategy,Notes,P&L Amount,Status\n";

    safeLogs.forEach((log) => {
      if (!log) return;
      const amt = Number(log.amount) || 0;
      const status = amt >= 0 ? "Profit" : "Loss";
      const notesClean = log.notes ? String(log.notes).replace(/"/g, '""') : "";
      const acctClean = String(log.accountType || "Funded").toUpperCase();
      csvContent += `"${log.date || ""}","${log.username || "Trader"}","${log.asset || "N/A"}","${acctClean}","${log.strategy || ""}","${notesClean}",${amt},"${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SyncPL-TradeJournal-${roomCode}-${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyFlexCardText = () => {
    if (!selectedFlexLog) return;
    const certCode = selectedFlexLog.id.substring(0, 8).toUpperCase();
    const acctStr = (selectedFlexLog.accountType || "Funded").toUpperCase();
    const copyText = `SyncPL Shared Ledger Certificate: Code: #${certCode} | [${acctStr}] Profit: ${formatCurrency(
      selectedFlexLog.amount
    )} on ${selectedFlexLog.asset} by ${
      selectedFlexLog.username
    }. Verified in Room Code: ${roomCode}!`;

    navigator.clipboard.writeText(copyText);
    setCopiedState(true);
    setTimeout(() => {
      setCopiedState(false);
      setSelectedFlexLog(null);
    }, 1500);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto h-full text-[#DCDDDE]">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-2xl text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <span>Trade Journal & Ledger</span>
            </h3>
            {isUnlimitedUser ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3 text-emerald-400" /> {isCreatorOrMod ? "Owner / Unlimited" : "Pro Unlimited"}
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-[#121417] text-gray-400 border border-[#2A2D31] px-2 py-0.5 rounded-full">
                Free Tier: {userLogsCount}/{FREE_LOG_LIMIT} Trades
              </span>
            )}
          </div>
          <p className="text-xs text-[#8E9297] mt-1 max-w-2xl">
            Your centralized trade execution journal. Track individual setups, import broker CSVs, and analyze multi-account P&L performance across your trading desk.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className={`text-xs font-bold px-3 py-2 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
              showGuide
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-[#1E2023] hover:bg-[#24272C] border-[#2A2D31] text-gray-400 hover:text-white"
            }`}
            title="Learn how the Trade Journal & Ledger works"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">What is this?</span>
            <span className="sm:hidden">Guide</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-ledger-import-trades"
            onClick={() => setIsImportModalOpen(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Import trades from NinjaTrader, Tradovate, MetaTrader, or CSV"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Import Trades</span>
            <span className="sm:hidden">Import</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-[#8E9297] hover:text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Export full trade journal to CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleAddRecordClick}
            className={`font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow ${
              isLimitReached
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                : "bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-indigo-500/20"
            }`}
          >
            {isLimitReached ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Limit Reached (Upgrade)</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Log Trade</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explainer / Guide Drawer Banner */}
      {showGuide && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#1E222B] to-[#121417] border border-indigo-500/30 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">How the Trade Journal & Ledger Works</h4>
                <p className="text-xs text-gray-400">Everything you log or import here powers your analytics, win-rates, and leaderboard rank.</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-gray-500 hover:text-gray-300 p-1 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#121417] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Plus className="w-4 h-4 shrink-0" />
                <span>1. Log Executions</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Click <strong className="text-gray-300">Log Trade</strong> to save dollar P&L, ticker symbol, strategy tags (e.g. Breakout, Reversal, ICT), and psychological notes.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121417] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Layers className="w-4 h-4 shrink-0" />
                <span>2. Multi-Account Tagging</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Organize trades by account type: <strong className="text-emerald-400">Funded</strong>, <strong className="text-indigo-400">Live</strong>, <strong className="text-amber-400">Eval / Challenge</strong>, or <strong className="text-sky-400">Practice</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121417] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Upload className="w-4 h-4 shrink-0" />
                <span>3. One-Click Import</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Import complete trade histories from <strong className="text-gray-300">NinjaTrader, Tradovate, MT4/5, Thinkorswim</strong>, or custom CSV files in seconds.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121417] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Award className="w-4 h-4 shrink-0" />
                <span>4. Flex & Analytics</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Click the <strong className="text-gray-300">Trophy icon</strong> next to any trade to generate shareable high-res P&L certificate cards for social channels.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mini Performance Summary Cards */}
      {journalStats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#121417] border border-[#2A2D31] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filtered Net P&L</span>
            <div className={`text-base sm:text-lg font-black tracking-tight mt-1 ${journalStats.net >= 0 ? "text-[#43B581]" : "text-[#F04747]"}`}>
              {journalStats.net >= 0 ? "+" : ""}
              {formatCurrency(journalStats.net)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121417] border border-[#2A2D31] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Win Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base sm:text-lg font-black text-white">{journalStats.winRate}%</span>
              <span className="text-[10px] font-semibold text-gray-500">({journalStats.wins}W / {journalStats.losses}L)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121417] border border-[#2A2D31] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Trade</span>
            <div className={`text-base sm:text-lg font-black tracking-tight mt-1 ${journalStats.avgTrade >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {journalStats.avgTrade >= 0 ? "+" : ""}
              {formatCurrency(journalStats.avgTrade)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121417] border border-[#2A2D31] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Records</span>
            <div className="text-base sm:text-lg font-black text-white mt-1">
              {journalStats.total} {journalStats.total === 1 ? "Trade" : "Trades"}
            </div>
          </div>
        </div>
      )}

      {/* Free Tier Limit Notification Banner */}
      {!isUnlimitedUser && isLimitReached && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#1E2023] to-[#121417] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                Free Community Tier Quota Reached ({userLogsCount}/{FREE_LOG_LIMIT} Trades)
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                You have reached your 10 free trade logs limit. Upgrade to SyncPL Pro to unlock unlimited trade logging, full historical P&L analytics, and bespoke desk skins.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenUpgradeModal?.("logs_limit")}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Crown className="w-3.5 h-3.5 text-black" />
            <span>Upgrade to Pro ($25/mo)</span>
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="glass-panel p-3 rounded flex gap-4 items-center justify-between flex-wrap border border-[#2A2D31] bg-[#121417]">
        {/* Scope selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#8E9297] uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scope:</span>
          </div>
          <button
            onClick={() => setScope("all")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              scope === "all" ? "bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40" : "text-[#8E9297] hover:text-white border border-transparent"
            }`}
          >
            Group Entries
          </button>
          <button
            onClick={() => setScope("me")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              scope === "me" ? "bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40" : "text-[#8E9297] hover:text-white border border-transparent"
            }`}
          >
            Only Me
          </button>
        </div>

        {/* Account Type Ledger Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#8E9297] uppercase tracking-wider mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Account:</span>
          </div>
          <button
            onClick={() => setAccountFilter("all")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
              accountFilter === "all"
                ? "bg-white/10 text-white border border-white/20"
                : "text-[#8E9297] hover:text-white border border-transparent"
            }`}
          >
            All Accounts ({safeLogs.length})
          </button>
          {(["funded", "live", "eval", "practice"] as const).map((type) => {
            const cfg = accountTypeConfig[type];
            const isActive = accountFilter === type;
            const count = accountBreakdown[type].count;
            return (
              <button
                key={type}
                onClick={() => setAccountFilter(type)}
                className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider transition cursor-pointer border flex items-center gap-1.5 ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {type === "practice" && <FlaskConical className="w-3 h-3 text-sky-400" />}
                <span>{cfg.shortLabel}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Strategy Filter */}
        {availableStrategies.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#8E9297] uppercase tracking-wider mr-1">
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>Strategy:</span>
            </div>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="bg-[#121417] border border-[#2A2D31] text-xs text-white rounded px-2.5 py-1 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Strategies ({pnlLogs.length})</option>
              {availableStrategies.map((strat) => (
                <option key={strat} value={strat}>
                  {strat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 🌟 Interactive Account Composition Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Funded */}
        <div
          onClick={() => setAccountFilter(accountFilter === "funded" ? "all" : "funded")}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            accountFilter === "funded"
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-sm"
              : "bg-[#121417] border-[#2A2D31] hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Funded Prop</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-sm font-black text-white mt-1">{formatCurrency(accountBreakdown.funded.net)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{accountBreakdown.funded.count} recorded trades</p>
        </div>

        {/* Eval */}
        <div
          onClick={() => setAccountFilter(accountFilter === "eval" ? "all" : "eval")}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            accountFilter === "eval"
              ? "bg-amber-500/15 border-amber-500/50 shadow-sm"
              : "bg-[#121417] border-[#2A2D31] hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Combine / Eval</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <p className="text-sm font-black text-white mt-1">{formatCurrency(accountBreakdown.eval.net)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{accountBreakdown.eval.count} recorded trades</p>
        </div>

        {/* Live */}
        <div
          onClick={() => setAccountFilter(accountFilter === "live" ? "all" : "live")}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            accountFilter === "live"
              ? "bg-indigo-500/15 border-indigo-500/50 shadow-sm"
              : "bg-[#121417] border-[#2A2D31] hover:border-indigo-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Live Broker</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
          </div>
          <p className="text-sm font-black text-white mt-1">{formatCurrency(accountBreakdown.live.net)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{accountBreakdown.live.count} recorded trades</p>
        </div>

        {/* Practice - Specially Highlighted */}
        <div
          onClick={() => setAccountFilter(accountFilter === "practice" ? "all" : "practice")}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            accountFilter === "practice"
              ? "bg-sky-500/20 border-sky-500/60 shadow-sm"
              : "bg-[#121417] border-[#2A2D31] hover:border-sky-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3" /> Practice (Sim)
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <p className="text-sm font-black text-sky-300 mt-1">{formatCurrency(accountBreakdown.practice.net)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{accountBreakdown.practice.count} sim rehearsal drills</p>
        </div>
      </div>

      {/* 🌟 Bulk Action Toolbar (When 1 or more logs are selected) */}
      {selectedLogIds.size > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-[#1A1D24] to-[#121417] p-3.5 rounded-xl border border-indigo-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/40 rounded-lg">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black text-white">
                {selectedLogIds.size} trade{selectedLogIds.size > 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-bold">Selected Net P&L:</span>
              <span
                className={`font-black ${
                  selectedTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(selectedTotalPnl)}
              </span>
            </div>

            {deletableFilteredLogs.length > selectedLogIds.size && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs text-indigo-300 hover:text-white underline font-bold cursor-pointer"
              >
                Select all {deletableFilteredLogs.length} matching trades
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
            >
              Cancel Selection
            </button>

            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg shadow-lg shadow-rose-950/50 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isBulkDeleting
                  ? `Deleting ${selectedLogIds.size}...`
                  : `Bulk Delete (${selectedLogIds.size})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="glass-panel rounded overflow-hidden border border-[#2A2D31]">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto font-sans">
            <table className="min-w-full divide-y divide-[#2A2D31]">
              <thead className="bg-[#121417]">
                <tr className="text-left text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
                  <th scope="col" className="pl-4 pr-2 py-4 w-8">
                    {deletableFilteredLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="flex items-center text-gray-400 hover:text-white cursor-pointer"
                        title={isAllSelected ? "Deselect All" : "Select All Deletable"}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : isSomeSelected ? (
                          <MinusSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    )}
                  </th>
                  <th scope="col" className="px-4 py-4">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Trader
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Account
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Asset
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Strategy / Notes
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    P&L Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2D31]">
                {filteredLogs.map((log, idx) => {
                  const isProfit = log.amount >= 0;
                  const amtStr = formatCurrency(log.amount);
                  const isOwner = !log.userId || log.userId === userId || log.username === username;
                  const canDelete = isOwner || isCreatorOrMod;
                  const isSelected = selectedLogIds.has(log.id);
                  const acct = (log.accountType || "funded") as AccountType;
                  const acctCfg = accountTypeConfig[acct] || accountTypeConfig.funded;
                  const isPractice = acct === "practice";

                  return (
                    <tr
                      key={`${log.id}_${idx}`}
                      className={`transition duration-150 ${
                        isSelected
                          ? "bg-indigo-950/30 hover:bg-indigo-950/40 border-l-2 border-indigo-500"
                          : isPractice
                          ? "bg-sky-950/10 hover:bg-sky-950/20"
                          : "hover:bg-[#1E2023]/40"
                      }`}
                    >
                      <td className="pl-4 pr-2 py-4 whitespace-nowrap">
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(log.id)}
                            className="flex items-center text-gray-400 hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-600 hover:text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-[#8E9297] font-medium">
                        {log.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-300">{log.username}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${acctCfg.bg} ${acctCfg.text} ${acctCfg.border}`}
                        >
                          {isPractice && <FlaskConical className="w-3 h-3 text-sky-400" />}
                          <span>{acctCfg.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[#1E2023] text-indigo-400 border border-[#2A2D31]">
                          {log.asset}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 max-w-xs truncate">
                        <span className="font-bold text-indigo-300 mr-2 uppercase text-[9px] border border-[#2A2D31] px-1 py-0.5 rounded bg-[#121417]">
                          {log.strategy}
                        </span>
                        {log.notes || <span className="text-gray-600 italic">No notes</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                        <span className={isProfit ? "text-[#43B581]" : "text-[#F04747]"}>
                          {isProfit ? "+" : ""}
                          {amtStr}
                        </span>
                        {isPractice ? (
                          <span className="block text-[9px] font-black uppercase tracking-wider text-sky-400">
                            🧪 Simulated
                          </span>
                        ) : (
                          <span className="block text-[9px] text-gray-500 uppercase tracking-wider">
                            {acct === "live" ? "Real Live" : acct === "eval" ? "Eval Test" : "Funded Prop"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedFlexLog(log)}
                            className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition cursor-pointer"
                            title="Generate Shareable Flex Card"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                          {(isOwner || isCreatorOrMod) && (
                            <button
                              onClick={() => onDeleteLog(log.id, log.asset, log.amount)}
                              className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                              title={isOwner ? "Delete Log Entry" : "Delete Log Entry (Admin/Mod Control)"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center text-gray-400 flex flex-col items-center justify-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1E2023] border border-[#2A2D31] text-indigo-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white">
                {safeLogs.length === 0 ? "Your Trade Journal is Empty" : "No Trades Match Current Filters"}
              </h4>
              <p className="text-xs text-[#8E9297] leading-relaxed">
                {safeLogs.length === 0
                  ? "Start tracking your trading executions to unlock real-time win-rate metrics, desk equity curves, strategy analytics, and shareable verified P&L cards."
                  : "Try clearing your account or strategy filters to view your other logged trades."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-center pt-2">
              <button
                type="button"
                onClick={handleAddRecordClick}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Trade</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Import Broker CSV</span>
              </button>

              {!showGuide && (
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-gray-300 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How It Works</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shareable Flex Card Modal */}
      <CleanFlexCardModal
        isOpen={!!selectedFlexLog}
        onClose={() => setSelectedFlexLog(null)}
        tradeLog={selectedFlexLog}
        trader={safeTraders.find((t) => t && t.username === selectedFlexLog?.username)}
        deskName="SyncPL Ledger"
        roomCode={roomCode}
      />

      {/* Bulk Trade Import Modal */}
      {onImportTrades && (
        <ImportTradesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={onImportTrades}
          currentAccountType={accountFilter === "all" ? "funded" : accountFilter}
          roomCode={roomCode}
          existingLogs={safeLogs}
          currentUserId={safeTraders.find((t) => t && t.username === username)?.id}
        />
      )}
    </div>
  );
}
