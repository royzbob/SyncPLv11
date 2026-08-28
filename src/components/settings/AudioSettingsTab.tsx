import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  BellRing,
  VolumeX,
  Play,
  Square,
  RefreshCw,
  Settings,
  Sparkles,
  Check,
} from "lucide-react";
import { playChatMessageSound, ChatNotificationSound } from "../../utils/audio";

interface AudioSettingsTabProps {
  voiceName: string;
  setVoiceName: (val: string) => void;
  vocalPrompt: string;
  setVocalPrompt: (val: string) => void;
  onConsultAiAdvisor: () => void;
  chatSoundEnabled?: boolean;
  onToggleChatSound?: (enabled: boolean) => void;
  chatSoundType?: ChatNotificationSound;
  onChangeChatSoundType?: (type: ChatNotificationSound) => void;
  chatSoundVolume?: number;
  onChangeChatSoundVolume?: (vol: number) => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function AudioSettingsTab({
  voiceName,
  setVoiceName,
  vocalPrompt,
  setVocalPrompt,
  onConsultAiAdvisor,
  chatSoundEnabled = true,
  onToggleChatSound,
  chatSoundType = "chime",
  onChangeChatSoundType,
  chatSoundVolume = 0.6,
  onChangeChatSoundVolume,
  triggerToast,
}: AudioSettingsTabProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>(() => {
    try {
      return localStorage.getItem("syncpl_selected_mic_id") || "";
    } catch {
      return "";
    }
  });
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [dbLevel, setDbLevel] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const handleSelectMic = (micId: string) => {
    setSelectedMicId(micId);
    try {
      localStorage.setItem("syncpl_selected_mic_id", micId);
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.warn("Failed saving mic ID", err);
    }
  };

  const enumerateMics = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
    } catch (e) {
      console.warn("Audio hardware capture permission denied or unavailable", e);
    }
  };

  useEffect(() => {
    enumerateMics();
  }, []);

  const toggleMicTest = async () => {
    if (isTestingMic) {
      stopMicTest();
    } else {
      await startMicTest();
    }
  };

  const startMicTest = async () => {
    try {
      const constraints = selectedMicId
        ? { audio: { deviceId: { exact: selectedMicId } } }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioContextClass();
      } catch (err) {
        console.debug("AudioContext unavailable:", err);
        return;
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);
      setIsTestingMic(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWave = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        animationRef.current = requestAnimationFrame(drawWave);

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setDbLevel(Math.round(average));

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) return;

        canvasCtx.fillStyle = "#060913";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 4;
          const greenVal = Math.min(255, 120 + barHeight * 3);
          const blueVal = Math.max(0, 200 - barHeight * 4);
          canvasCtx.fillStyle = `rgb(16, ${greenVal}, ${blueVal})`;

          const y = (canvas.height - barHeight) / 2;
          canvasCtx.fillRect(x, y, barWidth, barHeight);

          x += barWidth + 1.5;
        }
      };

      drawWave();
    } catch (e) {
      console.error("Mic test diagnostics failed", e);
      if (triggerToast) {
        triggerToast("Mic Test Failed", "Microphone permission denied or blocked.", "error");
      } else {
        alert("Microphone permission denied or blocked.");
      }
    }
  };

  const stopMicTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setDbLevel(0);
    setIsTestingMic(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const canvasCtx = canvas.getContext("2d");
      if (canvasCtx) {
        canvasCtx.fillStyle = "#060913";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
      {/* Left Column: Mic Diagnostics */}
      <div className="lg:col-span-6 space-y-6">
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              <Mic className="text-[#5865F2] w-4.5 h-4.5" /> Mic Hardware Diagnostic
            </h4>
            {selectedMicId && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Hardware Linked
              </span>
            )}
          </div>
          <p className="text-xs text-[#8E9297] leading-relaxed">
            Enumerate physical hardware microphones and trace decibels before entering voice nodes.
          </p>

          <div>
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
              Select Audio Input Device
            </label>
            <select
              value={selectedMicId}
              onChange={(e) => handleSelectMic(e.target.value)}
              className="w-full bg-[#121417] border border-[#2A2D31] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5865F2] text-white font-medium cursor-pointer"
            >
              <option value="">Default Microphone</option>
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone (${device.deviceId.substring(0, 5)})`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
              <span>Decibel Strength Meter</span>
              <span className="font-mono text-[#43B581] font-bold">{dbLevel} dB</span>
            </div>
            <div className="h-10 bg-[#121417] rounded-lg border border-[#2A2D31] overflow-hidden relative flex items-center px-1">
              <canvas ref={canvasRef} className="w-full h-8 block" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMicTest}
              className={`flex-grow border font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isTestingMic
                  ? "bg-rose-600/20 hover:bg-rose-600/35 border-rose-500/30 text-rose-400 animate-pulse"
                  : "bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border-[#5865F2]/30 text-indigo-400"
              }`}
            >
              {isTestingMic ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop Mic Diagnostic
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Test Microphone Live
                </>
              )}
            </button>
            <button
              type="button"
              onClick={enumerateMics}
              className="bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] text-gray-300 p-2.5 rounded-lg transition cursor-pointer"
              title="Refresh hardware"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Notification Sounds & Co-Pilot Engine */}
      <div className="lg:col-span-6 space-y-6">
        {/* Chat & Room Notification Sound Alerts */}
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              {chatSoundEnabled ? (
                <BellRing className="text-emerald-400 w-4.5 h-4.5 animate-pulse" />
              ) : (
                <VolumeX className="text-gray-500 w-4.5 h-4.5" />
              )}
              Chat & Trade Sound Alerts
            </h4>
            <button
              type="button"
              onClick={() => onToggleChatSound && onToggleChatSound(!chatSoundEnabled)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer border ${
                chatSoundEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
              }`}
            >
              {chatSoundEnabled ? "Sounds Active" : "Sounds Muted"}
            </button>
          </div>
          <p className="text-xs text-[#8E9297] leading-relaxed">
            Plays a crisp synthetic notification tone when room members send chats or post trade settlements.
          </p>

          {/* Sound Tone Presets */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
              Sound Effect Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "chime", label: "Harmonic Chime", icon: "🔔", desc: "Two-tone chord" },
                { id: "pop", label: "Message Pop", icon: "💬", desc: "Modern bubble" },
                { id: "ping", label: "Crystal Ping", icon: "💎", desc: "Crisp resonance" },
                { id: "tap", label: "Woody Tap", icon: "🪵", desc: "Subtle tick" },
              ].map((s) => {
                const isSelected = chatSoundType === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChangeChatSoundType && onChangeChatSoundType(s.id as ChatNotificationSound)}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm ring-1 ring-indigo-500/30"
                        : "bg-[#121417] border-[#2A2D31] text-gray-400 hover:text-gray-200 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                        <span>{s.icon}</span> {s.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Alert Volume
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {Math.round(chatSoundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={chatSoundVolume}
              disabled={!chatSoundEnabled}
              onChange={(e) => onChangeChatSoundVolume && onChangeChatSoundVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#121417] rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
            />
          </div>

          {/* Test Notification Button */}
          <button
            type="button"
            onClick={() => {
              playChatMessageSound(chatSoundVolume, chatSoundType);
              if (triggerToast) {
                triggerToast("Notification Test", `Playing "${chatSoundType}" alert tone.`, "info");
              }
            }}
            className="w-full bg-[#1E2023] hover:bg-[#24272C] border border-[#2A2D31] hover:border-indigo-500/30 text-gray-200 font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Chat Notification Sound</span>
          </button>
        </div>

        {/* Co-Pilot Voice Engine Settings */}
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              <Settings className="text-[#5865F2] w-4.5 h-4.5" /> Co-Pilot Voice Engine
            </h4>
            <span className="bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
              GEMINI TTS
            </span>
          </div>
          <p className="text-xs text-[#8E9297] leading-relaxed">
            Custom-tailor your voice assistant's speaking parameters. SyncPL uses Gemini to synthesize speaking outputs dynamically.
          </p>

          <div>
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
              Vocal Actor Presets
            </label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full bg-[#121417] border border-[#2A2D31] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5865F2] text-white font-medium cursor-pointer"
            >
              <option value="Zephyr">Zephyr (Bright)</option>
              <option value="Puck">Puck (Upbeat)</option>
              <option value="Charon">Charon (Informative)</option>
              <option value="Kore">Kore (Firm)</option>
              <option value="Fenrir">Fenrir (Excitable)</option>
              <option value="Leda">Leda (Youthful)</option>
              <option value="Sulafat">Sulafat (Warm)</option>
              <option value="Schedar">Schedar (Even)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
              Vocal Style Prompt
            </label>
            <input
              type="text"
              value={vocalPrompt}
              onChange={(e) => setVocalPrompt(e.target.value)}
              placeholder="Say critically like a risk analyst..."
              className="w-full bg-[#121417] border border-[#2A2D31] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-mono"
            />
          </div>

          <button
            type="button"
            onClick={onConsultAiAdvisor}
            className="w-full bg-[#43B581] hover:bg-[#3ca374] text-white font-bold text-xs py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>Test Voice Co-Pilot</span>
          </button>
        </div>
      </div>
    </div>
  );
}
