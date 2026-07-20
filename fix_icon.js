import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PNG } from 'pngjs';

const iconPngPath = path.join('src-tauri', 'icons', 'icon.png');

// Helper to scale PNG using simple pixel scaling
function scalePng(srcPng, targetWidth, targetHeight) {
  const dstPng = new PNG({ width: targetWidth, height: targetHeight });
  const scaleX = srcPng.width / targetWidth;
  const scaleY = srcPng.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcPng.width * srcY + srcX) << 2;
      const dstIdx = (targetWidth * y + x) << 2;

      dstPng.data[dstIdx] = srcPng.data[srcIdx];
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return dstPng;
}

// Convert an array of PNG buffers to a single ICO file
function convertPngsToIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type (1 for ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  const entries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (const png of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(png.width === 256 ? 0 : png.width, 0);
    entry.writeUInt8(png.height === 256 ? 0 : png.height, 1);
    entry.writeUInt8(0, 2); // Palette: 0
    entry.writeUInt8(0, 3); // Reserved: 0
    entry.writeUInt16LE(1, 4); // Color planes: 1
    entry.writeUInt16LE(32, 6); // Bits per pixel: 32
    entry.writeUInt32LE(png.buffer.length, 8); // Size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset in file

    entries.push(entry);
    currentOffset += png.buffer.length;
  }

  const buffers = [header, ...entries, ...pngBuffers.map(p => p.buffer)];
  return Buffer.concat(buffers);
}

// Generate an Apple ICNS file containing multiple PNG resolutions
function generateIcns(png512, png256, png128) {
  const blocks = [];

  function addBlock(id, buffer) {
    const blockHeader = Buffer.alloc(8);
    blockHeader.write(id, 0, 4, 'ascii');
    blockHeader.writeUInt32BE(buffer.length + 8, 4);
    blocks.push(blockHeader, buffer);
  }

  addBlock('ic09', png512);
  addBlock('ic08', png256);
  addBlock('ic07', png128);

  const rawBlocks = Buffer.concat(blocks);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 4, 'ascii');
  fileHeader.writeUInt32BE(rawBlocks.length + 8, 4);

  return Buffer.concat([fileHeader, rawBlocks]);
}

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

  // Draw scaled versions
  console.log('📐 Creating multiple resolutions and generating standard icon formats...');
  const png512 = png;
  const png256 = scalePng(png512, 256, 256);
  const png128 = scalePng(png512, 128, 128);
  const png64 = scalePng(png512, 64, 64);
  const png32 = scalePng(png512, 32, 32);

  const buf512 = PNG.sync.write(png512);
  const buf256 = PNG.sync.write(png256);
  const buf128 = PNG.sync.write(png128);
  const buf64 = PNG.sync.write(png64);
  const buf32 = PNG.sync.write(png32);

  // Write all standard files to src-tauri/icons/
  fs.writeFileSync(path.join('src-tauri', 'icons', 'icon.png'), buf512);
  fs.writeFileSync(path.join('src-tauri', 'icons', '128x128@2x.png'), buf256);
  fs.writeFileSync(path.join('src-tauri', 'icons', '128x128.png'), buf128);
  fs.writeFileSync(path.join('src-tauri', 'icons', '64x64.png'), buf64);
  fs.writeFileSync(path.join('src-tauri', 'icons', '32x32.png'), buf32);

  // Write copies to root
  fs.writeFileSync('app_icon.png', buf512);
  fs.writeFileSync('app-icon.png', buf512);

  // Write ICO and ICNS files synchronously
  const icoBuffer = convertPngsToIco([
    { width: 256, height: 256, buffer: buf256 },
    { width: 128, height: 128, buffer: buf128 },
    { width: 64, height: 64, buffer: buf64 },
    { width: 32, height: 32, buffer: buf32 }
  ]);
  fs.writeFileSync(path.join('src-tauri', 'icons', 'icon.ico'), icoBuffer);
  console.log('✅ Generated high-quality icon.ico with multi-resolution support.');

  const icnsBuffer = generateIcns(buf512, buf256, buf128);
  fs.writeFileSync(path.join('src-tauri', 'icons', 'icon.icns'), icnsBuffer);
  console.log('✅ Generated high-quality icon.icns with multi-resolution support.');

  // Run Tauri CLI to compile any other extra assets if needed
  console.log('🚀 Running "npx tauri icon" as extra helper if available...');
  try {
    execSync('npx tauri icon src-tauri/icons/icon.png', { stdio: 'inherit', shell: true });
    console.log('\n✨ SUCCESS! Tauri icon assets optimized perfectly.');
  } catch (cliErr) {
    console.log('ℹ️ Information: "npx tauri icon" returned code or was skipped, but pure Node icon generation is fully completed!');
  }
  console.log('----------------------------------------------------');

} catch (error) {
  console.error('❌ Error generating valid app icons:', error);
  process.exit(1);
}
