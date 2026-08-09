import React, { useEffect, useState } from "react";
import { ArrowUpCircle, X, Download, Play, RefreshCw, CheckCircle2, ExternalLink, Terminal, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

// Check if we are running inside Tauri
const isTauri = typeof window !== "undefined" && (
  (window as any).__TAURI__ || 
  window.location.protocol === "tauri:" || 
  window.location.protocol === "asset:" ||
  window.location.hostname === "tauri.localhost" ||
  window.location.hostname === ""
);

const openExternalUrl = async (url: string) => {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  } catch (err) {
    console.warn("plugin-opener failed:", err);
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:opener|open_url", { path: url });
    return;
  } catch (err) {
    console.warn("direct invoke failed:", err);
  }

  window.open(url, "_blank");
};

export default function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "downloading" | "installed" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLog, setDebugLog] = useState("");
  const [showDebug, setShowDebug] = useState(true);
  const [copied, setCopied] = useState(false);

  const [currentVersion, setCurrentVersion] = useState("1.0.20");

  useEffect(() => {
    if (!isTauri) return;

    // Retrieve version from tauri app info if available
    import("@tauri-apps/api/app").then(({ getVersion }) => {
      getVersion().then(ver => setCurrentVersion(ver)).catch(() => {});
    }).catch(() => {});

    // Small delay before checking on launch to let the dashboard render smoothly
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const checkForUpdates = async () => {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      
      if (update && update.available) {
        setUpdateInfo(update);
        setShowModal(true);
        setStatus("idle");
        setProgress(0);
      }
    } catch (err: any) {
      console.warn("[Auto-Updater] Check failed:", err);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!updateInfo) return;
    setStatus("downloading");
    setProgress(0);
    setErrorMsg("");
    setDebugLog("");

    const logLines: string[] = [];
    const addLog = (msg: string) => {
      logLines.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setDebugLog(logLines.join("\n"));
    };

    addLog(`Initiating update download for v${updateInfo.version}...`);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateInfo.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            addLog(`Download started. Package size: ${contentLength ? (contentLength / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength || 0;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setProgress(pct);
            }
            break;
          case 'Finished':
            addLog(`Download finished successfully. Applying package & verifying signature...`);
            setProgress(100);
            break;
        }
      });

      addLog(`Update installed successfully!`);
      setStatus("installed");
    } catch (err: any) {
      console.error("[Auto-Updater] Installation failed:", err);
      setStatus("error");
      
      const primaryMessage = typeof err === "string" 
        ? err 
        : err?.message || err?.toString() || "Failed to download and install update.";
      
      setErrorMsg(primaryMessage);

      // Build rich debug info
      let rawErrorStr = "";
      if (typeof err === "object" && err !== null) {
        try {
          rawErrorStr = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
        } catch {
          rawErrorStr = String(err);
        }
      } else {
        rawErrorStr = String(err);
      }

      const fullDebugInfo = [
        `=== SYNCPL UPDATER ERROR REPORT ===`,
        `Timestamp: ${new Date().toISOString()}`,
        `App Version: v${currentVersion}`,
        `Target Version: v${updateInfo?.version || "Unknown"}`,
        `User Agent: ${navigator.userAgent}`,
        `Error Summary: ${primaryMessage}`,
        `Raw Error Details:`,
        rawErrorStr,
        err?.stack ? `\nStack Trace:\n${err.stack}` : "",
        `\nEvent Log:\n${logLines.join("\n")}`
      ].filter(Boolean).join("\n");

      setDebugLog(fullDebugInfo);
      setShowDebug(true);
    }
  };

  const handleCopyDebug = () => {
    if (!debugLog) return;
    navigator.clipboard.writeText(debugLog).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.warn("Failed to copy log:", err);
    });
  };

  const handleRelaunch = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("Failed to relaunch application:", err);
      // Fallback
      window.location.reload();
    }
  };

  if (!showModal || !updateInfo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative p-6 border-b border-neutral-800 bg-gradient-to-r from-indigo-950/30 to-purple-950/30">
          <button 
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            disabled={status === "downloading"}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ArrowUpCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Update Available</h3>
              <p className="text-xs text-neutral-400 mt-0.5">A new version of SyncPL Trading is ready!</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex justify-between items-center px-4 py-3 bg-neutral-950/40 border border-neutral-800/60 rounded-xl">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-neutral-500">Current</span>
              <span className="text-sm font-semibold text-neutral-400">v{currentVersion}</span>
            </div>
            <div className="h-6 w-[1px] bg-neutral-800"></div>
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-400">New Version</span>
              <span className="text-sm font-bold text-indigo-400">v{updateInfo.version}</span>
            </div>
          </div>

          {updateInfo.body && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-neutral-300">Release Notes:</h4>
              <div className="max-h-24 overflow-y-auto p-3 bg-neutral-950/60 border border-neutral-800/40 rounded-lg text-xs text-neutral-400 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
                {updateInfo.body.split('\n').map((line: string, i: number) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Progress / Status display */}
          {status === "downloading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-neutral-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Downloading update packages...
                </span>
                <span className="font-bold text-indigo-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden p-[2px] border border-neutral-800">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {status === "installed" && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Update successfully loaded! The application must relaunch to apply the changes.</span>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-300 text-sm">Update Installation Failed</p>
                  <p className="text-neutral-300 text-xs mt-1 leading-relaxed font-medium">
                    {errorMsg || "Failed to download and install update."}
                  </p>
                </div>
              </div>

              {/* Debug drawer */}
              {debugLog && (
                <div className="border-t border-red-500/20 pt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDebug(!showDebug)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Debug & Error Details</span>
                      {showDebug ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyDebug}
                      className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-semibold rounded transition cursor-pointer"
                      title="Copy error diagnostic log to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Debug Info</span>
                        </>
                      )}
                    </button>
                  </div>

                  {showDebug && (
                    <pre className="p-3 bg-black/80 border border-red-900/40 rounded-lg text-[11px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap select-text max-h-48 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
                      {debugLog}
                    </pre>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-red-500/10 flex items-center justify-between">
                <span className="text-neutral-400 text-[11px]">Need manual setup?</span>
                <button
                  type="button"
                  onClick={() => openExternalUrl("https://github.com/royzbob/SyncPLv11/releases/latest")}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold transition cursor-pointer underline underline-offset-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Download Direct Installer from GitHub
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-neutral-950/40 border-t border-neutral-800 flex justify-end gap-3">
          {status === "idle" && (
            <>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Remind Me Later
              </button>
              <button
                onClick={handleDownloadAndInstall}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                Update & Install
              </button>
            </>
          )}

          {status === "downloading" && (
            <button
              disabled
              className="px-5 py-2 text-xs font-bold text-neutral-500 bg-neutral-800 border border-neutral-800 rounded-xl cursor-not-allowed"
            >
              Downloading...
            </button>
          )}

          {status === "installed" && (
            <button
              onClick={handleRelaunch}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4" />
              Relaunch Now
            </button>
          )}

          {status === "error" && (
            <div className="flex gap-2">
              <button
                onClick={() => openExternalUrl("https://github.com/royzbob/SyncPLv11/releases/latest")}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Direct Download
              </button>
              <button
                onClick={checkForUpdates}
                className="px-4 py-2 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Retry Check
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
