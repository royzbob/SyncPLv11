import React, { useEffect, useState } from "react";
import { X, Sparkles, RefreshCw, CheckCircle2, BellRing, Megaphone, History, ChevronRight, Search, Calendar, Tag, ShieldCheck } from "lucide-react";
import { doc, onSnapshot, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface AppUpdateData {
  id: string;
  title: string;
  version: string;
  tag?: string;
  message: string;
  authorName?: string;
  authorId?: string;
  createdAt: string;
}

// Built-in foundational release archive if Firestore history is empty or initial
const DEFAULT_ARCHIVE_UPDATES: AppUpdateData[] = [
  {
    id: "default_v1.0.27",
    title: "Interactive Spotlight Tour & Tilt Guard Alarms",
    version: "v1.0.27",
    tag: "Feature Release",
    message: "• Interactive Live Screen Spotlight & Getting Started Guide with glowing visual locators\n• 100% Clear UI Component Locators for 1-click inspection of all desk tools\n• Desk Tilt Guard loss lockout & automated acoustic alarms to prevent revenge trading\n• Real-time P&L sync, Consistency Calendars, and multi-trader race charts\n• Instant Social Flex Card receipts & Twitter/Discord exports",
    authorName: "Nathan (App Owner)",
    createdAt: "2026-08-27T16:00:00.000Z",
  },
  {
    id: "default_v1.0.26",
    title: "Desk P&L Flex Cards & Multi-trader Race",
    version: "v1.0.26",
    tag: "Performance Patch",
    message: "• Social Flex Card Generator: 1-Click high-res P&L receipt cards with watermark verification for Twitter/X and Discord\n• Instant desk ledger synchronization, multi-trader balance races, and ranked room leaderboards\n• Live trade execution TP/SL automated risk tracking enhancements\n• WebRTC low-latency voice room and screen share stability fixes",
    authorName: "Nathan (App Owner)",
    createdAt: "2026-08-26T14:30:00.000Z",
  },
  {
    id: "default_v1.0.25",
    title: "Acoustic Guard & Consistency Calendars",
    version: "v1.0.25",
    tag: "UI & Chat Update",
    message: "• Interactive Trading Consistency Heatmap & Calendar view\n• Custom acoustic sound notifications for trade entries and daily goal triggers\n• Direct Private Messaging (DMs) with friends and live desk peers\n• Discord & CrabNebula desktop continuous auto-updater support",
    authorName: "Nathan (App Owner)",
    createdAt: "2026-08-24T18:00:00.000Z",
  },
];

export default function WebUpdateNotifier() {
  const [activeUpdate, setActiveUpdate] = useState<AppUpdateData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"latest" | "history">("latest");
  const [historyList, setHistoryList] = useState<AppUpdateData[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AppUpdateData | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const activeUpdateRef = React.useRef<AppUpdateData | null>(null);

  useEffect(() => {
    activeUpdateRef.current = activeUpdate;
  }, [activeUpdate]);

  const fetchHistoryList = async () => {
    try {
      setIsLoadingHistory(true);
      const updatesQuery = query(collection(db, "app_updates"), orderBy("createdAt", "desc"), limit(25));
      const snap = await getDocs(updatesQuery);
      const list: AppUpdateData[] = [];
      snap.forEach((d) => {
        if (d.id !== "latest") {
          list.push(d.data() as AppUpdateData);
        }
      });

      // Merge with default history to ensure complete timeline
      const map = new Map<string, AppUpdateData>();
      list.forEach((item) => map.set(item.version || item.id, item));
      DEFAULT_ARCHIVE_UPDATES.forEach((item) => {
        if (!map.has(item.version)) {
          map.set(item.version, item);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setHistoryList(merged);
    } catch (err) {
      console.warn("Failed to fetch update history list:", err);
      setHistoryList(DEFAULT_ARCHIVE_UPDATES);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    // 1. Listen for custom preview or direct re-open event (from Header or Settings)
    const handleOpenReview = (e: CustomEvent<AppUpdateData>) => {
      if (e.detail) {
        setActiveUpdate(e.detail);
        setActiveViewTab("latest");
        setSelectedHistoryItem(null);
        setShowModal(true);
        fetchHistoryList();
      }
    };

    const handleOpenLatest = async () => {
      setActiveViewTab("latest");
      setSelectedHistoryItem(null);
      fetchHistoryList();

      if (activeUpdateRef.current) {
        setShowModal(true);
      } else {
        try {
          const snap = await getDoc(doc(db, "app_updates", "latest"));
          if (snap.exists()) {
            const data = snap.data() as AppUpdateData;
            setActiveUpdate(data);
          } else {
            setActiveUpdate(DEFAULT_ARCHIVE_UPDATES[0]);
          }
          setShowModal(true);
        } catch (err) {
          console.warn("Failed to fetch latest update doc:", err);
          setActiveUpdate(DEFAULT_ARCHIVE_UPDATES[0]);
          setShowModal(true);
        }
      }
    };

    window.addEventListener("syncpl_preview_update", handleOpenReview as EventListener);
    window.addEventListener("syncpl_open_latest_update", handleOpenLatest as EventListener);

    // 2. Real-time Firestore listener for latest broadcast update
    const latestRef = doc(db, "app_updates", "latest");
    const unsubscribe = onSnapshot(
      latestRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppUpdateData;
          if (data && data.id && data.message) {
            setActiveUpdate(data);
            const lastSeen = localStorage.getItem("syncpl_last_seen_update_id");
            // Only auto-pop once per unique update id
            if (lastSeen !== data.id) {
              setShowModal(true);
            }
          }
        }
      },
      (error) => {
        console.warn("[UpdateNotifier] Firestore listener notice:", error);
      }
    );

    return () => {
      window.removeEventListener("syncpl_preview_update", handleOpenReview as EventListener);
      window.removeEventListener("syncpl_open_latest_update", handleOpenLatest as EventListener);
      unsubscribe();
    };
  }, []);

  const handleDismiss = () => {
    if (activeUpdate?.id) {
      localStorage.setItem("syncpl_last_seen_update_id", activeUpdate.id);
    }
    setShowModal(false);
  };

  const handleReloadAndApply = () => {
    if (activeUpdate?.id) {
      localStorage.setItem("syncpl_last_seen_update_id", activeUpdate.id);
    }
    setShowModal(false);
    window.location.reload();
  };

  if (!showModal || !activeUpdate) return null;

  const currentDisplayUpdate = selectedHistoryItem || activeUpdate;

  const filteredHistory = historyList.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.version && item.version.toLowerCase().includes(q)) ||
      (item.tag && item.tag.toLowerCase().includes(q)) ||
      (item.message && item.message.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden bg-[#1E2023] border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="relative p-5 sm:p-6 border-b border-[#2A2D31] bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-[#1E2023]">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2D31] rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-inner shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {currentDisplayUpdate.tag || "New Features"}
                </span>
                {currentDisplayUpdate.version && (
                  <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    {currentDisplayUpdate.version}
                  </span>
                )}
                {selectedHistoryItem && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded font-bold">
                    Viewing Archived Release
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white mt-1 leading-tight tracking-wide truncate max-w-md sm:max-w-xl">
                {currentDisplayUpdate.title || "SyncPL Trading Dashboard Updates"}
              </h3>
            </div>
          </div>

          {/* Navigation Mode Switcher: Latest vs Previous History */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#2A2D31]/70">
            <button
              type="button"
              onClick={() => {
                setActiveViewTab("latest");
                setSelectedHistoryItem(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewTab === "latest" && !selectedHistoryItem
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/50"
                  : "bg-[#121417] text-gray-400 hover:text-gray-200 border border-[#2A2D31]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Latest Release ({activeUpdate.version || "v1.0.27"})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveViewTab("history");
                if (!historyList.length) fetchHistoryList();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewTab === "history" || selectedHistoryItem
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/50"
                  : "bg-[#121417] text-gray-400 hover:text-gray-200 border border-[#2A2D31]"
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-300" />
              Changelog & Previous Updates ({historyList.length || DEFAULT_ARCHIVE_UPDATES.length})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
          {activeViewTab === "latest" && !selectedHistoryItem ? (
            /* Latest Update View */
            <div className="space-y-4">
              {/* Metadata Row */}
              <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-[#2A2D31]/60">
                <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
                  {activeUpdate.authorName ? `Posted by ${activeUpdate.authorName}` : "Official Release Announcement"}
                </span>
                <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  {activeUpdate.createdAt ? new Date(activeUpdate.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Current Live Version"}
                </span>
              </div>

              {/* Manually Typed Message Box */}
              <div className="space-y-1.5">
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  What's New in this Update:
                </h5>
                <div className="p-4 bg-[#121417] border border-[#2A2D31] rounded-xl text-xs text-gray-200 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                  {activeUpdate.message}
                </div>
              </div>

              {/* Quick View Prior Updates Banner */}
              <div className="p-3 bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-purple-200">
                  <History className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Looking for older features or past patch notes?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewTab("history");
                    if (!historyList.length) fetchHistoryList();
                  }}
                  className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-purple-200 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Browse Changelog <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Refresh Prompt Box */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300">
                <BellRing className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Click <strong>Reload & Apply</strong> to load the newest web build instantly.</span>
              </div>
            </div>
          ) : (
            /* Version History & Changelog Timeline View */
            <div className="space-y-4">
              {/* Search & Timeline Header */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search past updates, features, or versions..."
                    className="w-full bg-[#121417] border border-[#2A2D31] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                {selectedHistoryItem && (
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(null)}
                    className="px-3 py-1.5 bg-[#121417] hover:bg-[#2A2D31] border border-[#2A2D31] text-xs font-bold text-gray-300 hover:text-white rounded-xl transition cursor-pointer shrink-0"
                  >
                    Back to All Versions
                  </button>
                )}
              </div>

              {/* Selected Archived Release Detail */}
              {selectedHistoryItem ? (
                <div className="p-4 bg-[#121417] border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2D31]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        {selectedHistoryItem.version}
                      </span>
                      <h4 className="font-bold text-sm text-white">{selectedHistoryItem.title}</h4>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {selectedHistoryItem.createdAt ? new Date(selectedHistoryItem.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Archive"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#181B1F] border border-[#2A2D31] rounded-lg text-xs text-gray-200 leading-relaxed font-sans max-h-52 overflow-y-auto whitespace-pre-wrap select-text">
                    {selectedHistoryItem.message}
                  </div>
                </div>
              ) : null}

              {/* Changelog Timeline List */}
              <div className="space-y-2.5">
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  Release History Archive ({filteredHistory.length})
                </h5>

                {isLoadingHistory ? (
                  <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Loading changelog archive...</span>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-[#121417] border border-[#2A2D31] rounded-xl">
                    No release records matched your search.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredHistory.map((item, idx) => {
                      const isSelected = selectedHistoryItem?.id === item.id || (!selectedHistoryItem && activeViewTab === "latest" && item.version === activeUpdate.version);
                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => setSelectedHistoryItem(item)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/40"
                              : "bg-[#121417]/80 hover:bg-[#181B1F] border-[#2A2D31] hover:border-gray-700"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                {item.version}
                              </span>
                              <span className="text-xs font-bold text-gray-200 truncate">
                                {item.title || `Update ${item.version}`}
                              </span>
                              {item.tag && (
                                <span className="text-[9px] font-bold text-gray-400 bg-[#1E2023] border border-[#2A2D31] px-1.5 py-0.2 rounded">
                                  {item.tag}
                                </span>
                              )}
                              {item.version === activeUpdate.version && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> CURRENT
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                              {item.message.replace(/\n/g, " • ")}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-[10px] font-mono text-gray-500">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Release"}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-0.5 hover:underline">
                              View <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#121417] border-t border-[#2A2D31] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">SyncPL Trading Dashboard v1.0.27</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleReloadAndApply}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload & Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

