import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
  Lock,
  Clock,
  CheckCircle,
  HelpCircle,
  X,
  Sparkles,
} from "lucide-react";
import { PnlLog } from "../types";
import { TiltGuardSettings, TiltStatus } from "../types/growthFeatures";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

interface TiltGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  pnlLogs: PnlLog[];
  onTriggerSiren?: () => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export const DEFAULT_TILT_SETTINGS: TiltGuardSettings = {
  maxDailyLoss: 500, // $500 loss threshold
  consecutiveLossLimit: 3, // 3 consecutive red trades
  enabled: true,
  cooldownMinutes: 15,
  soundEnabled: true,
};

export function evaluateTiltStatus(
  userId: string,
  logs: PnlLog[],
  settings: TiltGuardSettings
): TiltStatus {
  if (!settings.enabled) {
    return {
      isTilted: false,
      consecutiveLosses: 0,
      dailyLoss: 0,
      maxDailyLoss: settings.maxDailyLoss,
    };
  }

  const todayStr = getLocalDateString(new Date());
  const userTodayLogs = logs.filter((l) => l.userId === userId && l.date === todayStr);

  let dailyTotal = 0;
  userTodayLogs.forEach((l) => {
    dailyTotal += l.amount;
  });

  const dailyLoss = dailyTotal < 0 ? Math.abs(dailyTotal) : 0;
  const isOverDailyMax = dailyLoss >= settings.maxDailyLoss && dailyTotal < 0;

  // Calculate recent consecutive red trades
  const sortedUserLogs = [...logs]
    .filter((l) => l.userId === userId)
    .sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());

  let consecutiveLosses = 0;
  for (const log of sortedUserLogs) {
    if (log.amount < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  const isOverConsecutive = consecutiveLosses >= settings.consecutiveLossLimit;

  let reason: "max_daily_loss" | "consecutive_losses" | undefined;
  if (isOverDailyMax) reason = "max_daily_loss";
  else if (isOverConsecutive) reason = "consecutive_losses";

  return {
    isTilted: isOverDailyMax || isOverConsecutive,
    reason,
    consecutiveLosses,
    dailyLoss,
    maxDailyLoss: settings.maxDailyLoss,
  };
}

export default function TiltGuardModal({
  isOpen,
  onClose,
  userId,
  username,
  pnlLogs,
  onTriggerSiren,
  triggerToast,
}: TiltGuardModalProps) {
  const [settings, setSettings] = useState<TiltGuardSettings>(() => {
    try {
      const stored = localStorage.getItem(`syncpl_tiltguard_${userId}`);
      return stored ? JSON.parse(stored) : DEFAULT_TILT_SETTINGS;
    } catch {
      return DEFAULT_TILT_SETTINGS;
    }
  });

  const [testActive, setTestActive] = useState(false);

  const status = evaluateTiltStatus(userId, pnlLogs, settings);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem(`syncpl_tiltguard_${userId}`, JSON.stringify(settings));
      triggerToast?.("Tilt Guard Saved", "Your risk limits and accountability contract are active.", "success");
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestSiren = () => {
    setTestActive(true);
    // Play web audio beep or siren pulse
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio Context notice:", e);
    }

    onTriggerSiren?.();
    triggerToast?.("🚨 Tilt Guard Siren Fired", "Simulated tilt alarm! Take a 15-minute screen break.", "info");
    setTimeout(() => setTestActive(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E1013] border border-rose-900/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2D31] flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-[#0E1013] to-[#0E1013]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Tilt Guard & Risk Contract</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
                  Accountability
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Enforce strict risk limits before you blow your combine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-gray-300 text-xs">
          {/* Live Status Pill */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              status.isTilted
                ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  status.isTilted ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {status.isTilted ? <Flame className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-black text-sm text-white">
                  {status.isTilted ? "🚨 TILT ALERT ACTIVATED" : "🛡️ Risk Discipline Safe"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {status.isTilted
                    ? status.reason === "max_daily_loss"
                      ? `Hit max daily loss threshold ($${status.dailyLoss.toFixed(2)} / $${status.maxDailyLoss})`
                      : `Hit consecutive loss streak (${status.consecutiveLosses} red trades)`
                    : `Current daily loss: $${status.dailyLoss.toFixed(2)} | Streak: ${status.consecutiveLosses} loss${
                        status.consecutiveLosses === 1 ? "" : "es"
                      }`}
                </p>
              </div>
            </div>

            {status.isTilted && (
              <span className="text-[10px] bg-rose-500 text-black font-black px-2 py-1 rounded-md uppercase">
                Cooler On
              </span>
            )}
          </div>

          {/* Configuration Inputs */}
          <div className="space-y-4 bg-[#121417] p-4 rounded-xl border border-[#2A2D31]">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-white block">Enable Desk Tilt Guard</label>
                <span className="text-[11px] text-gray-400">Lock down your workstation when limits are breached</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-700 bg-zinc-800 cursor-pointer"
              />
            </div>

            <hr className="border-[#2A2D31]" />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-white">Max Daily Loss Limit ($ USD)</label>
                <span className="text-rose-400 font-mono font-bold">${settings.maxDailyLoss}</span>
              </div>
              <input
                type="number"
                min="50"
                step="50"
                value={settings.maxDailyLoss}
                onChange={(e) => setSettings({ ...settings, maxDailyLoss: Math.max(10, parseFloat(e.target.value) || 0) })}
                className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-rose-500"
                placeholder="500"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Recommended: Match your prop firm daily loss limit (e.g. $500 on a 50k Combine)
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-white">Consecutive Losses Lockout</label>
                <span className="text-amber-400 font-mono font-bold">{settings.consecutiveLossLimit} Trades</span>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.consecutiveLossLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    consecutiveLossLimit: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-rose-500"
                placeholder="3"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Triggers when logging 3 consecutive red trades in a row
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <label className="font-bold text-white block">Siren Audio Alarm</label>
                <span className="text-[11px] text-gray-400">Play alarm sound when limit is breached</span>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                className={`p-2 rounded-lg border transition cursor-pointer ${
                  settings.soundEnabled
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Test Siren Button */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#121417] border border-[#2A2D31]">
            <span className="text-[11px] text-gray-400">Test the acoustic tilt alarm sound:</span>
            <button
              type="button"
              onClick={handleTestSiren}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Tilt Alarm</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#08090A] border-t border-[#2A2D31] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#121417] hover:bg-[#1E2023] border border-[#2A2D31] text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black rounded-xl transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            Lock In Risk Contract
          </button>
        </div>
      </div>
    </div>
  );
}
