import React, { useEffect, useState } from "react";
import { X, Sparkles, RefreshCw, CheckCircle2, BellRing, Megaphone } from "lucide-react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
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

export default function WebUpdateNotifier() {
  const [activeUpdate, setActiveUpdate] = useState<AppUpdateData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const activeUpdateRef = React.useRef<AppUpdateData | null>(null);

  useEffect(() => {
    activeUpdateRef.current = activeUpdate;
  }, [activeUpdate]);

  useEffect(() => {
    // 1. Listen for custom preview or direct re-open event (from Header or Settings)
    const handleOpenReview = (e: CustomEvent<AppUpdateData>) => {
      if (e.detail) {
        setActiveUpdate(e.detail);
        setShowModal(true);
      }
    };

    const handleOpenLatest = async () => {
      if (activeUpdateRef.current) {
        setShowModal(true);
      } else {
        try {
          const snap = await getDoc(doc(db, "app_updates", "latest"));
          if (snap.exists()) {
            const data = snap.data() as AppUpdateData;
            setActiveUpdate(data);
          } else {
            setActiveUpdate({
              id: "default_v1.0.27",
              title: "SyncPL Trading Dashboard v1.0.27",
              version: "v1.0.27",
              tag: "Feature Release",
              message: "• Interactive Live Screen Spotlight & Getting Started Guide\n• 100% Clear UI Component Locators with dynamic visual highlights\n• Desk Tilt Guard loss lockout & automated acoustic alarms\n• Real-time P&L sync, Consistency Calendars, and multi-trader race charts\n• Instant Social Flex Card receipts & Twitter/Discord exports",
              authorName: "Nathan (App Owner)",
              createdAt: new Date().toISOString(),
            });
          }
          setShowModal(true);
        } catch (err) {
          console.warn("Failed to fetch latest update doc:", err);
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden bg-[#1E2023] border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col">
        
        {/* Header Banner */}
        <div className="relative p-6 border-b border-[#2A2D31] bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-[#1E2023]">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2D31] rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {activeUpdate.tag || "New Features"}
                </span>
                {activeUpdate.version && (
                  <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    {activeUpdate.version}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white mt-1 leading-tight tracking-wide">
                {activeUpdate.title || "New Update Available"}
              </h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-[#2A2D31]/60">
            <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
              <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
              {activeUpdate.authorName ? `Posted by ${activeUpdate.authorName}` : "Release Announcement"}
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              {activeUpdate.createdAt ? new Date(activeUpdate.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Just now"}
            </span>
          </div>

          {/* Manually Typed Message Box */}
          <div className="space-y-1.5">
            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              What's New in this Update:
            </h5>
            <div className="p-4 bg-[#121417] border border-[#2A2D31] rounded-xl text-xs text-gray-200 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
              {activeUpdate.message}
            </div>
          </div>

          {/* Refresh Prompt Box */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300">
            <BellRing className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Click <strong>Reload & Apply</strong> to load the newest web build instantly.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-[#121417] border-t border-[#2A2D31] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] rounded-xl transition cursor-pointer"
          >
            Got It
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
  );
}
