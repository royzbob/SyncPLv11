import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const WIDTH = 512;
const HEIGHT = 512;

const png = new PNG({ width: WIDTH, height: HEIGHT });

// Helper for distance to line segment
function distToSegment(x, y, x0, y0, x1, y1) {
  const l2 = (x0 - x1) ** 2 + (y0 - y1) ** 2;
  if (l2 === 0) return Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
  let t = ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((x - (x0 + t * (x1 - x0))) ** 2 + (y - (y0 + t * (y1 - y0))) ** 2);
}

// Center of the canvas
const cx = WIDTH / 2;
const cy = HEIGHT / 2;

// Ascending chart points
const chartPoints = [
  { x: 130, y: 350 },
  { x: 210, y: 280 },
  { x: 270, y: 310 },
  { x: 330, y: 210 },
  { x: 390, y: 140 }
];

// Draw the beautiful design pixel by pixel
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const idx = (WIDTH * y + x) << 2;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Default to fully transparent
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    if (dist <= 250) {
      // 1. Dark background base
      r = 15;
      g = 17;
      b = 19;
      a = 255;

      // 2. Add subtle grid lines
      if (x % 40 === 0 || y % 40 === 0) {
        r = 25;
        g = 29;
        b = 35;
      }

      // 3. Draw trading candlesticks (low-opacity background elements)
      // Candlestick 1: Green
      if (x >= 170 && x <= 186) {
        if (y >= 250 && y <= 290) { // body
          r = 34; g = 197; b = 94; a = 60;
        } else if (y >= 230 && y <= 310 && x >= 177 && x <= 179) { // wick
          r = 34; g = 197; b = 94; a = 60;
        }
      }
      // Candlestick 2: Red
      if (x >= 245 && x <= 261) {
        if (y >= 260 && y <= 300) { // body
          r = 239; g = 68; b = 68; a = 40;
        } else if (y >= 240 && y <= 320 && x >= 252 && x <= 254) { // wick
          r = 239; g = 68; b = 68; a = 40;
        }
      }
      // Candlestick 3: Green (Major breakout)
      if (x >= 315 && x <= 331) {
        if (y >= 190 && y <= 240) { // body
          r = 34; g = 197; b = 94; a = 80;
        } else if (y >= 170 && y <= 260 && x >= 322 && x <= 324) { // wick
          r = 34; g = 197; b = 94; a = 80;
        }
      }

      // 4. Draw glowing line chart
      for (let i = 0; i < chartPoints.length - 1; i++) {
        const p1 = chartPoints[i];
        const p2 = chartPoints[i + 1];
        const dLine = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);

        if (dLine < 4) {
          // Sharp main line: vibrant neon green/cyan blend
          const ratio = i / (chartPoints.length - 2);
          r = Math.round(34 * (1 - ratio) + 6 || 34);
          g = Math.round(197 * (1 - ratio) + 229 * ratio);
          b = Math.round(94 * (1 - ratio) + 229 * ratio);
          a = 255;
        } else if (dLine < 12) {
          // Glow effect around the line
          const glowAlpha = Math.round((1 - (dLine - 4) / 8) * 150);
          if (glowAlpha > (a === 255 ? 0 : a)) {
            r = 34;
            g = 210;
            b = 150;
            a = glowAlpha;
          }
        }
      }

      // 5. Draw data points on the line chart (circles)
      for (const pt of chartPoints) {
        const dPt = Math.sqrt((x - pt.x) ** 2 + (y - pt.y) ** 2);
        if (dPt <= 6) {
          r = 255;
          g = 255;
          b = 255;
          a = 255;
        } else if (dPt <= 9) {
          r = 34;
          g = 197;
          b = 94;
          a = 200;
        }
      }

      // 6. Glowing circular border gradient
      if (dist >= 243 && dist <= 248) {
        const angle = Math.atan2(dy, dx);
        const t = (angle + Math.PI) / (2 * Math.PI); // 0 to 1
        
        // Green (#22C55E) to Violet (#8B5CF6) gradient
        const borderR = Math.round(34 * (1 - t) + 139 * t);
        const borderG = Math.round(197 * (1 - t) + 92 * t);
        const borderB = Math.round(94 * (1 - t) + 246 * t);
        
        r = borderR;
        g = borderG;
        b = borderB;
        a = 255;
      }

      // Anti-aliasing on outer boundary of circle
      if (dist > 248) {
        const fade = (250 - dist) / 2;
        a = Math.max(0, Math.min(a, Math.round(fade * 255)));
      }
    }

    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  }
}

// Write PNG to target paths
const targets = [
  path.join('src-tauri', 'icons', 'icon.png'),
  'app_icon.png'
];

targets.forEach(target => {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  png.pack()
    .pipe(fs.createWriteStream(target))
    .on('finish', () => {
      console.log(`✅ Beautiful uncorrupted PNG generated at: ${target}`);
    });
});
