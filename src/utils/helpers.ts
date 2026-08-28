export function generateRandomRoomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PL-";
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

export function formatCurrency(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function escapeHTML(str: string): string {
  if (!str) return "";
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[tag] || tag)
  );
}

// Convert audio base64 payload to array buffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Simple helper to create WAV file from linear PCM 16-bit
export function pcmToWav(pcm16: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcm16.length * 2);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm16.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, pcm16.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm16.length; i++, offset += 2) {
    view.setInt16(offset, pcm16[i], true);
  }
  return new Blob([view], { type: "audio/wav" });
}

// Predefined trading tickers
export interface TickerInfo {
  symbol: string;
  price: number;
  change: number;
}

export const initialTickers: TickerInfo[] = [
  { symbol: "BTC/USD", price: 92840.5, change: 1.45 },
  { symbol: "ETH/USD", price: 3420.25, change: -0.85 },
  { symbol: "NQ", price: 19850.75, change: 0.85 },
  { symbol: "SNP500", price: 5430.5, change: 0.42 },
  { symbol: "SPY", price: 542.1, change: 0.22 },
  { symbol: "QQQ", price: 472.95, change: 0.61 },
  { symbol: "EUR/USD", price: 1.0825, change: -0.12 },
  { symbol: "GOLD", price: 2384.8, change: 1.15 },
];

export const DEFAULT_STRATEGIES: string[] = [
  "Breakout",
  "Mean Reversion",
  "Supply & Demand (OB/FVG)",
  "Scalp / Momentum",
  "Liquidity Sweep / ICT",
  "Smart Money Concepts (SMC)",
  "Fair Value Gap (FVG) / Imbalance",
  "Market Structure Shift (MSS/CHoCH)",
  "London / NY Session Killzone",
  "Opening Range Breakout (ORB)",
  "15m Opening Range (15m ORB)",
  "VWAP Reversal / Bounce",
  "VWAP Standard Deviation Bands",
  "Volume Profile / VPOC",
  "Trend Following / Pullback",
  "Key Level Break & Retest",
  "Support & Resistance Flip",
  "AMD (Accumulation / Manipulation / Distribution)",
  "Judas Swing / Fakeout",
  "SMT Divergence (NQ vs ES / DXY)",
  "RSI / MACD Divergence",
  "Fibonacci Golden Zone (0.618/0.786)",
  "Silver Bullet (ICT)",
  "Turtle Soup / False Breakout",
  "Range Bound / Box Fade",
  "Pre-Market High/Low Sweep",
  "9/21 EMA Scalp / Cross",
  "200 EMA Dynamic Trend Bounce",
  "Gap Fill & Reversal",
  "Gap & Go / Continuation",
  "News / Macro Catalyst",
  "Earnings Momentum",
  "Relative Strength / Weakness (RS/RW)",
  "Chart Pattern (Flags/Wedges/H&S)",
  "Dip Buy / Oversold Bounce",
  "Trend Continuation",
  "Wyckoff Accumulation / Distribution",
  "Discretionary / Price Action",
];

/**
 * Safely send a browser desktop notification without throwing 'Illegal constructor'
 * in environments like mobile Chrome, WebView, or sandboxed iframes.
 */
export function safeSendNotification(title: string, options?: NotificationOptions): boolean {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission !== "granted") {
      return false;
    }
    // In restricted iframes or Android Chrome, new Notification throws TypeError: Illegal constructor
    if (typeof Notification === "function") {
      try {
        const notif = new Notification(title, options);
        return !!notif;
      } catch (innerErr) {
        // Fallback to ServiceWorker registration notification if available
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then((reg) => reg.showNotification(title, options))
            .catch(() => {});
          return true;
        }
        return false;
      }
    }
    return false;
  } catch (err) {
    console.debug("Desktop notification skipped or unsupported:", err);
    return false;
  }
}
