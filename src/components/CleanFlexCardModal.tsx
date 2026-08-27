import React, { useRef, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Award,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Share2,
  Lock,
} from "lucide-react";
import { PnlLog, UserProfile, AccountType } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";
import { isImageAvatar } from "../utils/presence";

interface CleanFlexCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeLog?: PnlLog | null;
  dailyRecap?: {
    date: string;
    totalPnl: number;
    winRate: number;
    tradesCount: number;
    bestTrade: number;
    accountType?: AccountType;
  } | null;
  trader?: UserProfile | null;
  deskName?: string;
  roomCode?: string;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function CleanFlexCardModal({
  isOpen,
  onClose,
  tradeLog,
  dailyRecap,
  trader,
  deskName = "SyncPL Trading Desk",
  roomCode = "DESK",
  triggerToast,
}: CleanFlexCardModalProps) {
  const [theme, setTheme] = useState<"cyber-obsidian" | "emerald-alpha" | "gold-prestige" | "midnight-gradient">("cyber-obsidian");
  const [showRMultiple, setShowRMultiple] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isTrade = !!tradeLog;
  const pnlAmount = isTrade ? (tradeLog?.amount ?? 0) : (dailyRecap?.totalPnl ?? 0);
  const isPositive = pnlAmount >= 0;
  const username = trader?.username || tradeLog?.username || "Verified Trader";
  const initials = username.substring(0, 2).toUpperCase();

  const accountType = (tradeLog?.accountType || dailyRecap?.accountType || "funded") as AccountType;
  const accountLabels: Record<AccountType, { label: string; bg: string; text: string; border: string }> = {
    funded: { label: "Prop Funded", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    live: { label: "Live Real Capital", bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
    eval: { label: "Combine / Eval", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    practice: { label: "Simulation", bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  };

  const currentAcct = accountLabels[accountType] || accountLabels.funded;

  // Theme styling configurations
  const themeStyles = {
    "cyber-obsidian": {
      container: "bg-[#090A0C] border-zinc-800 text-white shadow-2xl",
      accent: "text-indigo-400",
      glow: "from-indigo-500/20 via-transparent to-purple-500/10",
      badge: "bg-zinc-900/90 border-zinc-700/80 text-zinc-300",
      metricBox: "bg-zinc-950/80 border-zinc-800/80",
    },
    "emerald-alpha": {
      container: "bg-[#06140D] border-emerald-900/60 text-white shadow-2xl",
      accent: "text-emerald-400",
      glow: "from-emerald-500/25 via-emerald-950/20 to-teal-500/10",
      badge: "bg-emerald-950/80 border-emerald-700/50 text-emerald-300",
      metricBox: "bg-[#040C08]/90 border-emerald-900/70",
    },
    "gold-prestige": {
      container: "bg-[#120F06] border-amber-900/60 text-white shadow-2xl",
      accent: "text-amber-400",
      glow: "from-amber-500/25 via-amber-950/20 to-orange-500/10",
      badge: "bg-amber-950/80 border-amber-700/50 text-amber-300",
      metricBox: "bg-[#0C0A04]/90 border-amber-900/70",
    },
    "midnight-gradient": {
      container: "bg-gradient-to-br from-[#0B0F19] via-[#090C14] to-[#04060A] border-indigo-900/50 text-white shadow-2xl",
      accent: "text-sky-400",
      glow: "from-blue-500/20 via-indigo-950/30 to-purple-900/20",
      badge: "bg-indigo-950/80 border-indigo-700/50 text-indigo-300",
      metricBox: "bg-[#05070D]/90 border-indigo-900/60",
    },
  };

  const currentTheme = themeStyles[theme];

  // Render on HTML5 canvas for clean, 100% crisp PNG export without external heavy packages
  const handleExportPNG = async () => {
    try {
      setIsGenerating(true);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // High DPI retina export (1200 x 675 for crisp Twitter / Discord preview)
      const width = 1200;
      const height = 675;
      canvas.width = width;
      canvas.height = height;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (theme === "emerald-alpha") {
        bgGrad.addColorStop(0, "#06140D");
        bgGrad.addColorStop(1, "#030A06");
      } else if (theme === "gold-prestige") {
        bgGrad.addColorStop(0, "#140F06");
        bgGrad.addColorStop(1, "#0A0803");
      } else if (theme === "midnight-gradient") {
        bgGrad.addColorStop(0, "#0B101D");
        bgGrad.addColorStop(1, "#04060C");
      } else {
        bgGrad.addColorStop(0, "#0E1015");
        bgGrad.addColorStop(1, "#07080A");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Outer border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Ambient radial glow in center
      const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 500);
      if (isPositive) {
        radialGlow.addColorStop(0, "rgba(16, 185, 129, 0.15)");
        radialGlow.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        radialGlow.addColorStop(0, "rgba(239, 68, 68, 0.12)");
        radialGlow.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Top Bar: SyncPL Logo + Verification Watermark
      ctx.fillStyle = "#6366F1";
      ctx.font = "900 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("SYNCPL", 60, 80);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "700 18px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("• VERIFIED DESK RECEIPT", 165, 80);

      // Date & Room Watermark on right
      const dateText = isTrade ? tradeLog?.date : dailyRecap?.date || getLocalDateString(new Date());
      ctx.textAlign = "right";
      ctx.fillStyle = "#64748B";
      ctx.font = "700 18px 'JetBrains Mono', monospace";
      ctx.fillText(`${deskName} #${roomCode} | ${dateText}`, width - 60, 80);
      ctx.textAlign = "left";

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 110);
      ctx.lineTo(width - 60, 110);
      ctx.stroke();

      // Account Type pill
      ctx.fillStyle = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
      ctx.beginPath();
      ctx.roundRect(60, 145, 180, 40, 8);
      ctx.fill();
      ctx.fillStyle = isPositive ? "#34D399" : "#F87171";
      ctx.font = "800 16px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(currentAcct.label.toUpperCase(), 80, 171);

      // Main Large P&L
      ctx.fillStyle = isPositive ? "#10B981" : "#EF4444";
      ctx.font = "900 96px 'Plus Jakarta Sans', sans-serif";
      const pnlDisplay = `${isPositive ? "+" : ""}${formatCurrency(pnlAmount)}`;
      ctx.fillText(pnlDisplay, 60, 280);

      // Subtitle / Asset / Strategy
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "700 28px 'Plus Jakarta Sans', sans-serif";
      if (isTrade) {
        const sub = `${tradeLog?.asset || "ASSET"} • ${tradeLog?.strategy || "Execution"} ${tradeLog?.direction ? `(${tradeLog.direction.toUpperCase()})` : ""}`;
        ctx.fillText(sub, 60, 340);
      } else {
        const sub = `Daily Desk Session Recap • ${dailyRecap?.tradesCount || 0} Executions (${dailyRecap?.winRate || 0}% Win Rate)`;
        ctx.fillText(sub, 60, 340);
      }

      // Stats boxes at bottom
      const boxY = 400;
      const boxH = 120;
      const boxW = 320;
      const gap = 40;

      // Box 1: Trader Identity
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.roundRect(60, boxY, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("AUTHENTICATED TRADER", 85, boxY + 40);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(username, 85, boxY + 80);

      // Box 2: Verification Key
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.beginPath();
      ctx.roundRect(60 + boxW + gap, boxY, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("LEDGER HASH & STATUS", 60 + boxW + gap + 25, boxY + 40);
      ctx.fillStyle = "#38BDF8";
      ctx.font = "800 20px 'JetBrains Mono', monospace";
      const hash = isTrade ? (tradeLog?.id?.substring(0, 10) || "VERIFIED").toUpperCase() : "RECAP-VERIFIED";
      ctx.fillText(`✓ ${hash}`, 60 + boxW + gap + 25, boxY + 80);

      // Box 3: Live Verification URL
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.beginPath();
      ctx.roundRect(60 + (boxW + gap) * 2, boxY, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("PLATFORM & DESK", 60 + (boxW + gap) * 2 + 25, boxY + 40);
      ctx.fillStyle = "#A855F7";
      ctx.font = "800 20px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("syncpl.app", 60 + (boxW + gap) * 2 + 25, boxY + 80);

      // Bottom footer banner
      ctx.fillStyle = "#64748B";
      ctx.font = "600 15px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Tracked live inside SyncPL Collaborative Trading Desks • Real-time accountability", 60, height - 50);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SyncPL-Flex-${username}-${dateText}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsGenerating(false);
        triggerToast?.("Flex Card Downloaded!", "Ready to post on Twitter/X, Instagram, or Discord.", "success");
      }, "image/png");
    } catch (err) {
      console.error("Canvas export failed:", err);
      setIsGenerating(false);
      triggerToast?.("Export Error", "Could not generate flex card.", "error");
    }
  };

  const handleCopyTextReceipt = () => {
    const dateText = isTrade ? tradeLog?.date : dailyRecap?.date;
    const text = `📊 Verified on @SyncPL Desk #${roomCode}\nTrader: ${username}\nRealized P&L: ${isPositive ? "+" : ""}${formatCurrency(pnlAmount)}\nAccount: ${currentAcct.label}\nAsset: ${isTrade ? tradeLog?.asset : "Multi-Asset"}\nVerification Hash: ${isTrade ? tradeLog?.id?.substring(0, 8).toUpperCase() : "SYNC-RECAP"}\n#DayTrading #PropFirm #TradingDesk`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerToast?.("Copied Flex Text", "Text receipt copied with desk verification tags!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0E1013] border border-[#2A2D31] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2A2D31] flex items-center justify-between bg-[#08090A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Clean Flex Card Generator</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
                  Viral Social Ready
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Export high-resolution verified receipts for Twitter/X, Instagram, and Discord</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Theme Selector Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Card Theme Style:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "cyber-obsidian", label: "Obsidian Dark" },
                { id: "emerald-alpha", label: "Alpha Emerald" },
                { id: "gold-prestige", label: "Gold Combine" },
                { id: "midnight-gradient", label: "Midnight Blue" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    theme === t.id
                      ? "bg-white text-black border-white shadow"
                      : "bg-[#1E2023] text-gray-400 border-[#2A2D31] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card Container */}
          <div
            ref={cardRef}
            className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 relative overflow-hidden ${currentTheme.container}`}
          >
            {/* Ambient Background Gradient Aura */}
            <div className={`absolute inset-0 bg-gradient-to-tr ${currentTheme.glow} pointer-events-none`} />

            {/* Header Badge & Date */}
            <div className="flex items-center justify-between relative z-10 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-lg text-white shadow-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                    SYNCPL VERIFIED
                  </span>
                  <span className="text-[11px] font-bold text-gray-400">
                    {deskName} #{roomCode}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${currentAcct.bg} ${currentAcct.text} ${currentAcct.border}`}>
                  {currentAcct.label}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {isTrade ? tradeLog?.date : dailyRecap?.date || getLocalDateString(new Date())}
                </span>
              </div>
            </div>

            {/* Main P&L Number */}
            <div className="my-6 relative z-10 space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className={`text-4xl sm:text-5xl font-black tracking-tight ${
                    isPositive ? "text-emerald-400" : "text-rose-500"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(pnlAmount)}
                </span>
                {isTrade && tradeLog?.asset && (
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm font-mono font-bold text-white uppercase">
                    {tradeLog.asset}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-300 font-semibold flex items-center gap-2">
                {isTrade ? (
                  <span>
                    Strategy: <strong className="text-white">{tradeLog?.strategy || "Discretionary"}</strong>
                    {tradeLog?.notes && <span className="italic text-gray-400 ml-1">"{tradeLog.notes}"</span>}
                  </span>
                ) : (
                  <span>
                    Session Total: <strong className="text-white">{dailyRecap?.tradesCount || 0} Trades</strong> ({dailyRecap?.winRate || 0}% Win Rate)
                  </span>
                )}
              </p>
            </div>

            {/* Footer Verification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/10 relative z-10">
              <div className={`p-3 rounded-xl border ${currentTheme.metricBox}`}>
                <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Trader
                </span>
                <span className="font-bold text-sm text-white truncate block">
                  {username}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${currentTheme.metricBox}`}>
                <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Verification Hash
                </span>
                <span className="font-mono font-bold text-xs text-sky-400 truncate block">
                  {isTrade ? (tradeLog?.id?.substring(0, 10) || "DESK-VERIFIED").toUpperCase() : "DESK-SESSION"}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${currentTheme.metricBox}`}>
                <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Platform
                </span>
                <span className="font-bold text-xs text-indigo-400 block">
                  syncpl.app
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-[#08090A] border-t border-[#2A2D31] flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#121417] hover:bg-[#1E2023] border border-[#2A2D31] text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTextReceipt}
              className="px-4 py-2 bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Post Text"}</span>
            </button>

            <button
              onClick={handleExportPNG}
              disabled={isGenerating}
              className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? "Exporting..." : "Download 1200x675 PNG"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
