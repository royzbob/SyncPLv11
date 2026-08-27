import React, { useState, useMemo } from "react";
import {
  Download,
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
  Zap,
} from "lucide-react";
import { PnlLog, UserProfile, AccountType } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";
import { isImageAvatar } from "../utils/presence";

interface LogsViewProps {
  pnlLogs: PnlLog[];
  userId: string;
  username: string;
  onDeleteLog: (id: string, asset: string, amount: number) => Promise<void>;
  onOpenLogModal: () => void;
  roomCode: string;
  traders: UserProfile[];
  isCreatorOrMod?: boolean;
  isPremium?: boolean;
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
}

const accountTypeConfig: Record<
  AccountType,
  { label: string; bg: string; text: string; border: string }
> = {
  funded: {
    label: "Funded",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  live: {
    label: "Live",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  eval: {
    label: "Eval",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  practice: {
    label: "Practice",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/30",
  },
};

export default function LogsView({
  pnlLogs,
  userId,
  username,
  onDeleteLog,
  onOpenLogModal,
  roomCode,
  traders,
  isCreatorOrMod = false,
  isPremium = false,
  onOpenUpgradeModal,
}: LogsViewProps) {
  const [scope, setScope] = useState<"all" | "me">("all");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [selectedFlexLog, setSelectedFlexLog] = useState<PnlLog | null>(null);
  const [copiedState, setCopiedState] = useState(false);

  // Determine if user has unlimited access (Pro subscriber or Room Creator / App Owner / Mod)
  const isUnlimitedUser = isPremium || isCreatorOrMod;

  // Compute how many logs the current user has created
  const userLogsCount = useMemo(() => {
    return pnlLogs.filter((l) => l.userId === userId).length;
  }, [pnlLogs, userId]);

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
    pnlLogs.forEach((log) => {
      if (log.strategy && log.strategy.trim()) {
        set.add(log.strategy.trim());
      }
    });
    return Array.from(set).sort();
  }, [pnlLogs]);

  // Filter list
  const filteredLogs = pnlLogs.filter((log) => {
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

  const handleExportCSV = () => {
    if (pnlLogs.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Date,Trader,Asset,Account Type,Strategy,Notes,P&L Amount,Status\n";

    pnlLogs.forEach((log) => {
      const status = log.amount >= 0 ? "Profit" : "Loss";
      const notesClean = log.notes ? log.notes.replace(/"/g, '""') : "";
      const acctClean = (log.accountType || "Funded").toUpperCase();
      csvContent += `"${log.date}","${log.username}","${log.asset}","${acctClean}","${log.strategy}","${notesClean}",${log.amount},"${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SyncPL-Ledger-${roomCode}-${getLocalDateString()}.csv`);
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-2xl text-white tracking-tight">Ledger Logs</h3>
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
          <p className="text-xs text-[#8E9297] mt-1">
            Comprehensive multi-account ledger logs reported within active workspace
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-[#8E9297] hover:text-white font-bold text-xs px-3 py-2 rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handleAddRecordClick}
            className={`font-bold text-xs px-3.5 py-2 rounded transition flex items-center gap-1.5 cursor-pointer shadow ${
              isLimitReached
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                : "bg-[#5865F2] hover:bg-[#4752C4] text-white"
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
                <span>Add Record</span>
              </>
            )}
          </button>
        </div>
      </div>

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
            All Accounts
          </button>
          {(["funded", "live", "eval", "practice"] as const).map((type) => {
            const cfg = accountTypeConfig[type];
            const isActive = accountFilter === type;
            return (
              <button
                key={type}
                onClick={() => setAccountFilter(type)}
                className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider transition cursor-pointer border ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {cfg.label}
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

      {/* Ledger Table */}
      <div className="glass-panel rounded overflow-hidden border border-[#2A2D31]">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto font-sans">
            <table className="min-w-full divide-y divide-[#2A2D31]">
              <thead className="bg-[#121417]">
                <tr className="text-left text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
                  <th scope="col" className="px-6 py-4">
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
                  const acct = log.accountType || "funded";
                  const acctCfg = accountTypeConfig[acct] || accountTypeConfig.funded;

                  return (
                    <tr key={`${log.id}_${idx}`} className="hover:bg-[#1E2023]/40 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-[#8E9297] font-medium">
                        {log.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-300">{log.username}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase border ${acctCfg.bg} ${acctCfg.text} ${acctCfg.border}`}
                        >
                          {acctCfg.label}
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
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <FolderOpen className="w-12 h-12 text-gray-600 mb-2 animate-pulse" />
            <p className="text-sm font-semibold">No P&L sync records found for selected filter.</p>
          </div>
        )}
      </div>

      {/* Shareable Flex Card Modal */}
      {selectedFlexLog && (() => {
        const logTrader = traders?.find((t) => t.username === selectedFlexLog.username);
        const initials = selectedFlexLog.username.substring(0, 2).toUpperCase();
        const avatarBgClass =
          logTrader?.avatarColor === "pink"
            ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
            : logTrader?.avatarColor === "emerald"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : logTrader?.avatarColor === "amber"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : logTrader?.avatarColor === "sky"
            ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";

        const flexAcct = selectedFlexLog.accountType || "funded";
        const flexAcctCfg = accountTypeConfig[flexAcct] || accountTypeConfig.funded;

        return (
          <div className="fixed inset-0 z-50 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-200">
              <div className="glass-panel p-6 rounded-2xl border border-[#2A2D31] text-center relative overflow-hidden shadow-2xl bg-[#1E2023]">
                {/* Ambient glow backgrounds */}
                <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 filter blur-3xl" />
                <div className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-pink-500/10 filter blur-3xl" />

                {/* Card Header Info */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded text-white">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                      SYNCPL VERIFIED
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-[#8E9297] uppercase">
                    {selectedFlexLog.date.replace(/-/g, "/")}
                  </span>
                </div>

                {/* Main performance stats */}
                <div className="space-y-4 relative z-10 my-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-[#8E9297] font-bold tracking-widest uppercase">
                      LEDGER PERFORMANCE FLEX
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${flexAcctCfg.bg} ${flexAcctCfg.text} ${flexAcctCfg.border}`}
                    >
                      {flexAcctCfg.label}
                    </span>
                  </div>
                  <p
                    className={`text-4xl font-black tracking-tight ${
                      selectedFlexLog.amount >= 0 ? "text-[#43B581]" : "text-[#F04747]"
                    }`}
                  >
                    {selectedFlexLog.amount >= 0 ? "+" : ""}
                    {formatCurrency(selectedFlexLog.amount)}
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#08090A] border border-[#2A2D31] rounded-lg text-xs font-mono uppercase font-bold text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" />
                    <span>{selectedFlexLog.asset}</span>
                  </div>

                  <p className="text-xs text-gray-300 italic max-w-xs mx-auto px-4">
                    {selectedFlexLog.notes
                      ? `"${selectedFlexLog.notes}"`
                      : '"Executed technical breakout set support level."'}
                  </p>
                </div>

                {/* Footer containing authentication & matching profile picture */}
                <div className="pt-4 border-t border-[#2A2D31] mt-6 relative z-10 flex justify-between items-center text-left text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Trader Profile Picture */}
                    {isImageAvatar(logTrader?.avatarType, logTrader?.avatarVal) ? (
                      <div className="w-8 h-8 rounded-full border border-[#2A2D31] overflow-hidden flex items-center justify-center bg-[#08090A] shrink-0">
                        <img
                          src={logTrader.avatarVal}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${avatarBgClass}`}
                      >
                        {typeof logTrader?.avatarVal === "string" && logTrader.avatarVal.length < 8 ? logTrader.avatarVal : initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block text-[8px] text-[#72767D] uppercase tracking-wider font-extrabold">
                        AUTHENTICATED TRADER
                      </span>
                      <span className="font-bold text-gray-200 truncate block">
                        {selectedFlexLog.username}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-[8px] text-[#72767D] uppercase tracking-wider font-extrabold">
                      VERIFICATION SIGN
                    </span>
                    <span className="font-mono font-bold text-indigo-400">
                      {selectedFlexLog.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setSelectedFlexLog(null)}
                  className="w-1/3 bg-[#121417] hover:bg-[#08090A] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2 rounded transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyFlexCardText}
                  className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2 rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clipboard className="w-4 h-4" /> {copiedState ? "Copied to Clipboard!" : "Copy Verification Text"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
