import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { AccountType } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

export interface ParsedImportTrade {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  asset: string;
  amount: number;
  strategy: string;
  accountType: AccountType;
  notes: string;
  win: boolean;
  raw?: any;
}

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trades: ParsedImportTrade[]) => Promise<void>;
  currentAccountType?: AccountType;
  roomCode: string;
}

export default function ImportTradesModal({
  isOpen,
  onClose,
  onImport,
  currentAccountType = "funded",
  roomCode,
}: ImportTradesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsedTrades, setParsedTrades] = useState<ParsedImportTrade[]>([]);
  const [defaultAccountType, setDefaultAccountType] = useState<AccountType>(currentAccountType);
  const [defaultStrategy, setDefaultStrategy] = useState<string>("Imported Trade");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // CSV parsing helper
  const parseCSVText = (text: string): ParsedImportTrade[] => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file does not contain enough data or is empty.");
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

    // Map column indices
    const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time") || h.includes("day") || h.includes("timestamp"));
    const pnlIdx = headers.findIndex((h) => h.includes("pnl") || h.includes("p&l") || h.includes("amount") || h.includes("profit") || h.includes("net") || h.includes("gain") || h.includes("return"));
    const assetIdx = headers.findIndex((h) => h.includes("asset") || h.includes("symbol") || h.includes("ticker") || h.includes("contract") || h.includes("instrument") || h.includes("pair"));
    const strategyIdx = headers.findIndex((h) => h.includes("strategy") || h.includes("setup") || h.includes("tag") || h.includes("playbook") || h.includes("type"));
    const accountIdx = headers.findIndex((h) => h.includes("account") || h.includes("acct") || h.includes("broker") || h.includes("tier"));
    const notesIdx = headers.findIndex((h) => h.includes("notes") || h.includes("comment") || h.includes("desc") || h.includes("description") || h.includes("reason"));

    if (pnlIdx === -1) {
      throw new Error("Could not find a P&L, Profit, or Amount column in the CSV header. Please check your file formatting.");
    }

    const todayStr = getLocalDateString(new Date());
    const validTrades: ParsedImportTrade[] = [];

    // Helper for CSV line splitting with quotation quotes
    const splitCsvRow = (rowStr: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (inQuotes && rowStr[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = splitCsvRow(line);
      const rawPnl = cols[pnlIdx] !== undefined ? cols[pnlIdx] : "";
      
      // Clean and extract numeric P&L
      const cleanPnlStr = rawPnl.replace(/[\$,]/g, "").replace(/\((.*?)\)/, "-$1").trim();
      const amount = parseFloat(cleanPnlStr);
      if (isNaN(amount)) continue;

      // Extract or normalize date
      let parsedDate = todayStr;
      let parsedTime = "12:00";
      if (dateIdx !== -1 && cols[dateIdx]) {
        const rawDate = cols[dateIdx].replace(/^["']|["']$/g, "").trim();
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            parsedDate = getLocalDateString(d);
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            parsedTime = `${hh}:${mm}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            parsedDate = rawDate;
          } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(rawDate)) {
            const parts = rawDate.split("/");
            const mm = parts[0].padStart(2, "0");
            const dd = parts[1].padStart(2, "0");
            const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            parsedDate = `${yyyy}-${mm}-${dd}`;
          }
        } catch {
          parsedDate = todayStr;
        }
      }

      // Extract asset
      let asset = "NQ";
      if (assetIdx !== -1 && cols[assetIdx]) {
        asset = cols[assetIdx].replace(/[^a-zA-Z0-9\/\-_]/g, "").toUpperCase() || "NQ";
      }

      // Extract strategy
      let strategy = defaultStrategy || "Imported Trade";
      if (strategyIdx !== -1 && cols[strategyIdx]) {
        const rawStrat = cols[strategyIdx].replace(/^["']|["']$/g, "").trim();
        if (rawStrat) strategy = rawStrat;
      }

      // Extract account type
      let accountType: AccountType = defaultAccountType;
      if (accountIdx !== -1 && cols[accountIdx]) {
        const rawAcct = cols[accountIdx].toLowerCase();
        if (rawAcct.includes("live") || rawAcct.includes("cash") || rawAcct.includes("real")) {
          accountType = "live";
        } else if (rawAcct.includes("eval") || rawAcct.includes("combine") || rawAcct.includes("challenge") || rawAcct.includes("test")) {
          accountType = "eval";
        } else if (rawAcct.includes("practice") || rawAcct.includes("sim") || rawAcct.includes("demo") || rawAcct.includes("paper")) {
          accountType = "practice";
        } else if (rawAcct.includes("funded") || rawAcct.includes("prop") || rawAcct.includes("apex") || rawAcct.includes("topstep")) {
          accountType = "funded";
        }
      }

      // Extract notes
      let notes = "";
      if (notesIdx !== -1 && cols[notesIdx]) {
        notes = cols[notesIdx].replace(/^["']|["']$/g, "").trim();
      }

      validTrades.push({
        date: parsedDate,
        time: parsedTime,
        asset,
        amount,
        strategy,
        accountType,
        notes,
        win: amount >= 0,
      });
    }

    return validTrades;
  };

  const handleFileProcess = (selectedFile: File) => {
    setErrorMsg("");
    setFile(selectedFile);
    setFileName(selectedFile.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          setErrorMsg("File appears to be empty.");
          return;
        }

        // Check if JSON format
        if (selectedFile.name.endsWith(".json")) {
          const json = JSON.parse(content);
          const rawArr = Array.isArray(json) ? json : json.trades || json.logs || [];
          if (!rawArr.length) {
            throw new Error("No trades array found in JSON file.");
          }
          const todayStr = getLocalDateString(new Date());
          const list: ParsedImportTrade[] = rawArr.map((item: any) => {
            const amt = parseFloat(item.amount || item.pnl || item.profit || item.net || 0);
            return {
              date: item.date || todayStr,
              time: item.time || "12:00",
              asset: (item.asset || item.symbol || "NQ").toUpperCase(),
              amount: isNaN(amt) ? 0 : amt,
              strategy: item.strategy || defaultStrategy || "Imported Trade",
              accountType: (item.accountType || defaultAccountType) as AccountType,
              notes: item.notes || item.description || "",
              win: isNaN(amt) ? true : amt >= 0,
            };
          });
          setParsedTrades(list);
        } else {
          // Parse CSV
          const trades = parseCSVText(content);
          if (trades.length === 0) {
            setErrorMsg("No valid trade records could be extracted from this CSV file.");
          } else {
            setParsedTrades(trades);
          }
        }
      } catch (err: any) {
        console.error("Trade import error:", err);
        setErrorMsg(err.message || "Failed to parse file. Ensure it is a valid CSV with a header row.");
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
    };

    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleExecuteImport = async () => {
    if (parsedTrades.length === 0) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      // Re-apply any default account type or strategy if user adjusted them
      const finalTrades = parsedTrades.map((t) => ({
        ...t,
        accountType: t.accountType || defaultAccountType,
        strategy: t.strategy || defaultStrategy,
      }));

      await onImport(finalTrades);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to commit imported trades to database.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName("");
    setParsedTrades([]);
    setErrorMsg("");
  };

  // Preview totals
  const totalNetPnl = parsedTrades.reduce((acc, t) => acc + t.amount, 0);
  const totalWins = parsedTrades.filter((t) => t.amount >= 0).length;
  const winRate = parsedTrades.length > 0 ? Math.round((totalWins / parsedTrades.length) * 100) : 0;

  return (
    <div id="import-trades-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121418] border border-[#262A30] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#22262C] flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-[#161920] to-[#121418]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                Import Trades to Ledger Logs
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  CSV / JSON
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Bulk import historical trades from Tradovate, NinjaTrader, TradeZella, or custom spreadsheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-grow text-gray-300 text-xs">
          {/* Target Account & Default Strategy Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A0C0E] p-3.5 rounded-xl border border-[#22262C]">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Default Account Category
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["funded", "live", "eval", "practice"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDefaultAccountType(type)}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                      defaultAccountType === type
                        ? type === "funded"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : type === "live"
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                          : type === "eval"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-[#14171B] text-gray-400 border-[#22262C] hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Default Strategy / Setup Tag
              </label>
              <input
                type="text"
                value={defaultStrategy}
                onChange={(e) => setDefaultStrategy(e.target.value)}
                placeholder="e.g. Breakout, Scalp, ORB, ICT"
                className="w-full bg-[#14171B] border border-[#22262C] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Upload Area or Preview Table */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-[#262A30] hover:border-indigo-500/50 bg-[#0A0C0E]/50 hover:bg-[#0A0C0E]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-white">
                Drag & drop your CSV or JSON ledger file
              </h4>
              <p className="text-[11px] text-gray-400 mt-1 max-w-sm">
                Supports exports with columns for Date, Symbol/Asset, P&L/Amount, Strategy, and Account Type.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#161920] border border-[#262A30] text-[10px] font-bold text-gray-300">
                  Standard CSV Format
                </span>
                <span className="px-2.5 py-1 rounded bg-[#161920] border border-[#262A30] text-[10px] font-bold text-gray-300">
                  TradeZella / NinjaTrader
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Info Bar */}
              <div className="bg-[#0A0C0E] border border-[#22262C] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white truncate max-w-xs">{fileName}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      {parsedTrades.length} trades identified and validated
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Another</span>
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#14171B] p-2.5 rounded-xl border border-[#22262C] text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    Total Records
                  </span>
                  <span className="text-base font-black text-white">{parsedTrades.length}</span>
                </div>
                <div className="bg-[#14171B] p-2.5 rounded-xl border border-[#22262C] text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    Net Sum P&L
                  </span>
                  <span
                    className={`text-base font-black ${
                      totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(totalNetPnl)}
                  </span>
                </div>
                <div className="bg-[#14171B] p-2.5 rounded-xl border border-[#22262C] text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    Win Rate
                  </span>
                  <span
                    className={`text-base font-black ${
                      winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {winRate}%
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-[#22262C] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#0A0C0E] text-gray-400 font-bold sticky top-0 border-b border-[#22262C]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Account</th>
                      <th className="p-2">Strategy</th>
                      <th className="p-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2127]">
                    {parsedTrades.slice(0, 50).map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition">
                        <td className="p-2 text-gray-400">{t.date}</td>
                        <td className="p-2 font-bold text-indigo-300">{t.asset}</td>
                        <td className="p-2">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                            {t.accountType || defaultAccountType}
                          </span>
                        </td>
                        <td className="p-2 text-gray-300 truncate max-w-[120px]">
                          {t.strategy || defaultStrategy}
                        </td>
                        <td
                          className={`p-2 font-black text-right ${
                            t.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedTrades.length > 50 && (
                <p className="text-[10px] text-gray-500 italic text-center">
                  Showing first 50 of {parsedTrades.length} trades. All records will be imported.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Example Format Guide Accordion */}
          <div className="bg-[#0A0C0E] border border-[#22262C] p-3 rounded-xl flex items-start gap-2 text-[11px] text-gray-400">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-200 block">Accepted CSV Columns:</span>
              <span>
                <code className="text-indigo-300 font-mono">Date, Asset, Amount (or P&L), Strategy, Account Type, Notes</code>.
                Headers are automatically detected case-insensitively.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#22262C] bg-[#0A0C0E] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {parsedTrades.length > 0 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing {parsedTrades.length} Trades...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Import {parsedTrades.length} Trades to Ledger</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
