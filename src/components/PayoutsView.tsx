import React, { useState, useMemo } from "react";
import {
  Banknote,
  Plus,
  Calendar,
  Trophy,
  Trash2,
  Building2,
  TrendingUp,
  Award,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { PayoutRecord, UserProfile } from "../types";
import { formatCurrency, getLocalDateString } from "../utils/helpers";

interface PayoutsViewProps {
  payouts: PayoutRecord[];
  onAddPayout: (payout: Omit<PayoutRecord, "id" | "timestamp">) => void;
  onDeletePayout: (payoutId: string, username?: string, amount?: number) => void;
  userProfile: UserProfile | null;
  activeGroupId: string;
}

const PROP_FIRM_OPTIONS = [
  "Apex Trader Funding",
  "Topstep",
  "MyFundedFX",
  "FTMO",
  "FundedNext",
  "The Funded Trader",
  "FunderPro",
  "Funded Trading Plus",
  "Personal / Live Account",
  "Other Prop Firm",
];

export default function PayoutsView({
  payouts,
  onAddPayout,
  onDeletePayout,
  userProfile,
  activeGroupId,
}: PayoutsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<"all" | "monthly" | "weekly" | "daily">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFirm, setSelectedFirm] = useState<string>("all");

  // Form State
  const [traderName, setTraderName] = useState(userProfile?.username || "Trader");
  const [amountStr, setAmountStr] = useState("");
  const [dateStr, setDateStr] = useState(getLocalDateString());
  const [propFirm, setPropFirm] = useState(PROP_FIRM_OPTIONS[0]);
  const [customFirm, setCustomFirm] = useState("");
  const [notes, setNotes] = useState("");

  const handleOpenModal = (presetTraderName?: string) => {
    if (presetTraderName) {
      setTraderName(presetTraderName);
    } else {
      setTraderName(userProfile?.username || "Trader");
    }
    setDateStr(getLocalDateString());
    setAmountStr("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid payout amount above 0.");
      return;
    }

    const firmToSave = propFirm === "Other Prop Firm" ? (customFirm || "Other") : propFirm;

    onAddPayout({
      userId: userProfile?.username === traderName ? "self" : traderName.toLowerCase().replace(/\s+/g, "_"),
      username: traderName.trim() || "Anonymous Trader",
      groupId: activeGroupId,
      amount: val,
      date: dateStr || getLocalDateString(),
      propFirm: firmToSave,
      notes: notes.trim(),
    });

    setIsModalOpen(false);
    setAmountStr("");
    setNotes("");
  };

  // Date Calculators
  const todayStr = useMemo(() => getLocalDateString(), []);
  
  const mondayStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return getLocalDateString(new Date(d.setDate(diff)));
  }, []);

  const currentYearMonth = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Aggregate Calculations
  const groupStats = useMemo(() => {
    let dayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let grandTotal = 0;

    const uniqueTraders = new Set<string>();

    payouts.forEach((p) => {
      grandTotal += p.amount;
      uniqueTraders.add(p.username);

      if (p.date === todayStr) {
        dayTotal += p.amount;
      }
      if (p.date >= mondayStr) {
        weekTotal += p.amount;
      }
      if (p.date.startsWith(currentYearMonth)) {
        monthTotal += p.amount;
      }
    });

    return {
      dayTotal,
      weekTotal,
      monthTotal,
      grandTotal,
      fundedCount: uniqueTraders.size,
    };
  }, [payouts, todayStr, mondayStr, currentYearMonth]);

  // Filtered Payout List for Feed
  const filteredPayouts = useMemo(() => {
    // Deduplicate payouts by id
    const uniqueMap = new Map<string, PayoutRecord>();
    payouts.forEach((p) => {
      if (p.id && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    const uniquePayouts = Array.from(uniqueMap.values());

    return uniquePayouts
      .filter((p) => {
        // Period filter
        if (periodFilter === "daily" && p.date !== todayStr) return false;
        if (periodFilter === "weekly" && p.date < mondayStr) return false;
        if (periodFilter === "monthly" && !p.date.startsWith(currentYearMonth)) return false;

        // Firm filter
        if (selectedFirm !== "all" && p.propFirm !== selectedFirm) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = p.username.toLowerCase().includes(q);
          const matchFirm = (p.propFirm || "").toLowerCase().includes(q);
          const matchNotes = (p.notes || "").toLowerCase().includes(q);
          return matchUser || matchFirm || matchNotes;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
  }, [payouts, periodFilter, selectedFirm, searchQuery, todayStr, mondayStr, currentYearMonth]);

  // Trader Leaderboard Cards
  const traderSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        username: string;
        total: number;
        day: number;
        week: number;
        month: number;
        count: number;
        firms: Set<string>;
        latestDate: string;
      }
    > = {};

    payouts.forEach((p) => {
      const key = p.username;
      if (!map[key]) {
        map[key] = {
          username: p.username,
          total: 0,
          day: 0,
          week: 0,
          month: 0,
          count: 0,
          firms: new Set(),
          latestDate: p.date,
        };
      }

      map[key].total += p.amount;
      map[key].count += 1;
      if (p.propFirm) map[key].firms.add(p.propFirm);

      if (p.date === todayStr) map[key].day += p.amount;
      if (p.date >= mondayStr) map[key].week += p.amount;
      if (p.date.startsWith(currentYearMonth)) map[key].month += p.amount;

      if (p.date > map[key].latestDate) {
        map[key].latestDate = p.date;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [payouts, todayStr, mondayStr, currentYearMonth]);

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full text-[#DCDDDE] custom-scrollbar">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-2xl text-white tracking-tight flex items-center gap-2.5">
            <Banknote className="text-emerald-400 w-7 h-7" />
            <span>Community Payout Leaderboard</span>
          </h2>
          <p className="text-xs text-[#8E9297] mt-1">
            Track funded trader payouts, compare day/week/month totals, and celebrate verified community wins.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition duration-200 text-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Payout</span>
        </button>
      </div>

      {/* Aggregate Stats Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#121417]/80 border border-[#2A2D31] p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8E9297] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Today's Payouts</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {formatCurrency(groupStats.dayTotal)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            {payouts.filter((p) => p.date === todayStr).length} logged today
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31] p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8E9297] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">This Week</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {formatCurrency(groupStats.weekTotal)}
          </div>
          <div className="text-[10px] text-indigo-400 font-semibold mt-1">
            Weekly cumulative sum
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31] p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8E9297] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">This Month</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {formatCurrency(groupStats.monthTotal)}
          </div>
          <div className="text-[10px] text-amber-400 font-semibold mt-1">
            Monthly cumulative sum
          </div>
        </div>

        <div className="bg-[#121417]/80 border border-[#2A2D31] p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8E9297] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">All-Time Group</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrency(groupStats.grandTotal)}
          </div>
          <div className="text-[10px] text-gray-400 font-semibold mt-1">
            Grand total generated
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-[#121417]/80 border border-[#2A2D31] p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8E9297] mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Funded Traders</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {groupStats.fundedCount} <span className="text-xs font-normal text-gray-400">Traders</span>
          </div>
          <div className="text-[10px] text-sky-400 font-semibold mt-1">
            With verified payouts
          </div>
        </div>
      </div>

      {/* Trader Leaderboard Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Funded Trader Standings</span>
          </h3>
          <span className="text-xs text-[#8E9297]">
            {traderSummaries.length} Trader{traderSummaries.length === 1 ? "" : "s"} Ranked
          </span>
        </div>

        {traderSummaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {traderSummaries.map((trader, idx) => {
              const rank = idx + 1;
              const isTop = rank === 1;

              return (
                <div
                  key={`${trader.username}_${idx}`}
                  className={`bg-[#121417] border p-4 rounded-xl flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                    isTop
                      ? "border-amber-500/40 bg-gradient-to-b from-[#181B20] to-[#121417] shadow-lg shadow-amber-950/20"
                      : "border-[#2A2D31] hover:border-[#3F434A]"
                  }`}
                >
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs ${
                          rank === 1
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : rank === 2
                            ? "bg-slate-400/20 text-slate-200 border border-slate-400/30"
                            : rank === 3
                            ? "bg-amber-700/20 text-amber-600 border border-amber-700/30"
                            : "bg-[#1E2023] text-gray-400 border border-[#2A2D31]"
                        }`}
                      >
                        #{rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">{trader.username}</span>
                          {isTop && <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {trader.count} payout{trader.count === 1 ? "" : "s"} • Last {trader.latestDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase text-gray-500">All-Time</span>
                      <span className="text-base font-extrabold text-emerald-400">
                        {formatCurrency(trader.total)}
                      </span>
                    </div>
                  </div>

                  {/* Day / Week / Month Matrix */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#2A2D31]/60 text-center bg-[#08090A]/40 p-2 rounded-lg">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500">Day</span>
                      <span className="text-xs font-bold text-white">
                        {trader.day > 0 ? formatCurrency(trader.day) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500">Week</span>
                      <span className="text-xs font-bold text-indigo-400">
                        {trader.week > 0 ? formatCurrency(trader.week) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500">Month</span>
                      <span className="text-xs font-bold text-amber-400">
                        {trader.month > 0 ? formatCurrency(trader.month) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Prop Firm Chips & Action */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 max-w-[70%]">
                      {Array.from(trader.firms).map((firm) => (
                        <span
                          key={firm}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1E2023] border border-[#2A2D31] text-gray-300 truncate max-w-[120px]"
                        >
                          {firm}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleOpenModal(trader.username)}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition border border-emerald-500/20 shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#121417] border border-[#2A2D31] p-8 rounded-xl text-center space-y-3">
            <Banknote className="w-10 h-10 text-gray-600 mx-auto" />
            <h4 className="text-sm font-bold text-gray-300">No Payouts Recorded Yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Be the first to log a payout for your group or trader team! Click below to register your first record.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Log First Payout</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar for Feed */}
      <div className="pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121417] border border-[#2A2D31] p-3 rounded-xl">
          {/* Period Tabs */}
          <div className="flex items-center bg-[#08090A] border border-[#2A2D31] p-1 rounded-lg shrink-0">
            <button
              onClick={() => setPeriodFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                periodFilter === "all" ? "bg-indigo-600 text-white" : "text-[#8E9297] hover:text-white"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriodFilter("monthly")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                periodFilter === "monthly" ? "bg-indigo-600 text-white" : "text-[#8E9297] hover:text-white"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriodFilter("weekly")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                periodFilter === "weekly" ? "bg-indigo-600 text-white" : "text-[#8E9297] hover:text-white"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriodFilter("daily")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                periodFilter === "daily" ? "bg-indigo-600 text-white" : "text-[#8E9297] hover:text-white"
              }`}
            >
              Today
            </button>
          </div>

          {/* Search & Firm Dropdown */}
          <div className="flex items-center gap-2 flex-grow max-w-lg">
            <div className="relative flex-grow">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search trader or prop firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
              className="bg-[#08090A] border border-[#2A2D31] text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 shrink-0"
            >
              <option value="all">All Prop Firms</option>
              {PROP_FIRM_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payout Log Transactions Feed Table */}
      <div className="bg-[#121417] border border-[#2A2D31] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2A2D31] flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
            Recent Payout Transactions ({filteredPayouts.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#2A2D31]">
            <thead>
              <tr className="bg-[#08090A] text-left text-[10px] font-black text-[#8E9297] uppercase tracking-wider">
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Trader</th>
                <th scope="col" className="px-4 py-3">Prop Firm / Account</th>
                <th scope="col" className="px-4 py-3">Notes</th>
                <th scope="col" className="px-4 py-3 text-right">Payout Amount</th>
                <th scope="col" className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D31]/80">
              {filteredPayouts.length > 0 ? (
                filteredPayouts.map((p, idx) => (
                  <tr key={`${p.id}_${idx}`} className="hover:bg-[#1E2023]/50 transition text-xs">
                    <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                      {p.date}
                    </td>
                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                      {p.username}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {p.propFirm || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {p.notes || <span className="text-gray-600 italic">No notes</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onDeletePayout(p.id, p.username, p.amount)}
                        className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                        title="Delete Payout Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 italic text-xs">
                    No payouts matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#2A2D31] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2D31]">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">Log Payout Record</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Trader Name</label>
                <input
                  type="text"
                  required
                  value={traderName}
                  onChange={(e) => setTraderName(e.target.value)}
                  placeholder="e.g. Alex, Nathan, TopTrader"
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Payout Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="2500.00"
                      className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg pl-7 pr-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Payout Date</label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Prop Firm / Broker</label>
                <select
                  value={propFirm}
                  onChange={(e) => setPropFirm(e.target.value)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {PROP_FIRM_OPTIONS.map((firm) => (
                    <option key={firm} value={firm}>
                      {firm}
                    </option>
                  ))}
                </select>

                {propFirm === "Other Prop Firm" && (
                  <input
                    type="text"
                    placeholder="Enter custom firm name..."
                    value={customFirm}
                    onChange={(e) => setCustomFirm(e.target.value)}
                    className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white mt-2 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Notes / Details (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 1st payout from 50k PA account, requested via Deel"
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1E2023] hover:bg-[#2A2D31] text-gray-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-950/40"
                >
                  Save Payout Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
