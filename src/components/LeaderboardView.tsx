import React, { useState, useMemo } from "react";
import {
  Trophy,
  Award,
  Medal,
  Crown,
  Flame,
  Calendar,
  CalendarDays,
  CalendarRange,
  Infinity as InfinityIcon,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Users,
  User,
  Shield,
  Activity,
} from "lucide-react";
import { PnlLog, UserProfile } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

interface LeaderboardViewProps {
  pnlLogs: PnlLog[];
  traders?: UserProfile[];
  currentUserId?: string;
  onOpenLogModal?: () => void;
}

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all";

export default function LeaderboardView({
  pnlLogs,
  traders = [],
  currentUserId,
  onOpenLogModal,
}: LeaderboardViewProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly");

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Monday of current week
  const mondayStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return getLocalDateString(new Date(d.setDate(diff)));
  }, []);

  const currentYearMonth = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Compute trade count per period for badge counts on tabs
  const timeframeCounts = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    let all = pnlLogs.length;

    pnlLogs.forEach((l) => {
      if (l.date === todayStr) daily++;
      if (l.date >= mondayStr) weekly++;
      if (l.date.startsWith(currentYearMonth)) monthly++;
    });

    return { daily, weekly, monthly, all };
  }, [pnlLogs, todayStr, mondayStr, currentYearMonth]);

  // Helper to calculate leaderboard for a given period
  const calculateDataForPeriod = (p: LeaderboardPeriod) => {
    const statsMap: Record<
      string,
      {
        userId?: string;
        username: string;
        avatarType?: string;
        avatarVal?: string;
        trades: number;
        wins: number;
        losses: number;
        totalPnL: number;
        bestTrade: number;
      }
    > = {};

    pnlLogs.forEach((log) => {
      let inRange = false;
      if (p === "daily") inRange = log.date === todayStr;
      else if (p === "weekly") inRange = log.date >= mondayStr;
      else if (p === "monthly") inRange = log.date.startsWith(currentYearMonth);
      else inRange = true;

      if (inRange) {
        const uKey = log.userId || log.username;
        if (!statsMap[uKey]) {
          // Look up avatar from traders list if available
          const matchedProfile = traders.find((t) => t.id === log.userId || t.username === log.username);
          statsMap[uKey] = {
            userId: log.userId,
            username: log.username || "Trader",
            avatarType: matchedProfile?.avatarType,
            avatarVal: matchedProfile?.avatarVal,
            trades: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            bestTrade: 0,
          };
        }
        statsMap[uKey].trades++;
        if (log.amount >= 0) {
          statsMap[uKey].wins++;
        } else {
          statsMap[uKey].losses++;
        }
        statsMap[uKey].totalPnL += log.amount;
        if (log.amount > statsMap[uKey].bestTrade) {
          statsMap[uKey].bestTrade = log.amount;
        }
      }
    });

    return Object.keys(statsMap)
      .map((key) => {
        const data = statsMap[key];
        const winRate = data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0;
        return {
          userId: data.userId,
          username: data.username,
          avatarType: data.avatarType,
          avatarVal: data.avatarVal,
          trades: data.trades,
          wins: data.wins,
          losses: data.losses,
          winRate,
          totalPnL: data.totalPnL,
          bestTrade: data.bestTrade,
          isCurrentUser: data.userId === currentUserId,
        };
      })
      .sort((a, b) => b.totalPnL - a.totalPnL);
  };

  const currentLeaderboard = useMemo(() => {
    return calculateDataForPeriod(period);
  }, [pnlLogs, period, todayStr, mondayStr, currentYearMonth, traders, currentUserId]);

  const monthlyLeadersPreview = useMemo(() => {
    return calculateDataForPeriod("monthly").slice(0, 3);
  }, [pnlLogs, traders, currentYearMonth]);

  const allTimeLeadersPreview = useMemo(() => {
    return calculateDataForPeriod("all").slice(0, 3);
  }, [pnlLogs, traders]);

  // Podium (Top 3 for active period)
  const top1 = currentLeaderboard[0] || null;
  const top2 = currentLeaderboard[1] || null;
  const top3 = currentLeaderboard[2] || null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black text-xs font-black shadow-md shadow-amber-500/20">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 text-black text-xs font-black shadow-md shadow-slate-400/20">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white text-xs font-black shadow-md shadow-amber-700/20">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-[#22262C] text-gray-400 text-xs font-black border border-[#2E333B]">
        {rank}
      </span>
    );
  };

  const renderAvatar = (avatarType?: string, avatarVal?: string, username?: string) => {
    if (avatarType === "url" && avatarVal) {
      return (
        <img
          src={avatarVal}
          alt={username || "Trader"}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-xl object-cover border border-[#2E333B]"
        />
      );
    }
    if (avatarVal) {
      return (
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-black text-indigo-300">
          {avatarVal}
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-[#1E2228] border border-[#2E333B] flex items-center justify-center text-xs font-black text-gray-300 uppercase">
        {username ? username.substring(0, 2) : "TR"}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full text-[#DCDDDE] bg-[#0E1013] font-sans pb-16">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#14171B] p-4 rounded-2xl border border-[#262A30] shadow-md">
        <div>
          <h2 className="font-black text-xl md:text-2xl text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="text-amber-400 w-6 h-6 shrink-0" />
            <span>Partner Performance Board</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time standings ranked by cumulative profits inside this room node
          </p>
        </div>

        {/* Timeframe Filter Tabs with live counter badges */}
        <div className="flex items-center bg-[#090A0C] border border-[#22262C] p-1 rounded-xl gap-1 flex-wrap">
          {(
            [
              { id: "daily", label: "Daily", count: timeframeCounts.daily },
              { id: "weekly", label: "Weekly", count: timeframeCounts.weekly },
              { id: "monthly", label: "Monthly", count: timeframeCounts.monthly },
              { id: "all", label: "All-Time", count: timeframeCounts.all },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === t.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  period === t.id
                    ? "bg-white/20 text-white"
                    : t.count > 0
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-[#1E2228] text-gray-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Podium Showcase Cards when we have 2+ traders in active period */}
      {currentLeaderboard.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 2nd Place Silver */}
          {top2 && (
            <div className="bg-gradient-to-b from-[#181C22] to-[#121417] p-4 rounded-2xl border border-slate-400/30 flex flex-col items-center text-center shadow-lg relative order-2 sm:order-1 sm:mt-4">
              <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-slate-400 text-black text-[10px] font-black uppercase tracking-wider shadow">
                🥈 2nd Place
              </div>
              <div className="mt-2 mb-2">
                {renderAvatar(top2.avatarType, top2.avatarVal, top2.username)}
              </div>
              <h4 className="text-sm font-black text-white truncate max-w-full">
                {top2.username}
                {top2.isCurrentUser && <span className="text-[10px] text-indigo-400 ml-1">(You)</span>}
              </h4>
              <p
                className={`text-lg font-black mt-1 ${
                  top2.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(top2.totalPnL)}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-1">
                <span>{top2.winRate}% WR</span>
                <span>•</span>
                <span>{top2.trades} Trades</span>
              </div>
            </div>
          )}

          {/* 1st Place Gold Champion */}
          {top1 && (
            <div className="bg-gradient-to-b from-amber-500/15 via-[#1C1D18] to-[#121417] p-5 rounded-2xl border-2 border-amber-400/50 flex flex-col items-center text-center shadow-xl shadow-amber-500/10 relative order-1 sm:order-2">
              <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-black fill-black" />
                <span>Leader</span>
              </div>
              <div className="mt-2 mb-2 scale-110">
                {renderAvatar(top1.avatarType, top1.avatarVal, top1.username)}
              </div>
              <h4 className="text-base font-black text-white truncate max-w-full">
                {top1.username}
                {top1.isCurrentUser && <span className="text-[10px] text-amber-400 ml-1">(You)</span>}
              </h4>
              <p
                className={`text-2xl font-black mt-1 ${
                  top1.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(top1.totalPnL)}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-300 font-bold mt-1">
                <span className="text-emerald-400 font-black">{top1.winRate}% Win Rate</span>
                <span>•</span>
                <span>{top1.trades} Setups Logged</span>
              </div>
            </div>
          )}

          {/* 3rd Place Bronze */}
          {top3 && (
            <div className="bg-gradient-to-b from-[#1A1816] to-[#121417] p-4 rounded-2xl border border-amber-700/30 flex flex-col items-center text-center shadow-lg relative order-3 sm:mt-6">
              <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-amber-700 text-amber-100 text-[10px] font-black uppercase tracking-wider shadow">
                🥉 3rd Place
              </div>
              <div className="mt-2 mb-2">
                {renderAvatar(top3.avatarType, top3.avatarVal, top3.username)}
              </div>
              <h4 className="text-sm font-black text-white truncate max-w-full">
                {top3.username}
                {top3.isCurrentUser && <span className="text-[10px] text-indigo-400 ml-1">(You)</span>}
              </h4>
              <p
                className={`text-lg font-black mt-1 ${
                  top3.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(top3.totalPnL)}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-1">
                <span>{top3.winRate}% WR</span>
                <span>•</span>
                <span>{top3.trades} Trades</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table Container */}
      <div className="bg-[#14171B] rounded-2xl overflow-hidden border border-[#262A30] shadow-md">
        {currentLeaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#262A30]">
              <thead>
                <tr className="bg-[#0D0F12] text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th scope="col" className="px-5 py-3.5 w-16 text-center">
                    Rank
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Trader
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Setups Logged
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Win Rate
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Best Trade
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Aggregate P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20242B]">
                {currentLeaderboard.map((trader, index) => {
                  const rankNum = index + 1;
                  const profitStyle =
                    trader.totalPnL > 0
                      ? "text-emerald-400 font-black"
                      : trader.totalPnL < 0
                      ? "text-rose-400 font-black"
                      : "text-gray-400 font-bold";

                  return (
                    <tr
                      key={trader.username}
                      className={`transition ${
                        trader.isCurrentUser
                          ? "bg-indigo-950/20 hover:bg-indigo-950/30"
                          : "hover:bg-[#1A1D22]/60"
                      }`}
                    >
                      <td className="px-5 py-4 text-center">{getRankBadge(rankNum)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {renderAvatar(trader.avatarType, trader.avatarVal, trader.username)}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">
                                {trader.username}
                              </span>
                              {trader.isCurrentUser && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-black px-1.5 py-0.2 rounded border border-indigo-500/30 uppercase">
                                  YOU
                                </span>
                              )}
                              {rankNum === 1 && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.2 rounded border border-amber-500/30 uppercase">
                                  👑 TOP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {trader.wins} Wins • {trader.losses} Losses
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-bold text-gray-300 bg-[#090A0C] px-2.5 py-1 rounded-lg border border-[#22262C]">
                          {trader.trades}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-xs font-black ${
                              trader.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {trader.winRate}%
                          </span>
                          <div className="w-14 bg-[#090A0C] h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                trader.winRate >= 50 ? "bg-emerald-400" : "bg-rose-500"
                              }`}
                              style={{ width: `${trader.winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-xs font-bold text-gray-300">
                        {trader.bestTrade > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            +{formatCurrency(trader.bestTrade)}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm ${profitStyle}`}>
                          {formatCurrency(trader.totalPnL)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================================= */
          /* 🚀 SMART ENGAGING EMPTY STATE (No trades in selected period, e.g. Daily)  */
          /* ========================================================================= */
          <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-6">
            {/* Header info */}
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="max-w-md">
              <h3 className="text-lg font-black text-white">
                No trades logged yet for {period === "daily" ? "Today" : period === "weekly" ? "This Week" : "This Month"}
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                {timeframeCounts.monthly > 0 ? (
                  <>
                    The trading desk is active! There are{" "}
                    <strong className="text-emerald-400 font-bold">
                      {timeframeCounts.monthly} trades logged this month
                    </strong>{" "}
                    and{" "}
                    <strong className="text-indigo-300 font-bold">
                      {timeframeCounts.all} all-time trades
                    </strong>
                    . Switch tabs below to see current standings or log today's first trade!
                  </>
                ) : (
                  "Be the first trader in this desk to log a trade today and take 1st place on the board!"
                )}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {timeframeCounts.monthly > 0 && period !== "monthly" && (
                <button
                  onClick={() => setPeriod("monthly")}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>View Monthly Standings ({timeframeCounts.monthly} Trades)</span>
                </button>
              )}

              {timeframeCounts.weekly > 0 && period !== "weekly" && (
                <button
                  onClick={() => setPeriod("weekly")}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>View Weekly Standings ({timeframeCounts.weekly} Trades)</span>
                </button>
              )}

              {timeframeCounts.all > 0 && period !== "all" && (
                <button
                  onClick={() => setPeriod("all")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#22262C] hover:bg-[#2A3038] text-white border border-[#2E333B] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <InfinityIcon className="w-4 h-4 text-amber-400" />
                  <span>All-Time Rankings ({timeframeCounts.all})</span>
                </button>
              )}

              {onOpenLogModal && (
                <button
                  onClick={onOpenLogModal}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Log Today's First Trade</span>
                </button>
              )}
            </div>

            {/* Preview of Monthly Leaders (So the screen is never bare!) */}
            {monthlyLeadersPreview.length > 0 && period === "daily" && (
              <div className="w-full max-w-xl bg-[#090A0C] border border-[#22262C] rounded-2xl p-4 mt-4 text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">
                      Current Month Top Desk Performers Preview
                    </span>
                  </div>
                  <button
                    onClick={() => setPeriod("monthly")}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Standings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {monthlyLeadersPreview.map((trader, idx) => (
                    <div
                      key={trader.username}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#14171B] border border-[#20242B]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-amber-400 w-5">
                          #{idx + 1}
                        </span>
                        {renderAvatar(trader.avatarType, trader.avatarVal, trader.username)}
                        <span className="text-xs font-bold text-gray-200">
                          {trader.username}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black ${
                            trader.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(trader.totalPnL)}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {trader.winRate}% WR • {trader.trades} trades
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
