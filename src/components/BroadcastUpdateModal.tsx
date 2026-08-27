import React, { useState, useEffect } from "react";
import { X, Megaphone, Sparkles, Send, Eye, CheckCircle2, History, Trash2, Clock, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { doc, setDoc, collection, getDocs, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppUpdateData } from "./WebUpdateNotifier";

interface BroadcastUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentUserId: string;
  isAppOwner: boolean;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function BroadcastUpdateModal({
  isOpen,
  onClose,
  currentUsername,
  currentUserId,
  isAppOwner,
  triggerToast,
}: BroadcastUpdateModalProps) {
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("v1.0.27");
  const [tag, setTag] = useState("Feature Release");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousUpdates, setPreviousUpdates] = useState<AppUpdateData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      if (!message) {
        setMessage(
          "• Interactive Live Screen Spotlight & Getting Started Guide\n• 100% Clear UI Component Locators with dynamic visual highlights\n• Desk Tilt Guard loss lockout & automated acoustic alarms\n• Real-time P&L sync, Consistency Calendars, and multi-trader race charts\n• Instant Social Flex Card receipts & Twitter/Discord exports"
        );
      }
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const updatesQuery = query(collection(db, "app_updates"), orderBy("createdAt", "desc"), limit(10));
      const snap = await getDocs(updatesQuery);
      const list: AppUpdateData[] = [];
      snap.forEach((d) => {
        if (d.id !== "latest") {
          list.push(d.data() as AppUpdateData);
        }
      });
      setPreviousUpdates(list);
    } catch (err) {
      console.warn("Failed to fetch update history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePreview = () => {
    if (!message.trim()) {
      if (triggerToast) triggerToast("Empty Message", "Please type a message before previewing.", "error");
      return;
    }

    const previewData: AppUpdateData = {
      id: "preview_" + Date.now(),
      title: title.trim() || `SyncPL Update ${version}`,
      version: version.trim() || "v1.0.27",
      tag: tag || "Feature Release",
      message: message.trim(),
      authorName: currentUsername || "Nathan (App Owner)",
      authorId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    window.dispatchEvent(
      new CustomEvent("syncpl_preview_update", { detail: previewData })
    );
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAppOwner) {
      if (triggerToast) {
        triggerToast("Access Denied", "Only the App Owner (1NathanDrew6@gmail.com) can publish feature updates.", "error");
      }
      return;
    }

    if (!message.trim()) {
      if (triggerToast) triggerToast("Missing Message", "Please enter the changelog or update notes.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const updateId = `update_${Date.now()}`;
      const payload: AppUpdateData = {
        id: updateId,
        title: title.trim() || `SyncPL Update ${version}`,
        version: version.trim() || "v1.0.27",
        tag: tag || "Feature Release",
        message: message.trim(),
        authorName: currentUsername || "Nathan (App Owner)",
        authorId: currentUserId,
        createdAt: new Date().toISOString(),
      };

      // 1. Save specific archive doc
      await setDoc(doc(db, "app_updates", updateId), payload);

      // 2. Overwrite latest doc to immediately notify all active web clients in real-time
      await setDoc(doc(db, "app_updates", "latest"), payload);

      if (triggerToast) {
        triggerToast("Update Broadcasted!", "All web and desktop clients will now receive your update popup.", "success");
      }

      // Also display preview on current user screen
      window.dispatchEvent(
        new CustomEvent("syncpl_preview_update", { detail: payload })
      );

      fetchHistory();
      onClose();
    } catch (err: any) {
      console.error("Failed to broadcast update:", err);
      if (triggerToast) {
        triggerToast("Broadcast Failed", err.message || "Failed to publish update. Check permissions.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!isAppOwner) {
      if (triggerToast) triggerToast("Unauthorized", "Only the app owner can remove update archives.", "error");
      return;
    }

    try {
      await deleteDoc(doc(db, "app_updates", id));
      setPreviousUpdates((prev) => prev.filter((u) => u.id !== id));
      if (triggerToast) triggerToast("Deleted", "Update archive removed.", "info");
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1E2023] border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/50 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2A2D31] bg-gradient-to-r from-indigo-950/60 via-purple-950/30 to-[#1E2023] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Post New Feature Update
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  App Owner Only
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Broadcast custom release notes and feature popups to all web users.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2D31] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-owner Alert */}
        {!isAppOwner && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3 text-xs text-amber-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <strong className="font-semibold">App Owner Protected:</strong> You are currently signed in as a standard user. Only the verified App Owner (Nathan) can publish live update broadcasts to all users.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleBroadcast} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Version */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                Version Tag
              </label>
              <input
                type="text"
                value={version}
                disabled={!isAppOwner}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.0.27"
                className="w-full bg-[#121417] border border-[#2A2D31] disabled:opacity-60 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Category Tag */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                Update Badge
              </label>
              <select
                value={tag}
                disabled={!isAppOwner}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-[#121417] border border-[#2A2D31] disabled:opacity-60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="Feature Release">Feature Release</option>
                <option value="Dashboard Update">Dashboard Update</option>
                <option value="Performance Patch">Performance Patch</option>
                <option value="UI & Chat Update">UI & Chat Update</option>
                <option value="Bug Fixes">Bug Fixes</option>
                <option value="Major Release">Major Release</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                Headline Title
              </label>
              <input
                type="text"
                value={title}
                disabled={!isAppOwner}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Trading Desk & Ledger Update"
                className="w-full bg-[#121417] border border-[#2A2D31] disabled:opacity-60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase text-gray-400">
                Changelog / Manual Update Message
              </label>
              <span className="text-[10px] text-gray-500">Supports bullet points & line breaks</span>
            </div>
            <textarea
              rows={5}
              value={message}
              disabled={!isAppOwner}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type what you added or changed..."
              className="w-full bg-[#121417] border border-[#2A2D31] disabled:opacity-60 rounded-xl p-3.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-indigo-500 transition resize-none font-sans"
              required
            />
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>When published by App Owner, all active web sessions receive this popup instant-sync.</span>
            </div>
            <button
              type="button"
              onClick={handlePreview}
              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-lg text-indigo-200 font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Eye className="w-3 h-3" />
              Test Preview
            </button>
          </div>

          {/* Recent Broadcast History */}
          {previousUpdates.length > 0 && (
            <div className="pt-3 border-t border-[#2A2D31]/60">
              <h5 className="text-[11px] font-bold uppercase text-gray-400 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                Previously Broadcasted Updates ({previousUpdates.length})
              </h5>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {previousUpdates.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-[#121417]/80 border border-[#2A2D31] rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-indigo-400 text-[11px]">{item.version}</span>
                        <span className="font-semibold text-gray-200 truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.message.replace(/\n/g, " • ")}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTitle(item.title);
                          setVersion(item.version);
                          setTag(item.tag || "Feature Release");
                          setMessage(item.message);
                        }}
                        className="px-2 py-1 bg-[#1E2023] hover:bg-[#2A2D31] text-gray-300 rounded text-[10px] font-bold transition cursor-pointer"
                        title="Load into editor"
                      >
                        Copy
                      </button>
                      {isAppOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition cursor-pointer"
                          title="Delete archive entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#2A2D31] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[#121417] hover:bg-[#2A2D31] border border-[#2A2D31] rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAppOwner}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Broadcasting..." : "Publish & Broadcast Popup"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
