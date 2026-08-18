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
} from "lucide-react";
import { VoiceUser } from "../types";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isMuted, setIsMuted] = useState(isLocalUserStream); // Local screen share should be muted to prevent loop
  const [volume, setVolume] = useState(80);
  const [fps, setFps] = useState(60);
  const [resolution, setResolution] = useState("1080p");
  const [isMinimized, setIsMinimized] = useState(false);

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
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Expand Stage"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
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
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#121417] border border-[#2A2D31] rounded-2xl shadow-2xl overflow-hidden relative"
      >
        {/* Top Header Controls Bar */}
        <div className="px-4 py-3 bg-[#181A1E] border-b border-[#2A2D31] flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center space-x-3">
            {/* Streamer Avatar & Name */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                  {streamerUser?.avatarType === "url" && streamerUser.avatarVal ? (
                    <img
                      src={streamerUser.avatarVal}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    streamerUser?.avatarVal || "📈"
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
                  <span className="text-emerald-400 font-bold">Direct P2P (0 Cloud Data / 0 Cost)</span>
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
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
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
              <span>•</span>
              <span className="text-gray-300">Ultra-Low Latency</span>
            </div>

            {/* Stop Presenting Button if Local User */}
            {isLocalUserStream && onStopScreenShare && (
              <button
                onClick={onStopScreenShare}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center space-x-1.5"
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
                  className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
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
              className={`p-2 rounded-lg transition-colors border ${
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
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-white border border-[#2A2D31] hover:bg-[#2F3338] transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Minimize to bottom corner */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-white border border-[#2A2D31] hover:bg-[#2F3338] transition-colors"
              title="Minimize to Corner (Trade & Watch)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#25282C] text-gray-400 hover:text-rose-400 border border-[#2A2D31] hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
              title="Close Stream View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Screen Surface */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[480px] md:min-h-[560px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocalUserStream || isMuted}
            className="w-full h-full object-contain max-h-[78vh]"
          />

          {/* Watermark in corner */}
          <div className="absolute bottom-3 left-3 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center space-x-2 text-[11px] text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider">SYNCLIVE DESK</span>
            <span className="text-gray-500 font-mono">| {streamerUser?.username}</span>
          </div>

          {/* Floating action hint if local presenter */}
          {isLocalUserStream && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-950/80 backdrop-blur-md border border-indigo-500/40 px-4 py-2 rounded-xl text-center shadow-2xl pointer-events-none">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                You are presenting your live trading terminal to the desk
              </p>
              <p className="text-[10px] text-indigo-200 mt-0.5 font-mono">
                Streamed directly peer-to-peer to your desk members with zero cloud storage usage.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Desk Members in Voice Bar */}
        {activeVoiceUsers.length > 0 && (
          <div className="px-4 py-2.5 bg-[#181A1E] border-t border-[#2A2D31] flex items-center justify-between text-xs text-gray-400">
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
                    <span>{u.avatarVal || "👤"}</span>
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
