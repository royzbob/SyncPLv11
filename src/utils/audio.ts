// Synthetic sound effects using Web Audio API for high-fidelity offline system notifications

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.debug("AudioContext init error:", e);
    return null;
  }
}

/**
 * Plays a pleasant, rising chime sound representing a connection / join action.
 */
export function playJoinSound(volumeLevel: number = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create nodes
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "triangle";

  // Setup gain envelope to prevent clicking
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.12 * volumeLevel, now + 0.05);
  gainNode.gain.setValueAtTime(0.12 * volumeLevel, now + 0.22);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  // Frequencies corresponding to C5 -> E5 -> G5
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
  osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5

  // Slightly offset second oscillator for warmth
  osc2.frequency.setValueAtTime(525.25, now);
  osc2.frequency.setValueAtTime(661.25, now + 0.08);
  osc2.frequency.setValueAtTime(785.99, now + 0.16);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);

  osc1.stop(now + 0.5);
  osc2.stop(now + 0.5);
}

/**
 * Plays a descending chime sound representing a disconnection / leave action.
 */
export function playLeaveSound(volumeLevel: number = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create nodes
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sine";

  // Setup gain envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15 * volumeLevel, now + 0.03);
  gainNode.gain.setValueAtTime(0.15 * volumeLevel, now + 0.18);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  // G5 -> E5 -> C5
  osc.frequency.setValueAtTime(783.99, now); // G5
  osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
  osc.frequency.setValueAtTime(523.25, now + 0.12); // C5

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}

export type ChatNotificationSound = "chime" | "pop" | "ping" | "tap" | "off";

/**
 * Plays an instant, crisp notification sound when a new chat message arrives.
 */
export function playChatMessageSound(
  volumeLevel: number = 0.7,
  soundType: ChatNotificationSound = "chime"
) {
  if (soundType === "off" || volumeLevel <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    const effectiveVol = Math.max(0, Math.min(1, volumeLevel));

    if (soundType === "pop") {
      // Modern messaging bubble pop
      const osc = ctx.createOscillator();
      osc.type = "sine";

      // Pitch sweep downward quickly
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18 * effectiveVol, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } else if (soundType === "ping") {
      // High crisp crystal ping
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(1318.51, now); // E6
      osc2.frequency.setValueAtTime(2637.02, now); // E7 harmonic

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.14 * effectiveVol, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.32);
      osc2.stop(now + 0.32);
    } else if (soundType === "tap") {
      // Subtle wooden marimba tap
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15 * effectiveVol, now + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } else {
      // Default: "chime" - Elegant warm two-tone harmonic chord (A5 -> C#6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";

      // 1st note (A5 880Hz), 2nd note (C#6 1108Hz)
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1108.73, now + 0.06);

      osc2.frequency.setValueAtTime(884, now);
      osc2.frequency.setValueAtTime(1113.73, now + 0.06);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.14 * effectiveVol, now + 0.02);
      gainNode.gain.setValueAtTime(0.14 * effectiveVol, now + 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    }
  } catch (err) {
    console.warn("Could not play chat notification sound:", err);
  }
}

