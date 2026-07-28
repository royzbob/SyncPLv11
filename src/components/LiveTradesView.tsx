import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Play,
  Square,
  Trash2,
  Target,
  ShieldAlert,
  Activity,
  AlertCircle,
  Clock,
  User,
  ArrowRightLeft,
  XCircle,
  Sparkles,
  ListTodo
} from "lucide-react";
import { LiveTrade, UserProfile, TradingRule } from "../types";
import { formatCurrency } from "../utils/helpers";

interface LiveTradesViewProps {
  liveTrades: LiveTrade[];
  userId: string;
  username: string;
  roomCode: string;
  traders: UserProfile[];
  rules: TradingRule[];
  onAddLiveTrade: (payload: {
    asset: string;
    direction: "long" | "short";
    entryPrice: number;
    tp: number;
    sl: number;
    quantity: number;
    notes: string;
  }) => Promise<void>;
  onCloseLiveTrade: (id: string, outcome: "TP" | "SL" | "manual", finalPrice: number, profitAmount: number) => Promise<void>;
  onUpdateTradePrice: (id: string, currentPrice: number) => Promise<void>;
  onDeleteLiveTrade: (id: string) => Promise<void>;
  onTriggerPriceFluctuation: () => void;
  isCreatorOrMod?: boolean;
  userTier?: string;
}

