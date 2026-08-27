import React, { useEffect, useRef, useState } from "react";
import {
  Monitor,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  Eye,
  StopCircle,
  ExternalLink,
  Sparkles,
  Users,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  HelpCircle,
  Layers,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VoiceUser } from "../types";
import { isImageAvatar } from "../utils/presence";

interface LiveScreenShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: MediaStream | null;
  streamerUser: {
    uid: string;
    username: string;
    avatarColor?: string;
    avatarType?: "emoji" | "url";
    avatarVal?: string;
  } | null;
  isLocalUserStream: boolean;
  onStopScreenShare?: () => void;
  activeVoiceUsers?: VoiceUser[];
  availableStreams?: Array<{
    uid: string;
    username: string;
    stream: MediaStream;
    isLocal: boolean;
  }>;
  onSelectStream?: (uid: string) => void;
}

export const LiveScreenShareModal: React.FC<LiveScreenShareModalProps> = ({
  isOpen,
  onClose,
  stream,
  streamerUser,
  isLocalUserStream,
  onStopScreenShare,
  activeVoiceUsers = [],
  availableStreams = [],
  onSelectStream,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isMuted, setIsMuted] = useState(isLocalUserStream); // Local screen share muted by default
  const [volume, setVolume] = useState(80);
  const [fps, setFps] = useState(60);
  const [resolution, setResolution] = useState("1080p");
  const [isMinimized, setIsMinimized] = useState(false);

  // Interactive Zoom, Pan & Crop State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 to 3.5
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activePreset, setActivePreset] = useState<string>("fit");
  const [showCropGuide, setShowCropGuide] = useState(false);
  const [isCropBarOpen, setIsCropBarOpen] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn("Video autoPlay error:", err);
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.height) {
          setResolution(`${settings.height}p`);
        }
        if (settings.frameRate) {
          setFps(Math.round(settings.frameRate));
        }
      }
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocalUserStream || isMuted;
      videoRef.current.volume = isLocalUserStream ? 0 : volume / 100;
    }
  }, [isLocalUserStream, isMuted, volume]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((e) => console.warn(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((e) => console.warn(e));
      setIsFullscreen(false);
    }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (e) {
      console.warn("Picture in Picture failed:", e);
    }
  };

  // Crop / Zoom helper functions
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(3.5, Math.max(1.0, parseFloat(newZoom.toFixed(2))));
    setZoomLevel(clamped);
    if (clamped === 1.0) {
      setPanOffset({ x: 0, y: 0 });
      setActivePreset("fit");
    } else {
      setActivePreset("custom");
    }
  };

  const handleApplyPreset = (preset: "fit" | "center" | "left" | "right" | "top" | "bottom") => {
    setActivePreset(preset);
    switch (preset) {
      case "fit":
        setZoomLevel(1.0);
        setPanOffset({ x: 0, y: 0 });
        break;
      case "center":
        setZoomLevel(1.8);
        setPanOffset({ x: 0, y: 0 });
        break;
      case "left":
        setZoomLevel(1.85);
        setPanOffset({ x: 22, y: 0 });
        break;
      case "right":
        setZoomLevel(1.85);
        setPanOffset({ x: -22, y: 0 });
        break;
      case "top":
        setZoomLevel(1.85);
        setPanOffset({ x: 0, y: 22 });
        break;
      case "bottom":
        setZoomLevel(1.85);
        setPanOffset({ x: 0, y: -22 });
        break;
    }
  };

  // Mouse & Touch Pan Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1.0) return;
    const maxPanX = (zoomLevel - 1) * 45;
    const maxPanY = (zoomLevel - 1) * 45;
    const newX = Math.max(-maxPanX, Math.min(maxPanX, e.clientX - dragStart.x));
    const newY = Math.max(-maxPanY, Math.min(maxPanY, e.clientY - dragStart.y));
    setPanOffset({ x: newX, y: newY });
    setActivePreset("custom");
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      handleZoomChange(zoomLevel + delta);
    }
  };

  const handleDoubleClick = () => {
    if (zoomLevel > 1.0) {
      handleApplyPreset("fit");
    } else {
      handleApplyPreset("center");
    }
  };

  if (!isOpen || !stream) return null;

  // Floating Minimized Mode (Allows trading in background while watching screen in corner)
  if (isMinimized) {
    return (
      <div
        id="live-screenshare-minimized"
        className="fixed bottom-20 right-6 z-50 w-80 bg-[#16181B] border border-indigo-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="bg-[#1E2023] px-3 py-2 border-b border-[#2A2D31] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[140px]">
              {streamerUser?.username || "Live Desk"}
            </span>
            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
              P2P 0 Cloud
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Expand Stage"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
              title="Close Stream"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center cursor-pointer group" onClick={() => setIsMinimized(false)}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocalUserStream || isMuted}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 shadow">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" /> Click to Expand
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="live-screenshare-stage-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 select-none animate-in fade-in"
    >
      <div
        ref={containerRef}
        className="w-full max-w-6xl max-h-[94vh] flex flex-col bg-[#121417] border border-[#2A2D31] rounded-2xl shadow-2xl overflow-hidden relative"
      >
        {/* Top Header Controls Bar */}
        <div className="px-4 py-2.5 bg-[#181A1E] border-b border-[#2A2D31] flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center space-x-3">
            {/* Streamer Avatar & Name */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-white shadow-inner overflow-hidden">
                  {isImageAvatar(streamerUser?.avatarType, streamerUser?.avatarVal) ? (
                    <img
                      src={streamerUser.avatarVal}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    typeof streamerUser?.avatarVal === "string" && streamerUser.avatarVal.length < 8
                      ? streamerUser.avatarVal
                      : "📈"
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#181A1E]" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                    {streamerUser?.username}
                    {isLocalUserStream && (
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        (You)
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <Radio className="w-3 h-3 mr-1" /> LIVE SCREEN
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono flex items-center space-x-2">
                  <span>Trading Terminal Screen</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">Direct P2P (0 Cloud Cost)</span>
                </div>
              </div>
            </div>

            {/* Stream selector if multiple users are sharing */}
            {availableStreams.length > 1 && (
              <div className="hidden sm:flex items-center space-x-1 pl-4 border-l border-[#2A2D31]">
                <span className="text-xs text-gray-400 font-medium mr-1">Switch:</span>
                {availableStreams.map((s) => (
                  <button
                    key={s.uid}
                    onClick={() => onSelectStream && onSelectStream(s.uid)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      s.uid === streamerUser?.uid
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[#25282C] text-gray-300 hover:text-white hover:bg-[#2F3338]"
                    }`}
                  >
                    {s.username} {s.isLocal ? "(You)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center space-x-2">
            {/* Stream metrics badge */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1113] border border-[#2A2D31] text-[11px] font-mono text-gray-400">
              <span className="text-indigo-400 font-semibold">{resolution}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{fps} FPS</span>
            </div>

            {/* Crop Guide Info Button */}
            <button
              onClick={() => setShowCropGuide(!showCropGuide)}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                showCropGuide
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-[#25282C] text-gray-300 hover:text-white border-[#2A2D31] hover:bg-[#2F3338]"
              }`}
              title="How to Crop Screen & Window Guide"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Stop Presenting Button if Local User */}
            {isLocalUserStream && onStopScreenShare && (
              <button
                onClick={onStopScreenShare}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Stop sharing your screen"
              >
                <StopCircle className="w-4 h-4" />
                <span>Stop Stream</span>
              </button>
            )}

            {/* Audio Controls for Remote Stream */}
            {!isLocalUserStream && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-[#25282C] rounded-lg border border-[#2A2D31]">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-gray-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                  title={isMuted ? "Unmute Stream Audio" : "Mute Stream Audio"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}

            {/* Picture in Picture */}
            <button
              onClick={togglePip}
              className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                isPipActive
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-[#25282C] text-gray-400 hover:text-white border-[#2A2D31] hover:bg-[#2F3338]"
              }`}
              title="Picture in Picture"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-white border border-[#2A2D31] hover:bg-[#2F3338] transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Minimize to bottom corner */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-white border border-[#2A2D31] hover:bg-[#2F3338] transition-colors cursor-pointer"
              title="Minimize to Corner (Trade & Watch)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-rose-400 border border-[#2A2D31] hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer"
              title="Close Stream View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Crop & Window Selection Info Banner */}
        {showCropGuide && (
          <div className="bg-indigo-950/90 border-b border-indigo-500/40 p-3 sm:p-4 text-xs text-indigo-100 flex items-start justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="space-y-1.5 flex-1">
              <div className="font-extrabold text-white text-sm flex items-center gap-2">
                <Crop className="w-4 h-4 text-indigo-400" />
                Two Ways to Crop & Focus Your Trading Screen:
              </div>
              <ul className="list-disc list-inside space-y-1 text-indigo-200">
                <li>
                  <strong className="text-white">1. Browser Window Capture (Source Crop):</strong> When starting screen share, choose the <span className="bg-indigo-900 px-1.5 py-0.5 rounded text-white font-mono">Window</span> or <span className="bg-indigo-900 px-1.5 py-0.5 rounded text-white font-mono">Tab</span> tab in the browser dialog to only capture your TradingView or NinjaTrader window instead of full monitors.
                </li>
                <li>
                  <strong className="text-white">2. Interactive Live Viewer Crop & Pan (Below):</strong> Use the zoom buttons, preset crop filters (Left Chart, Right DOM, Top Half), or click and drag anywhere on the video to focus directly into any quadrant!
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowCropGuide(false)}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Video Screen Surface with Interactive Pan & Zoom */}
        <div
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[480px] md:min-h-[560px] ${
            zoomLevel > 1.0 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          }`}
        >
          <div
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              transformOrigin: "center center",
            }}
            className="w-full h-full flex items-center justify-center pointer-events-none"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocalUserStream || isMuted}
              className="w-full h-full object-contain max-h-[78vh] pointer-events-auto"
            />
          </div>

          {/* Watermark in corner */}
          <div className="absolute bottom-3 left-3 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center space-x-2 text-[11px] text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider">SYNCLIVE DESK</span>
            <span className="text-gray-500 font-mono">| {streamerUser?.username}</span>
            {zoomLevel > 1.0 && (
              <span className="text-indigo-400 font-mono font-bold bg-indigo-500/20 px-1 rounded border border-indigo-500/30">
                {Math.round(zoomLevel * 100)}% Cropped Zoom
              </span>
            )}
          </div>

          {/* Floating hint when zoomed in */}
          {zoomLevel > 1.0 && (
            <div className="absolute top-3 left-3 pointer-events-none bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-gray-300 font-mono flex items-center gap-1.5">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Click & Drag to Pan • Double-click to reset</span>
            </div>
          )}

          {/* Floating action hint if local presenter */}
          {isLocalUserStream && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-950/85 backdrop-blur-md border border-indigo-500/40 px-4 py-2 rounded-xl text-center shadow-2xl pointer-events-none">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                You are streaming your live trading terminal (P2P zero cloud cost)
              </p>
            </div>
          )}
        </div>

        {/* Interactive Screen Crop & Zoom Toolbar */}
        <div className="px-3 sm:px-4 py-2 bg-[#15171A] border-t border-[#2A2D31] flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#1E2023] px-2 py-1 rounded-lg border border-[#2A2D31]">
              <Crop className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider hidden sm:inline">
                Crop / Focus:
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleApplyPreset("fit")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                  activePreset === "fit"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Fit full monitor (100%)"
              >
                Full Screen
              </button>

              <button
                onClick={() => handleApplyPreset("left")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                  activePreset === "left"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Focus on Left 60% (Main Chart)"
              >
                Left Chart
              </button>

              <button
                onClick={() => handleApplyPreset("right")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                  activePreset === "right"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Focus on Right 40% (Orderbook / Executions)"
              >
                Right DOM
              </button>

              <button
                onClick={() => handleApplyPreset("top")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border hidden md:inline-block ${
                  activePreset === "top"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Focus on Top Half (Indicators / Timeframes)"
              >
                Top Half
              </button>

              <button
                onClick={() => handleApplyPreset("bottom")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border hidden md:inline-block ${
                  activePreset === "bottom"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Focus on Bottom Half (Positions / Orders)"
              >
                Bottom Half
              </button>

              <button
                onClick={() => handleApplyPreset("center")}
                className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                  activePreset === "center"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#1E2023] border-[#2A2D31] text-gray-300 hover:text-white"
                }`}
                title="Center Zoom 1.8x"
              >
                Center Zoom
              </button>
            </div>
          </div>

          {/* Stepped Zoom Buttons & Reset */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleZoomChange(zoomLevel - 0.25)}
              disabled={zoomLevel <= 1.0}
              className="p-1.5 bg-[#1E2023] hover:bg-[#2A2D31] disabled:opacity-40 disabled:hover:bg-[#1E2023] text-gray-300 hover:text-white rounded border border-[#2A2D31] transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-mono font-bold text-indigo-400 bg-[#121417] px-2 py-1 rounded border border-[#2A2D31] min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => handleZoomChange(zoomLevel + 0.25)}
              disabled={zoomLevel >= 3.5}
              className="p-1.5 bg-[#1E2023] hover:bg-[#2A2D31] disabled:opacity-40 disabled:hover:bg-[#1E2023] text-gray-300 hover:text-white rounded border border-[#2A2D31] transition cursor-pointer"
              title="Zoom In (or Ctrl + Scroll)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {zoomLevel > 1.0 && (
              <button
                onClick={() => handleApplyPreset("fit")}
                className="flex items-center gap-1 px-2 py-1 bg-[#1E2023] hover:bg-[#2A2D31] text-gray-300 hover:text-white rounded border border-[#2A2D31] transition text-xs font-bold cursor-pointer"
                title="Reset Crop / Zoom"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Desk Members in Voice Bar */}
        {activeVoiceUsers.length > 0 && (
          <div className="px-4 py-2 bg-[#181A1E] border-t border-[#2A2D31] flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-gray-300">
                Desk Voice Channel Members ({activeVoiceUsers.length}):
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md py-0.5">
                {activeVoiceUsers.map((u) => (
                  <span
                    key={u.id || u.userId}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] ${
                      u.id === streamerUser?.uid || u.userId === streamerUser?.uid
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                        : "bg-[#25282C] text-gray-300 border border-[#2A2D31]"
                    }`}
                  >
                    {isImageAvatar(u.avatarType, u.avatarVal) ? (
                      <img
                        src={u.avatarVal}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>
                        {typeof u.avatarVal === "string" && u.avatarVal.length < 8 ? u.avatarVal : "👤"}
                      </span>
                    )}
                    <span>{u.username}</span>
                    {u.isScreenSharing && <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse ml-0.5" />}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-mono text-emerald-400 hidden sm:block">
              100% Client-Side WebRTC Stream • Zero Server Ingestion
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
