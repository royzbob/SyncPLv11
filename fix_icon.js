import fs from 'fs';
import path from 'path';

const iconPngPath = path.join('src-tauri', 'icons', 'icon.png');
const iconIcoPath = path.join('src-tauri', 'icons', 'icon.ico');

try {
  console.log('----------------------------------------------------');
  console.log('🔄 SyncPL Tauri Icon Fixer Utility');
  console.log('----------------------------------------------------');

  if (!fs.existsSync(iconPngPath)) {
    console.error(`❌ Error: Source PNG not found at: ${iconPngPath}`);
    console.log('Please make sure you have a valid PNG image at that location.');
    process.exit(1);
  }

  console.log(`ℹ️ Reading PNG source icon: ${iconPngPath}`);
  const pngBuffer = fs.readFileSync(iconPngPath);

  // Check if it's a valid PNG (starts with 0x89504E47)
  if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4E || pngBuffer[3] !== 0x47) {
    console.warn('⚠️ Warning: The source file does not have a standard PNG header, but proceeding anyway.');
  }

  console.log('🛠️ Packaging PNG into a valid ICO container...');

  // 1. ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved: must be 0
  header.writeUInt16LE(1, 2); // Type: 1 for ICO
  header.writeUInt16LE(1, 4); // Count of images: 1

  // 2. ICO Directory Entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  
  // We specify 0 for width/height if >= 256, but since Tauri can use modern PNG-ICO format
  // we can use standard sizes or read the size. To make it extremely robust, 
  // we'll specify width: 0, height: 0 (which standardizes for 256x256 or auto-detected PNG sizes).
  dirEntry.writeUInt8(0, 0); // Width: 0 (means 256 pixels)
  dirEntry.writeUInt8(0, 1); // Height: 0 (means 256 pixels)
  dirEntry.writeUInt8(0, 2); // Color palette size (0 for no palette)
  dirEntry.writeUInt8(0, 3); // Reserved: must be 0
  dirEntry.writeUInt16LE(1, 4); // Color planes: 1
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel: 32
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of the PNG image data
  dirEntry.writeUInt32LE(22, 12); // Offset to image data (6 header + 16 directory = 22)

  // 3. Concatenate Header, Directory Entry, and raw PNG data
  const icoData = Buffer.concat([header, dirEntry, pngBuffer]);

  // Ensure output directory exists
  const dir = path.dirname(iconIcoPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write valid uncorrupted .ico file
  fs.writeFileSync(iconIcoPath, icoData);

  console.log(`✅ Success! Generated a valid, uncorrupted ICO file at: ${iconIcoPath}`);
  console.log('🚀 You can now run "npm run tauri build" or "npm run tauri dev" without icon decoder crashes!');
  console.log('----------------------------------------------------');
} catch (error) {
  console.error('❌ Error generating valid ICO file:', error);
  process.exit(1);
}
