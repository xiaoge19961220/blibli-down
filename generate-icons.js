import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Pink-Blue Diagonal Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7299" />
      <stop offset="100%" stop-color="#00A1D6" />
    </linearGradient>
    
    <!-- Border Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FB7299" />
      <stop offset="100%" stop-color="#00A1D6" />
    </linearGradient>
  </defs>

  <!-- 1. Background Squircle with diagonal gradient -->
  <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#bgGrad)" />

  <!-- 2. Sleek dark glass plate inside with a nice glowing border -->
  <rect x="44" y="44" width="424" height="424" rx="96" fill="#0F1115" />
  <rect x="44" y="44" width="424" height="424" rx="96" fill="none" stroke="url(#borderGrad)" stroke-width="8" opacity="0.85" />

  <!-- 3. TV Antennas -->
  <!-- Left antenna -->
  <path d="M 200 150 L 140 80" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />
  <circle cx="140" cy="80" r="14" fill="#FFFFFF" />
  
  <!-- Right antenna -->
  <path d="M 312 150 L 372 80" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />
  <circle cx="372" cy="80" r="14" fill="#FFFFFF" />

  <!-- 4. TV Body -->
  <rect x="110" y="145" width="292" height="215" rx="40" fill="#FFFFFF" />

  <!-- 5. TV Screen -->
  <rect x="130" y="165" width="252" height="175" rx="24" fill="#1C1F28" />

  <!-- 6. TV Face (Cute eyes and smile mouth) -->
  <!-- Eyes slightly tilted for cute expression -->
  <ellipse cx="205" cy="230" rx="13" ry="14" fill="#FFFFFF" transform="rotate(-5, 205, 230)" />
  <ellipse cx="307" cy="230" rx="13" ry="14" fill="#FFFFFF" transform="rotate(5, 307, 230)" />
  <!-- Smile Mouth -->
  <path d="M 236 265 Q 256 282 276 265" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />

  <!-- 7. Archiver Server Rack/HDD Tray at the bottom -->
  <rect x="110" y="375" width="292" height="52" rx="14" fill="#1C1F28" stroke="url(#borderGrad)" stroke-width="3" />
  
  <!-- Downward Archiving / Backup Arrow -->
  <path d="M 256 348 L 256 394 M 242 380 L 256 394 L 270 380" fill="none" stroke="#FB7299" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Storage Status Active Indicators (LEDs) -->
  <circle cx="142" cy="401" r="5" fill="#10B981" /> <!-- Green active LED -->
  <circle cx="162" cy="401" r="5" fill="#00A1D6" /> <!-- Blue link LED -->
  
  <!-- Server Ventilation / Disk slots on the right -->
  <line x1="295" y1="401" x2="365" y2="401" stroke="#374151" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 8" />
</svg>`;

const buildDir = path.join(process.cwd(), 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);
console.log('SVG icon generated at:', svgPath);

async function main() {
  try {
    const pngPath = path.join(buildDir, 'icon.png');
    const pngPath256 = path.join(buildDir, 'icon-256.png');

    console.log('Rendering SVG to 512x512 PNG using Sharp...');
    await sharp(Buffer.from(svgContent))
      .resize(512, 512)
      .png()
      .toFile(pngPath);

    console.log('Rendering SVG to 256x256 PNG using Sharp...');
    await sharp(Buffer.from(svgContent))
      .resize(256, 256)
      .png()
      .toFile(pngPath256);

    console.log('PNG files generated successfully with Sharp!');

    // Convert PNG to Windows ICO (multi-resolution)
    console.log('Generating Windows ICO via ImageMagick...');
    execSync(`convert "${pngPath}" -define icon:auto-resize=256,128,64,48,32,16 "${path.join(buildDir, 'icon.ico')}"`);
    console.log('Windows ICO generated successfully!');

    // Generate macOS ICNS
    console.log('Generating macOS ICNS via ImageMagick...');
    try {
      execSync(`convert "${pngPath}" "${path.join(buildDir, 'icon.icns')}"`);
      console.log('macOS ICNS generated successfully!');
    } catch (icnsErr) {
      console.warn('ImageMagick direct ICNS conversion failed:', icnsErr.message);
    }

  } catch (err) {
    console.error('Error generating icons:', err.message);
  }
}

main();