export default function LiveTradesView({
  liveTrades,
  userId,
  username,
  roomCode,
  traders,
  rules = [],
  onAddLiveTrade,
  onCloseLiveTrade,
  onUpdateTradePrice,
  onDeleteLiveTrade,
  onTriggerPriceFluctuation,
  isCreatorOrMod = false,
  userTier = "free",
}: LiveTradesViewProps) {
  const [scope, setScope] = useState<"all" | "me">("all");
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);

  // Form states
  const [tradeAsset, setTradeAsset] = useState("BTC/USD");
  const [tradeDirection, setTradeDirection] = useState<"long" | "short">("long");
  const [tradeEntryPrice, setTradeEntryPrice] = useState("");
  const [tradeTP, setTradeTP] = useState("");
  const [tradeSL, setTradeSL] = useState("");
  const [tradeQuantity, setTradeQuantity] = useState("1");
  const [tradeNotes, setTradeNotes] = useState("");
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});

  // Risk Sizing Calculator States
  const [calcBalance, setCalcBalance] = useState("10000");
  const [calcRiskPct, setCalcRiskPct] = useState("1.0");

  const calculatedRiskQuantity = useMemo(() => {
    const balance = parseFloat(calcBalance);
    const riskPct = parseFloat(calcRiskPct);
    const entry = parseFloat(tradeEntryPrice);
    const sl = parseFloat(tradeSL);

    if (isNaN(balance) || isNaN(riskPct) || isNaN(entry) || isNaN(sl) || entry === sl) {
      return null;
    }

    const riskCapital = balance * (riskPct / 100);
    const stopLossDistance = Math.abs(entry - sl);
    const qty = riskCapital / stopLossDistance;
    return isNaN(qty) || qty <= 0 ? null : parseFloat(qty.toFixed(4));
  }, [calcBalance, calcRiskPct, tradeEntryPrice, tradeSL]);

  const filteredTrades = useMemo(() => {
    return liveTrades.filter((t) => {
      if (scope === "me") return t.userId === userId;
      return true;
    });
  }, [liveTrades, scope, userId]);

  // Split open vs closed
  const openTrades = useMemo(() => filteredTrades.filter((t) => t.status === "open"), [filteredTrades]);
  const closedTrades = useMemo(() => filteredTrades.filter((t) => t.status === "closed"), [filteredTrades]);

  // Aggregate stats
  const stats = useMemo(() => {
    let activeLongs = 0;
    let activeShorts = 0;
    let totalUnrealizedPnl = 0;
    let totalRealizedPnl = 0;
    let closedWins = 0;
    let closedTotal = 0;

    filteredTrades.forEach((t) => {
      // Quantity is parsed or defaults to 1
      const qty = (t as any).quantity || 1;
      if (t.status === "open") {
        const diff = t.direction === "long" ? t.currentPrice - t.entryPrice : t.entryPrice - t.currentPrice;
        const unrealized = diff * qty;
        totalUnrealizedPnl += unrealized;

        if (t.direction === "long") activeLongs++;
        else activeShorts++;
      } else {
        const realized = t.profitAmount || 0;
        totalRealizedPnl += realized;
        closedTotal++;
        if (realized >= 0) {
          closedWins++;
        }
      }
    });

    const winRate = closedTotal > 0 ? Math.round((closedWins / closedTotal) * 100) : 0;

    return {
      activeLongs,
      activeShorts,
      totalUnrealizedPnl,
      totalRealizedPnl,
      closedTotal,
      winRate,
    };
  }, [filteredTrades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(tradeEntryPrice);
    const tpVal = parseFloat(tradeTP);
    const slVal = parseFloat(tradeSL);
    const qtyVal = parseFloat(tradeQuantity);

    if (isNaN(entry) || isNaN(tpVal) || isNaN(slVal) || isNaN(qtyVal) || qtyVal <= 0) {
      alert("Please check that entry, TP, SL, and Quantity are valid positive numbers.");
      return;
    }

    // Mandatory rule checklist check
    if (rules && rules.length > 0) {
      const allChecked = rules.every((r) => !!checkedRules[r.id]);
      if (!allChecked) {
        alert("Action Blocked: You must check off all mandatory confirmation rules before entering a trade position!");
        return;
      }
    }

    // Basic validity checks
    if (tradeDirection === "long") {
      if (tpVal <= entry) {
        alert("For Longs, Take Profit (TP) must be greater than Entry Price.");
        return;
      }
      if (slVal >= entry) {
        alert("For Longs, Stop Loss (SL) must be less than Entry Price.");
        return;
      }
    } else {
      if (tpVal >= entry) {
        alert("For Shorts, Take Profit (TP) must be less than Entry Price.");
        return;
      }
      if (slVal <= entry) {
        alert("For Shorts, Stop Loss (SL) must be greater than Entry Price.");
        return;
      }
    }

    await onAddLiveTrade({
      asset: tradeAsset.toUpperCase(),
      direction: tradeDirection,
      entryPrice: entry,
      tp: tpVal,
      sl: slVal,
      quantity: qtyVal,
      notes: tradeNotes,
    });

    // Reset form
    setIsNewTradeOpen(false);
    setTradeEntryPrice("");
    setTradeTP("");
    setTradeSL("");
    setTradeQuantity("1");
    setTradeNotes("");
    setCheckedRules({});
  };

  // Preset assets for quick entry
  const presetAssets = [
    { name: "BTC/USD", defaultPrice: 92840.0 },
    { name: "ETH/USD", defaultPrice: 3420.0 },
    { name: "NQ", defaultPrice: 19850.0 },
    { name: "SNP500", defaultPrice: 5430.0 },
    { name: "GOLD", defaultPrice: 2380.0 },
    { name: "EUR/USD", defaultPrice: 1.0825 }
  ];

  const handleSelectAssetPreset = (assetName: string) => {
    setTradeAsset(assetName);
    const preset = presetAssets.find((p) => p.name === assetName);
    if (preset) {
      setTradeEntryPrice(preset.defaultPrice.toString());
      if (tradeDirection === "long") {
        setTradeTP((preset.defaultPrice * 1.01).toFixed(2));
        setTradeSL((preset.defaultPrice * 0.99).toFixed(2));
      } else {
        setTradeTP((preset.defaultPrice * 0.99).toFixed(2));
        setTradeSL((preset.defaultPrice * 1.01).toFixed(2));
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto h-full text-[#DCDDDE]">
      {/* View Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-[#5865F2]/10 text-indigo-400 rounded">
              <Activity className="w-5 h-5 animate-pulse" />
            </span>
            <h3 className="font-black text-2xl text-white tracking-tight">Live Trading Desk</h3>
          </div>
          <p className="text-xs text-[#8E9297] mt-1">
            Track active trades in real-time with automatic TP/SL alerts across your team
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onTriggerPriceFluctuation}
            disabled={openTrades.length === 0}
            className={`font-bold text-xs px-3 py-2 rounded transition flex items-center gap-1.5 cursor-pointer ${
              openTrades.length === 0
                ? "bg-[#1E2023] border border-[#2A2D31] text-gray-600 cursor-not-allowed"
                : "bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400"
            }`}
            title="Slightly tick and fluctuate open trade prices to generate real-time market updates"
          >
            <Sparkles className="w-4 h-4 animate-bounce text-emerald-400" />
            <span className="hidden sm:inline">Trigger Price Ticks</span>
            <span className="sm:hidden">Ticks</span>
          </button>
          <button
            onClick={() => setIsNewTradeOpen(true)}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-3 py-2 rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Open Position</span>
            <span className="sm:hidden">Open</span>
          </button>
        </div>
      </div>

      {/* Aggregate HUD stats panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121417]/80 border border-[#2A2D31]/70 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Active Positions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">{openTrades.length}</span>
            <span className="text-xs text-[#8E9297] font-mono">
              ({stats.activeLongs}L / {stats.activeShorts}S)
            </span>
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31]/70 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Unrealized P&L</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-2xl font-black ${stats.totalUnrealizedPnl >= 0 ? "text-[#43B581]" : "text-[#F04747]"}`}>
              {formatCurrency(stats.totalUnrealizedPnl)}
            </span>
            {stats.totalUnrealizedPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#43B581]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#F04747]" />
            )}
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31]/70 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Realized Live P&L</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-2xl font-black ${stats.totalRealizedPnl >= 0 ? "text-[#43B581]" : "text-[#F04747]"}`}>
              {formatCurrency(stats.totalRealizedPnl)}
            </span>
            {stats.totalRealizedPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#43B581]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#F04747]" />
            )}
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31]/70 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Live Win Rate</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-indigo-400">{stats.winRate}%</span>
            <span className="text-[10px] text-[#8E9297] font-semibold ml-2 font-mono">({stats.closedTotal} closed)</span>
          </div>
        </div>
      </div>

      {/* Filter Scope Controls */}
      <div className="glass-panel p-2.5 sm:p-3 rounded-xl flex items-center justify-between flex-wrap gap-2.5 border border-[#2A2D31] bg-[#121417]">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#8E9297] uppercase tracking-wider shrink-0">
          <Clock className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
          <span>Monitor Scope:</span>
        </div>
        <div className="flex rounded-lg p-0.5 bg-[#1E2023] border border-[#2A2D31]/80 shrink-0">
          <button
            onClick={() => setScope("all")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer ${
              scope === "all" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#8E9297] hover:text-white"
            }`}
          >
            All Desk Trades
          </button>
          <button
            onClick={() => setScope("me")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer ${
              scope === "me" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#8E9297] hover:text-white"
            }`}
          >
            Only My Trades
          </button>
        </div>
      </div>

      {/* Grid of Open Live Positions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Active Open Positions ({openTrades.length})
          </h4>
          {openTrades.length > 0 && (
            <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Live Feed Active
            </span>
          )}
        </div>

        {openTrades.length === 0 ? (
          <div className="p-8 text-center bg-[#121417] border border-[#2A2D31]/60 rounded-xl flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="w-8 h-8 text-gray-600" />
            <p className="text-gray-400 text-sm font-bold">No active live trades right now</p>
            <p className="text-[#8E9297] text-xs max-w-xs">
              Open a live position with customizable TP & SL, and watch it fluctuate. Hit targets to lock in ledger P&L!
            </p>
            <button
              onClick={() => setIsNewTradeOpen(true)}
              className="mt-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-indigo-300 font-bold text-xs px-3.5 py-1.5 rounded transition border border-[#5865F2]/30"
            >
              Open New Trade
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {openTrades.map((t, idx) => {
              const qty = (t as any).quantity || 1;
              const diff = t.direction === "long" ? t.currentPrice - t.entryPrice : t.entryPrice - t.currentPrice;
              const unrealized = diff * qty;
              const pnlPercent = (diff / t.entryPrice) * 100;

              // Calculate distance to targets
              const tpDiff = Math.abs(t.tp - t.currentPrice);
              const slDiff = Math.abs(t.sl - t.currentPrice);
              const totalSpan = Math.abs(t.tp - t.sl) || 1;

              // Simple visualization slider percent
              const progressPct = Math.min(100, Math.max(0, ((t.currentPrice - Math.min(t.tp, t.sl)) / totalSpan) * 100));

              return (
                <div
                  key={`${t.id}_${idx}`}
                  className="bg-[#121417] border border-[#2A2D31] rounded-xl overflow-hidden shadow-lg hover:border-indigo-500/30 transition flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-[#2A2D31]/40 flex justify-between items-center bg-[#17191C]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          t.direction === "long" ? "bg-[#43B581]/10 text-[#43B581]" : "bg-[#F04747]/10 text-[#F04747]"
                        }`}
                      >
                        {t.direction}
                      </span>
                      <span className="font-mono font-black text-sm text-white uppercase">{t.asset}</span>
                      <span className="text-[10px] text-gray-500 font-mono">x{qty}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#8E9297] flex items-center gap-1">
                        <User className="w-3 h-3 text-indigo-400" />
                        {t.username}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="p-4 flex-grow space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Entry Price</span>
                        <span className="font-mono text-sm font-extrabold text-gray-300">${t.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Current Price</span>
                        <span className="font-mono text-sm font-black text-white animate-pulse">${t.currentPrice.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* UnRealized P&L HUD */}
                    <div className="bg-[#1E2023] p-3 rounded-lg border border-[#2A2D31]/40 text-center">
                      <span className="text-[9px] font-bold text-[#8E9297] uppercase tracking-widest block">Unrealized profit/loss</span>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className={`text-xl font-black ${unrealized >= 0 ? "text-[#43B581]" : "text-[#F04747]"}`}>
                          {unrealized >= 0 ? "+" : ""}{formatCurrency(unrealized)}
                        </span>
                        <span className={`text-xs font-mono font-bold ${unrealized >= 0 ? "text-[#43B581]" : "text-[#F04747]"}`}>
                          ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* TP / SL Threshold bars */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Target className="w-3 h-3" /> TP: ${t.tp.toLocaleString()}
                        </span>
                        <span className="text-red-400 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> SL: ${t.sl.toLocaleString()}
                        </span>
                      </div>

                      {/* Visual progress bar bar */}
                      <div className="relative h-1.5 w-full bg-[#1A1C1E] rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 ${t.direction === "long" ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {t.notes && (
                      <p className="text-[10px] text-[#8E9297] italic bg-[#1E2023]/30 p-2 rounded border border-[#2A2D31]/20">
                        "{t.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 border-t border-[#2A2D31]/40 bg-[#121417] flex flex-col gap-1.5">
                    {t.userId === userId || isCreatorOrMod ? (
                      <>
                        {t.userId !== userId && isCreatorOrMod && (
                          <span className="text-[9px] font-bold text-amber-500/90 tracking-wide uppercase px-1">
                            ⚠️ Admin / Mod Control Intervention
                          </span>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => onCloseLiveTrade(t.id, "manual", t.currentPrice, unrealized)}
                            className="flex-grow bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-indigo-300 font-bold text-xs py-1.5 rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Square className="w-3 h-3" /> Market Close
                          </button>
                          <button
                            onClick={() => onDeleteLiveTrade(t.id)}
                            className="p-1.5 bg-[#F04747]/10 hover:bg-[#F04747]/20 border border-[#F04747]/30 text-[#F04747] rounded transition cursor-pointer"
                            title="Delete trade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#8E9297] text-center w-full block py-1 font-semibold">
                        Watching partner's active trade
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed Positions History log list */}
      <div className="space-y-3">
        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-500" />
          Closed Trades History ({closedTrades.length})
        </h4>

        {closedTrades.length === 0 ? (
          <div className="p-6 text-center bg-[#121417]/40 border border-[#2A2D31]/40 rounded-xl text-gray-500 text-xs italic">
            No closed trades logged under this session/monitor scope.
          </div>
        ) : (
          <div className="bg-[#121417] border border-[#2A2D31] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#2A2D31]/60">
                <thead className="bg-[#17191C]">
                  <tr className="text-left text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
                    <th scope="col" className="px-6 py-3">Trader</th>
                    <th scope="col" className="px-6 py-3">Asset</th>
                    <th scope="col" className="px-6 py-3">Direction</th>
                    <th scope="col" className="px-6 py-3">Entry/Exit</th>
                    <th scope="col" className="px-6 py-3">TP/SL target</th>
                    <th scope="col" className="px-6 py-3">Outcome</th>
                    <th scope="col" className="px-6 py-3 text-right">Realized Profit</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D31]/40 text-xs">
                  {closedTrades.map((t, idx) => {
                    const qty = (t as any).quantity || 1;
                    const isWin = (t.profitAmount || 0) >= 0;

                    return (
                      <tr key={`${t.id}_${idx}`} className="hover:bg-[#1E2023]/30 transition">
                        <td className="px-6 py-3 text-[#DCDDDE] font-semibold">{t.username}</td>
                        <td className="px-6 py-3 text-white font-mono font-bold uppercase">{t.asset}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              t.direction === "long" ? "bg-[#43B581]/10 text-[#43B581]" : "bg-[#F04747]/10 text-[#F04747]"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-400 font-mono">
                          ${t.entryPrice.toLocaleString()} &rarr; ${(t as any).exitPrice ? (t as any).exitPrice.toLocaleString() : t.currentPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-[11px]">
                          TP: {t.tp.toLocaleString()} | SL: {t.sl.toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 w-fit ${
                              t.outcome === "TP"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : t.outcome === "SL"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                            }`}
                          >
                            {t.outcome === "TP" && <Target className="w-3 h-3" />}
                            {t.outcome === "SL" && <ShieldAlert className="w-3 h-3" />}
                            {t.outcome || "Closed"}
                          </span>
                        </td>
                        <td className={`px-6 py-3 text-right font-mono font-extrabold ${isWin ? "text-[#43B581]" : "text-[#F04747]"}`}>
                          {isWin ? "+" : ""}{formatCurrency(t.profitAmount || 0)}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {t.userId === userId || isCreatorOrMod ? (
                            <button
                              onClick={() => onDeleteLiveTrade(t.id)}
                              className="p-1 bg-[#F04747]/10 hover:bg-[#F04747]/20 border border-[#F04747]/30 text-[#F04747] rounded transition cursor-pointer"
                              title="Delete closed trade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-600">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Overlay: Launch Live Trade Form */}
      {isNewTradeOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1113]/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#1E2023] border border-[#2A2D31] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-[#2A2D31]/60 flex items-center justify-between bg-[#121417] shrink-0">
              <h3 className="font-extrabold text-gray-100 text-sm flex items-center gap-2">
                <Play className="text-[#5865F2] w-5 h-5" /> Launch Real-Time Live Position
              </h3>
              <button onClick={() => setIsNewTradeOpen(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 text-[#DCDDDE] overflow-y-auto flex-grow">
                {/* Direction Indicator */}
                <div>
                  <label className="block text-xs font-bold text-[#8E9297] uppercase mb-2">
                    Position Direction
                  </label>
                  <div className="flex rounded overflow-hidden border border-[#2A2D31]">
                    <button
                      type="button"
                      onClick={() => setTradeDirection("long")}
                      className={`flex-grow py-2.5 text-sm font-extrabold transition cursor-pointer ${
                        tradeDirection === "long" ? "bg-[#43B581]/10 text-[#43B581]" : "bg-[#121417] text-gray-500"
                      }`}
                    >
                      LONG / BUY (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeDirection("short")}
                      className={`flex-grow py-2.5 text-sm font-extrabold transition cursor-pointer ${
                        tradeDirection === "short" ? "bg-[#F04747]/10 text-[#F04747]" : "bg-[#121417] text-gray-500"
                      }`}
                    >
                      SHORT / SELL (-)
                    </button>
                  </div>
                </div>

                {/* Quick Preset Asset Ticker row */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9297] uppercase tracking-wider mb-2">
                    Quick Asset Presets
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {presetAssets.map((pa) => (
                      <button
                        key={pa.name}
                        type="button"
                        onClick={() => handleSelectAssetPreset(pa.name)}
                        className={`text-[10px] font-mono px-2 py-1 rounded transition border cursor-pointer ${
                          tradeAsset === pa.name
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : "bg-[#121417] text-gray-400 border-[#2A2D31] hover:text-white"
                        }`}
                      >
                        {pa.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset & Quantity input */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Asset / Ticker</label>
                    <input
                      type="text"
                      required
                      value={tradeAsset}
                      onChange={(e) => setTradeAsset(e.target.value)}
                      placeholder="BTC/USD"
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Position Size (Qty)</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      placeholder="1.0"
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Entry Price & Quantity */}
                <div>
                  <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Entry Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tradeEntryPrice}
                    onChange={(e) => setTradeEntryPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2.5 text-sm font-bold text-white focus:outline-none"
                  />
                </div>

                {/* Targets: TP and SL */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1.5 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Take Profit (TP)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tradeTP}
                      onChange={(e) => setTradeTP(e.target.value)}
                      placeholder="Target price"
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-400 uppercase mb-1.5 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Stop Loss (SL)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tradeSL}
                      onChange={(e) => setTradeSL(e.target.value)}
                      placeholder="Cut loss price"
                      className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8E9297] uppercase mb-1.5">Trade Notes / Strategy</label>
                  <textarea
                    value={tradeNotes}
                    onChange={(e) => setTradeNotes(e.target.value)}
                    placeholder="Technical triggers like 'VWAP cross', '15m RSI oversold'..."
                    rows={2}
                    className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Dynamic Smart Position Sizing Risk Calculator */}
                <div className="bg-[#121417]/80 border border-[#2A2D31]/80 rounded-xl p-3 sm:p-4 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" /> Smart Position-Sizing Calculator
                    </span>
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Premium Tool
                    </span>
                  </div>

                  {userTier === "free" ? (
                    <div className="space-y-2 text-center py-2">
                      <p className="text-[11px] text-gray-400 leading-normal">
                        Keep your accounts disciplined with dynamic risk-based sizing. Use entry & stop parameters to auto-calculate lot sizes.
                      </p>
                      <div className="p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 inline-block">
                        <p className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest">
                          🔒 Locked for Free Tier
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-400 leading-normal">
                        Calculate exact position size to risk based on account balance and stop loss distance.
                      </p>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[9px] font-bold text-[#8E9297] uppercase mb-1">Account Balance ($)</label>
                          <input
                            type="number"
                            value={calcBalance}
                            onChange={(e) => setCalcBalance(e.target.value)}
                            placeholder="10000"
                            className="w-full bg-[#1E2023] border border-[#2A2D31]/80 rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#8E9297] uppercase mb-1">Max Capital Risk (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={calcRiskPct}
                            onChange={(e) => setCalcRiskPct(e.target.value)}
                            placeholder="1.0"
                            className="w-full bg-[#1E2023] border border-[#2A2D31]/80 rounded px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="bg-[#1E2023]/60 p-2.5 rounded-lg border border-[#2A2D31]/40 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block">Recommended Size (Qty)</span>
                          <span className="text-sm font-black text-white font-mono">
                            {calculatedRiskQuantity !== null ? calculatedRiskQuantity.toLocaleString() : "Set Entry & SL"}
                          </span>
                        </div>
                        {calculatedRiskQuantity !== null && (
                          <button
                            type="button"
                            onClick={() => setTradeQuantity(calculatedRiskQuantity.toString())}
                            className="bg-amber-500 hover:bg-amber-600 text-neutral-900 text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            Apply Qty
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rules Checklist */}
                {rules && rules.length > 0 && (
                  <div className="bg-[#121417]/80 border border-[#2A2D31] rounded-xl p-3 sm:p-4 space-y-3">
                    <span className="block text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo className="w-4 h-4 text-indigo-400 shrink-0" /> Mandatory Confirmation Checklist
                    </span>
                    <p className="text-[10px] text-[#8E9297] leading-relaxed">
                      Confirm you are following the desk rules before placing this trade.
                    </p>
                    <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                      {rules.map((rule) => (
                        <label
                          key={rule.id}
                          className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-gray-300 hover:text-white select-none"
                        >
                          <input
                            type="checkbox"
                            checked={!!checkedRules[rule.id]}
                            onChange={(e) => {
                              setCheckedRules((prev) => ({
                                ...prev,
                                [rule.id]: e.target.checked
                              }));
                            }}
                            className="mt-0.5 rounded border-[#2A2D31] text-[#5865F2] focus:ring-[#5865F2] bg-[#121417] cursor-pointer"
                          />
                          <span className={`break-words whitespace-normal leading-relaxed ${checkedRules[rule.id] ? "text-gray-500 line-through decoration-[#8E9297]/60" : ""}`}>
                            {rule.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#121417] border-t border-[#2A2D31]/60 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewTradeOpen(false)}
                  className="w-1/3 bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-gray-300 font-semibold text-xs py-2.5 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs py-2.5 rounded transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-4 h-4" /> Deploy Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
