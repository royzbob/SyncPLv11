import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PNG } from 'pngjs';

const iconPngPath = path.join('src-tauri', 'icons', 'icon.png');

try {
  console.log('----------------------------------------------------');
  console.log('🔄 SyncPL Tauri App Icon Generator & Fixer Utility');
  console.log('----------------------------------------------------');

  const WIDTH = 512;
  const HEIGHT = 512;

  console.log('🛠️ Drawing beautiful, uncorrupted high-resolution app logo (512x512)...');
  const png = new PNG({ width: WIDTH, height: HEIGHT });

  // Center of the canvas
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  // Ascending chart points for the trading theme
  const chartPoints = [
    { x: 130, y: 350 },
    { x: 210, y: 280 },
    { x: 270, y: 310 },
    { x: 330, y: 210 },
    { x: 390, y: 140 }
  ];

  // Helper for distance to line segment
  function distToSegment(x, y, x0, y0, x1, y1) {
    const l2 = (x0 - x1) ** 2 + (y0 - y1) ** 2;
    if (l2 === 0) return Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
    let t = ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((x - (x0 + t * (x1 - x0))) ** 2 + (y - (y0 + t * (y1 - y0))) ** 2);
  }

  // Draw the design pixel-by-pixel
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
        // 1. Dark professional background
        r = 15;
        g = 17;
        b = 19;
        a = 255;

        // 2. Subtle grid lines
        if (x % 40 === 0 || y % 40 === 0) {
          r = 25;
          g = 29;
          b = 35;
        }

        // 3. Draw translucent trading candlesticks in background
        // Candlestick 1: Green
        if (x >= 170 && x <= 186) {
          if (y >= 250 && y <= 290) {
            r = 34; g = 197; b = 94; a = 60;
          } else if (y >= 230 && y <= 310 && x >= 177 && x <= 179) {
            r = 34; g = 197; b = 94; a = 60;
          }
        }
        // Candlestick 2: Red
        if (x >= 245 && x <= 261) {
          if (y >= 260 && y <= 300) {
            r = 239; g = 68; b = 68; a = 40;
          } else if (y >= 240 && y <= 320 && x >= 252 && x <= 254) {
            r = 239; g = 68; b = 68; a = 40;
          }
        }
        // Candlestick 3: Green (breakout)
        if (x >= 315 && x <= 331) {
          if (y >= 190 && y <= 240) {
            r = 34; g = 197; b = 94; a = 80;
          } else if (y >= 170 && y <= 260 && x >= 322 && x <= 324) {
            r = 34; g = 197; b = 94; a = 80;
          }
        }

        // 4. Draw glowing line chart
        for (let i = 0; i < chartPoints.length - 1; i++) {
          const p1 = chartPoints[i];
          const p2 = chartPoints[i + 1];
          const dLine = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);

          if (dLine < 4) {
            const ratio = i / (chartPoints.length - 2);
            r = Math.round(34 * (1 - ratio) + 6 || 34);
            g = Math.round(197 * (1 - ratio) + 229 * ratio);
            b = Math.round(94 * (1 - ratio) + 229 * ratio);
            a = 255;
          } else if (dLine < 12) {
            const glowAlpha = Math.round((1 - (dLine - 4) / 8) * 150);
            if (glowAlpha > (a === 255 ? 0 : a)) {
              r = 34;
              g = 210;
              b = 150;
              a = glowAlpha;
            }
          }
        }

        // 5. Draw data points (white circles with green borders)
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

        // 6. Circular outer ring (Green to Purple gradient)
        if (dist >= 243 && dist <= 248) {
          const angle = Math.atan2(dy, dx);
          const t = (angle + Math.PI) / (2 * Math.PI);
          
          r = Math.round(34 * (1 - t) + 139 * t);
          g = Math.round(197 * (1 - t) + 92 * t);
          b = Math.round(94 * (1 - t) + 246 * t);
          a = 255;
        }

        // Anti-aliasing
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

  // Ensure directories exist
  const dir = path.dirname(iconPngPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write PNG file synchronously using PNG.sync.write
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(iconPngPath, buffer);
  console.log(`✅ Valid, uncorrupted source PNG written synchronously to: ${iconPngPath}`);

  // Also write copies to default paths at root
  fs.writeFileSync('app_icon.png', buffer);
  fs.writeFileSync('app-icon.png', buffer);
  console.log('✅ Valid, uncorrupted app_icon.png and app-icon.png written to project root.');

  // Run Tauri CLI to compile the icon assets perfectly!
  console.log('🚀 Running "npx tauri icon" to compile standard ICO and ICNS files...');
  try {
    // Explicitly use shell: true so that it resolves 'npx' on Windows
    execSync('npx tauri icon src-tauri/icons/icon.png', { stdio: 'inherit', shell: true });
    console.log('\n✨ SUCCESS! All Tauri icon files compiled flawlessly.');
    console.log('👉 You can now run "npm run tauri build" or "npm run tauri dev" on Windows safely.');
  } catch (cliErr) {
    console.warn('⚠️ Warning: Could not run "npx tauri icon" automatically. Running manual fallback...');
    console.error(cliErr.message);
  }
  console.log('----------------------------------------------------');

} catch (error) {
  console.error('❌ Error generating valid app icons:', error);
  process.exit(1);
}
