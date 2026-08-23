import React, { useState, useEffect } from "react";
import {
  User,
  Sparkles,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Eye,
} from "lucide-react";
import { UserProfile } from "../../types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AppUpdateData } from "../WebUpdateNotifier";

interface ProfileSettingsTabProps {
  profile: UserProfile | null;
  onUpdateProfile: (
    username: string,
    color: "indigo" | "pink" | "emerald" | "amber" | "sky",
    type: "emoji" | "url",
    val: string
  ) => Promise<void>;
  subscriptionState: {
    isPremium: boolean;
    daysRemaining: number;
    isExpired: boolean;
    status: string;
  };
  isAppOwnerUser: boolean;
  onOpenBroadcastModal: () => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
  onOpenUpgradeModal?: (reason?: "logs_limit" | "ai_limit" | "skin_locked" | "monetization_locked" | "general") => void;
}

export default function ProfileSettingsTab({
  profile,
  onUpdateProfile,
  subscriptionState,
  isAppOwnerUser,
  onOpenBroadcastModal,
  triggerToast,
  onOpenUpgradeModal,
}: ProfileSettingsTabProps) {
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarColor, setAvatarColor] = useState<"indigo" | "pink" | "emerald" | "amber" | "sky">(
    profile?.avatarColor || "indigo"
  );
  const [avatarType, setAvatarType] = useState<"emoji" | "url">(profile?.avatarType || "emoji");
  const [avatarVal, setAvatarVal] = useState(profile?.avatarVal || "🐂");

  const [activeSkin, setActiveSkin] = useState<string>(() => {
    try {
      return localStorage.getItem("syncpl_custom_skin") || "default";
    } catch {
      return "default";
    }
  });

  const [runningVersion, setRunningVersion] = useState("1.0.16");
  const [latestBroadcastUpdate, setLatestBroadcastUpdate] = useState<AppUpdateData | null>(null);
  const [updateState, setUpdateState] = useState<{
    status: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "installed" | "error" | "web";
    version?: string;
    body?: string;
    errorMsg?: string;
    progress?: number;
    updateObj?: any;
  }>({ status: "idle" });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setAvatarColor(profile.avatarColor);
      setAvatarType(profile.avatarType);
      setAvatarVal(profile.avatarVal);
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@tauri-apps/api/app")
        .then(({ getVersion }) => {
          getVersion().then((ver) => setRunningVersion(ver)).catch(() => {});
        })
        .catch(() => {});
    }

    getDoc(doc(db, "app_updates", "latest"))
      .then((snap) => {
        if (snap.exists()) {
          setLatestBroadcastUpdate(snap.data() as AppUpdateData);
        }
      })
      .catch((err) => console.warn("Failed to load broadcast update:", err));
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await onUpdateProfile(username.trim(), avatarColor, avatarType, avatarVal);
    if (triggerToast) {
      triggerToast("Profile Updated", "Your profile configurations were saved successfully.", "success");
    } else {
      alert("Profile configurations updated!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      if (triggerToast) {
        triggerToast("Upload Failed", "Please upload an image smaller than 500KB.", "error");
      } else {
        alert("Please upload an image smaller than 500KB.");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarType("url");
        setAvatarVal(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCheckForUpdates = async () => {
    setUpdateState({ status: "checking" });

    const isTauri =
      typeof window !== "undefined" &&
      ((window as any).__TAURI__ ||
        (window as any).__TAURI_INTERNALS__ ||
        window.location.protocol === "tauri:" ||
        window.location.protocol === "asset:" ||
        window.location.hostname === "tauri.localhost" ||
        window.location.hostname === "");

    if (!isTauri) {
      try {
        const snap = await getDoc(doc(db, "app_updates", "latest"));
        if (snap.exists()) {
          const updateData = snap.data() as AppUpdateData;
          setLatestBroadcastUpdate(updateData);
          setUpdateState({
            status: "web",
            version: updateData.version || "v1.0.22",
            body: updateData.message || "Latest custom release notes synced.",
            errorMsg: `Web edition is active. Latest announcement: "${updateData.title || updateData.version}"`,
          });
        } else {
          setUpdateState({
            status: "web",
            version: "v1.0.22",
            errorMsg: "Web edition is active and synced with the latest deployed build.",
          });
        }
      } catch {
        setUpdateState({
          status: "web",
          errorMsg: "Web edition is active and synced with the latest deployed build.",
        });
      }
      return;
    }

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update && update.available) {
        setUpdateState({
          status: "available",
          version: update.version,
          body: update.body || "",
          updateObj: update,
        });
      } else {
        setUpdateState({
          status: "up-to-date",
          version: runningVersion,
        });
      }
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg.includes("Could not fetch a valid release JSON") ||
        msg.includes("204") ||
        msg.includes("404") ||
        msg.includes("no release") ||
        msg.includes("up to date") ||
        msg.includes("latest version is already installed")
      ) {
        setUpdateState({
          status: "up-to-date",
          version: runningVersion,
        });
      } else {
        setUpdateState({
          status: "error",
          errorMsg: msg,
        });
      }
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateState.updateObj) return;
    setUpdateState((prev) => ({ ...prev, status: "downloading", progress: 0 }));

    try {
      let downloaded = 0;
      let contentLength = 0;
      await updateState.updateObj.downloadAndInstall((event: any) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength || 0;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setUpdateState((prev) => ({ ...prev, progress: pct }));
            }
            break;
          case "Finished":
            setUpdateState((prev) => ({ ...prev, progress: 100 }));
            break;
        }
      });

      setUpdateState((prev) => ({ ...prev, status: "installed" }));
    } catch (err: any) {
      setUpdateState({
        status: "error",
        errorMsg: err.message || "Failed to download and install update.",
      });
    }
  };

  const handleRelaunchApp = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      window.location.reload();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
      {/* Left Column: Profile & Desk Theme */}
      <div className="lg:col-span-6 space-y-6">
        {/* Profile Settings Form */}
        <form
          onSubmit={handleProfileSubmit}
          className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              <User className="text-[#5865F2] w-4.5 h-4.5" /> Sync Profile Settings
            </h4>
            <span className="text-[10px] font-mono text-gray-400 bg-[#121417] px-2 py-0.5 rounded border border-[#2A2D31]">
              Identity
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              maxLength={18}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Trader Nickname"
              className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
              Profile Icon Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(["indigo", "pink", "emerald", "amber", "sky"] as const).map((color) => {
                const bgClass =
                  color === "indigo"
                    ? "bg-[#5865F2]"
                    : color === "pink"
                    ? "bg-pink-500"
                    : color === "emerald"
                    ? "bg-emerald-500"
                    : color === "amber"
                    ? "bg-amber-500"
                    : "bg-sky-400";
                const isSel = avatarColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-8 h-8 rounded border border-white/10 ${bgClass} cursor-pointer ${
                      isSel ? "ring-2 ring-[#5865F2] ring-offset-2 ring-offset-[#0F1113]" : ""
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
              Avatar Type
            </label>
            <div className="flex rounded overflow-hidden border border-[#2A2D31]">
              <button
                type="button"
                onClick={() => setAvatarType("emoji")}
                className={`flex-grow py-2 text-xs font-bold transition cursor-pointer ${
                  avatarType === "emoji"
                    ? "bg-[#5865F2]/10 text-[#5865F2] border-r border-[#2A2D31]"
                    : "bg-[#121417] text-[#8E9297] border-r border-[#2A2D31]"
                }`}
              >
                Emoji Icon
              </button>
              <button
                type="button"
                onClick={() => setAvatarType("url")}
                className={`flex-grow py-2 text-xs font-bold transition cursor-pointer ${
                  avatarType === "url" ? "bg-[#5865F2]/10 text-[#5865F2]" : "bg-[#121417] text-[#8E9297]"
                }`}
              >
                Image URL / Upload
              </button>
            </div>

            {avatarType === "emoji" ? (
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-[#8E9297] uppercase tracking-widest">
                  Trading Icon Preset
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {["🐂", "🐻", "🐳", "🚀", "📈", "💰", "⚡", "🧠", "👑", "🎯"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarVal(emoji)}
                      className={`p-2 bg-[#121417] border border-[#2A2D31] rounded text-sm hover:border-[#5865F2] transition cursor-pointer ${
                        avatarVal === emoji ? "border-[#5865F2] bg-[#5865F2]/10" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-[#8E9297] uppercase tracking-widest">
                    Custom Image Upload
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="custom-pfp-upload"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("custom-pfp-upload")?.click()}
                    className="w-full bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-white font-bold text-xs py-2 rounded transition cursor-pointer"
                  >
                    Upload File from PC
                  </button>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#8E9297] uppercase tracking-widest">
                    Or Paste Image Address Link
                  </label>
                  <input
                    type="url"
                    value={avatarType === "url" ? avatarVal : ""}
                    onChange={(e) => setAvatarVal(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs py-2.5 rounded transition shadow cursor-pointer"
          >
            Apply Profile Changes
          </button>
        </form>

        {/* Bespoke Desk Skin Customization */}
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] bg-[#1E2023]/45 shadow-lg">
          <h4 className="font-bold text-gray-100 text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Sparkles className="text-amber-500 w-4 h-4 animate-pulse" /> Premium Desk Customization
            </span>
            {subscriptionState?.isPremium ? (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                Unlocked
              </span>
            ) : (
              <span className="text-[9px] bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-gray-400" /> Locked
              </span>
            )}
          </h4>
          <p className="text-[11px] text-[#8E9297] leading-relaxed">
            Bespoke glowing background skins and ambient colors. Premium Workspace perk.
          </p>

          <div className="space-y-3 pt-1">
            {/* Obsidian Deep Blue */}
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("syncpl_custom_skin", "default");
                setActiveSkin("default");
                window.dispatchEvent(new Event("syncpl_skin_updated"));
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition cursor-pointer ${
                activeSkin === "default"
                  ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-200"
                  : "bg-[#121417]/40 border-[#2A2D31]/50 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 border border-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-white">Obsidian Deep Blue</p>
                  <p className="text-[9px] text-gray-400">Standard deep-space layout theme.</p>
                </div>
              </div>
              {activeSkin === "default" && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>

            {/* Solar Gold Glow */}
            <button
              type="button"
              onClick={() => {
                if (!subscriptionState?.isPremium) {
                  onOpenUpgradeModal?.("skin_locked");
                  return;
                }
                localStorage.setItem("syncpl_custom_skin", "amber");
                setActiveSkin("amber");
                window.dispatchEvent(new Event("syncpl_skin_updated"));
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition relative cursor-pointer ${
                !subscriptionState?.isPremium
                  ? "bg-[#121417]/40 border-[#2A2D31]/40 text-gray-400 hover:border-amber-500/50 hover:bg-amber-500/5"
                  : activeSkin === "amber"
                  ? "bg-amber-600/10 border-amber-500/50 text-amber-200"
                  : "bg-[#121417]/40 border-[#2A2D31]/50 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-400" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Solar Gold Glow
                    {!subscriptionState?.isPremium && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-amber-400" /> PRO
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] text-gray-400">Amber solar flares with golden ambient highlights.</p>
                </div>
              </div>
              {activeSkin === "amber" && subscriptionState?.isPremium && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            {/* Neon Emerald Cyber */}
            <button
              type="button"
              onClick={() => {
                if (!subscriptionState?.isPremium) {
                  onOpenUpgradeModal?.("skin_locked");
                  return;
                }
                localStorage.setItem("syncpl_custom_skin", "emerald");
                setActiveSkin("emerald");
                window.dispatchEvent(new Event("syncpl_skin_updated"));
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition relative cursor-pointer ${
                !subscriptionState?.isPremium
                  ? "bg-[#121417]/40 border-[#2A2D31]/40 text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  : activeSkin === "emerald"
                  ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-200"
                  : "bg-[#121417]/40 border-[#2A2D31]/50 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Neon Emerald Cyber
                    {!subscriptionState?.isPremium && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" /> PRO
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] text-gray-400">High-tech cyber matrix theme with emerald flows.</p>
                </div>
              </div>
              {activeSkin === "emerald" && subscriptionState?.isPremium && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: App & System Updates */}
      <div className="lg:col-span-6 space-y-6">
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] bg-[#1E2023]/45 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              <RefreshCw className="text-[#5865F2] w-4.5 h-4.5" /> System & App Updates
            </h4>
            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CrabNebula CDN
            </span>
          </div>

          <p className="text-[11px] text-[#8E9297] leading-relaxed">
            Verify your desktop environment or check for new builds of SyncPL Trading via CrabNebula Cloud.
          </p>

          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#121417]/60 border border-[#2A2D31]/50 rounded-lg">
            <span className="text-xs text-neutral-400 font-medium">App Build Version</span>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
              v{runningVersion} (Desktop)
            </span>
          </div>

          {/* Dynamic Update Status Banners */}
          {updateState.status === "checking" && (
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="text-xs text-indigo-200 font-medium">Connecting to CrabNebula Cloud CDN...</span>
            </div>
          )}

          {updateState.status === "up-to-date" && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-300">SyncPL Trading is fully up-to-date!</p>
                <p className="text-emerald-400/80 text-[11px] mt-0.5">
                  You are currently running version v{updateState.version || runningVersion}.
                </p>
              </div>
            </div>
          )}

          {updateState.status === "web" && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-amber-300">Web Client Detected</p>
                <p className="text-amber-400/80 text-[11px] mt-0.5">{updateState.errorMsg}</p>
              </div>
            </div>
          )}

          {updateState.status === "available" && (
            <div className="p-4 bg-gradient-to-br from-indigo-950/50 to-purple-950/40 border border-indigo-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-bounce" />
                  New Update Available: v{updateState.version}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Ready to Install
                </span>
              </div>
              {updateState.body && (
                <div className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded text-[11px] text-neutral-300 max-h-24 overflow-y-auto">
                  {updateState.body}
                </div>
              )}
              <button
                type="button"
                onClick={handleInstallUpdate}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Download & Install Update Now
              </button>
            </div>
          )}

          {updateState.status === "downloading" && (
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-semibold text-neutral-200">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  Downloading update packages...
                </span>
                <span className="text-indigo-400 font-mono">{updateState.progress || 0}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden p-[2px] border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${updateState.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {updateState.status === "installed" && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Update Downloaded & Installed Successfully!</span>
              </div>
              <button
                type="button"
                onClick={handleRelaunchApp}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Relaunch Application Now
              </button>
            </div>
          )}

          {updateState.status === "error" && (
            <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Update Check Notice</span>
              </div>
              <p className="text-[11px] text-red-300/80">{updateState.errorMsg}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={updateState.status === "checking" || updateState.status === "downloading"}
              className="flex-1 bg-[#1E2023] border border-[#2A2D31] hover:bg-[#24272C] disabled:opacity-50 text-gray-200 font-bold text-xs py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateState.status === "checking" ? "animate-spin" : ""}`} />
              {updateState.status === "checking" ? "Checking Status..." : "Check for Updates"}
            </button>

            {isAppOwnerUser && (
              <button
                type="button"
                onClick={onOpenBroadcastModal}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
                title="App Owner: Post and broadcast manually typed release notes"
              >
                <Megaphone className="w-3.5 h-3.5 text-indigo-200" />
                Post Update
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (latestBroadcastUpdate) {
                  window.dispatchEvent(
                    new CustomEvent("syncpl_preview_update", { detail: latestBroadcastUpdate })
                  );
                } else {
                  window.dispatchEvent(new CustomEvent("syncpl_open_latest_update"));
                }
              }}
              className="bg-[#121417] border border-[#2A2D31] hover:bg-[#1E2023] text-gray-300 font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="View the latest update announcement popup"
            >
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              View Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
