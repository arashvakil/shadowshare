/**
 * Generate setup instruction PNG images from SVG templates.
 * Run: npx tsx scripts/generate-images.ts
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const OUT_DIR = resolve(import.meta.dirname, "..", "webapp", "public", "images");
mkdirSync(OUT_DIR, { recursive: true });

const W = 800;
const H = 400;

// Colors
const BG = "#1a1a2e";
const CARD_BG = "#16213e";
const ACCENT = "#0f3460";
const GREEN = "#4ecca3";
const WHITE = "#e8e8e8";
const MUTED = "#8892b0";
const ORANGE = "#f77f00";

// Shared SVG wrapper
function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#0f0f23"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="16"/>
  ${inner}
</svg>`;
}

// Step number badge
function badge(x: number, y: number, num: number): string {
  return `<circle cx="${x}" cy="${y}" r="22" fill="${GREEN}"/>
  <text x="${x}" y="${y + 7}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="${BG}">${num}</text>`;
}

// Rounded rect
function roundRect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  rx = 12,
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
}

// Phone mockup
function phone(x: number, y: number, w: number, h: number): string {
  return `
    ${roundRect(x, y, w, h, "#2a2a4a", 16)}
    ${roundRect(x + 4, y + 4, w - 8, h - 8, "#0d1117", 12)}
    <rect x="${x + w / 2 - 20}" y="${y + h - 16}" width="40" height="4" rx="2" fill="#3a3a5a"/>
  `;
}

// --- Step 1: Download Outline ---

function stepDownloadEn(): string {
  return wrap(`
    ${badge(60, 50, 1)}
    <text x="95" y="57" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">Download the Outline App</text>
    <text x="60" y="90" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">Install the free Outline VPN app on your device</text>

    <!-- Phone mockup with Outline icon -->
    ${phone(60, 120, 140, 230)}
    <circle cx="130" cy="220" r="35" fill="${GREEN}" opacity="0.15"/>
    <circle cx="130" cy="220" r="25" fill="${GREEN}" opacity="0.3"/>
    <text x="130" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="${GREEN}">⬇</text>
    <text x="130" y="325" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="${MUTED}">Outline VPN</text>

    <!-- Arrow -->
    <line x1="220" y1="230" x2="280" y2="230" stroke="${GREEN}" stroke-width="3" stroke-dasharray="8,4"/>
    <polygon points="280,222 298,230 280,238" fill="${GREEN}"/>

    <!-- Platform cards -->
    ${roundRect(310, 120, 220, 50, ACCENT)}
    <text x="340" y="150" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">📱 Android</text>
    <text x="490" y="150" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">Play Store →</text>

    ${roundRect(310, 185, 220, 50, ACCENT)}
    <text x="340" y="215" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">🍎 iPhone</text>
    <text x="490" y="215" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">App Store →</text>

    ${roundRect(310, 250, 220, 50, ACCENT)}
    <text x="340" y="280" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">💻 Windows</text>
    <text x="490" y="280" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">Download →</text>

    ${roundRect(310, 315, 220, 50, ACCENT)}
    <text x="340" y="345" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">💻 Mac</text>
    <text x="490" y="345" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">App Store →</text>

    <!-- Tap hint -->
    ${roundRect(570, 180, 190, 60, "${GREEN}20", 30)}
    <text x="665" y="202" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">Tap a button below</text>
    <text x="665" y="225" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">to download ↓</text>
  `);
}

function stepDownloadFa(): string {
  return wrap(`
    ${badge(740, 50, 1)}
    <text x="720" y="57" text-anchor="end" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">اپ Outline رو دانلود کن</text>
    <text x="740" y="90" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">اپ رایگان Outline VPN رو روی دستگاهت نصب کن</text>

    <!-- Phone mockup with Outline icon -->
    ${phone(600, 120, 140, 230)}
    <circle cx="670" cy="220" r="35" fill="${GREEN}" opacity="0.15"/>
    <circle cx="670" cy="220" r="25" fill="${GREEN}" opacity="0.3"/>
    <text x="670" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="${GREEN}">⬇</text>
    <text x="670" y="325" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="${MUTED}">Outline VPN</text>

    <!-- Arrow -->
    <line x1="580" y1="230" x2="520" y2="230" stroke="${GREEN}" stroke-width="3" stroke-dasharray="8,4"/>
    <polygon points="520,222 502,230 520,238" fill="${GREEN}"/>

    <!-- Platform cards (RTL) -->
    ${roundRect(270, 120, 220, 50, ACCENT)}
    <text x="470" y="150" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">اندروید 📱</text>
    <text x="290" y="150" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">← Play Store</text>

    ${roundRect(270, 185, 220, 50, ACCENT)}
    <text x="470" y="215" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">آیفون 🍎</text>
    <text x="290" y="215" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">← App Store</text>

    ${roundRect(270, 250, 220, 50, ACCENT)}
    <text x="470" y="280" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">ویندوز 💻</text>
    <text x="290" y="280" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">← دانلود</text>

    ${roundRect(270, 315, 220, 50, ACCENT)}
    <text x="470" y="345" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="${WHITE}">مک 💻</text>
    <text x="290" y="345" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">← App Store</text>

    <!-- Tap hint -->
    ${roundRect(40, 180, 190, 60, "${GREEN}20", 30)}
    <text x="135" y="202" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">دکمه‌های پایین رو بزن</text>
    <text x="135" y="225" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">↓ برای دانلود</text>
  `);
}

// --- Step 2: Copy Key ---

function stepCopykeyEn(): string {
  return wrap(`
    ${badge(60, 50, 2)}
    <text x="95" y="57" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">Copy Your VPN Key</text>
    <text x="60" y="90" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">Tap the copy button to save your key to clipboard</text>

    <!-- Key visual -->
    ${roundRect(60, 130, 380, 80, ACCENT)}
    <text x="80" y="160" font-family="monospace" font-size="13" fill="${GREEN}">ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMw</text>
    <text x="80" y="185" font-family="monospace" font-size="13" fill="${GREEN}">NTpAMTU4LjEwMS4xMTIuMjAxOjkyNDc=</text>

    <!-- Copy button -->
    ${roundRect(480, 145, 140, 45, GREEN, 22)}
    <text x="550" y="174" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">📋 Copy Key</text>

    <!-- Arrow to Outline app -->
    <line x1="400" y1="260" x2="400" y2="300" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="8,4"/>
    <polygon points="392,300 400,318 408,300" fill="${ORANGE}"/>

    <!-- Outline app mockup -->
    ${phone(310, 240, 180, 150)}
    <text x="400" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">Outline VPN</text>

    <!-- Plus button in app -->
    <circle cx="470" cy="275" r="14" fill="${GREEN}"/>
    <text x="470" y="282" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="${BG}">+</text>

    <!-- Annotation -->
    <line x1="490" y1="275" x2="560" y2="275" stroke="${ORANGE}" stroke-width="2"/>
    ${roundRect(565, 260, 175, 30, "${ORANGE}30", 8)}
    <text x="652" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${ORANGE}">Tap + to add your key</text>

    <!-- Paste hint -->
    ${roundRect(60, 330, 230, 55, "${GREEN}15", 12)}
    <text x="80" y="355" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">✨ The key will auto-paste</text>
    <text x="80" y="375" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">when you tap the + button</text>
  `);
}

function stepCopykeyFa(): string {
  return wrap(`
    ${badge(740, 50, 2)}
    <text x="720" y="57" text-anchor="end" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">کلید VPN رو کپی کن</text>
    <text x="740" y="90" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">دکمه کپی رو بزن تا کلیدت ذخیره بشه</text>

    <!-- Key visual -->
    ${roundRect(360, 130, 380, 80, ACCENT)}
    <text x="720" y="160" text-anchor="end" font-family="monospace" font-size="13" fill="${GREEN}">ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMw</text>
    <text x="720" y="185" text-anchor="end" font-family="monospace" font-size="13" fill="${GREEN}">NTpAMTU4LjEwMS4xMTIuMjAxOjkyNDc=</text>

    <!-- Copy button -->
    ${roundRect(180, 145, 150, 45, GREEN, 22)}
    <text x="255" y="174" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">📋 کپی کلید</text>

    <!-- Arrow to Outline app -->
    <line x1="400" y1="260" x2="400" y2="300" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="8,4"/>
    <polygon points="392,300 400,318 408,300" fill="${ORANGE}"/>

    <!-- Outline app mockup -->
    ${phone(310, 240, 180, 150)}
    <text x="400" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">Outline VPN</text>

    <!-- Plus button in app -->
    <circle cx="330" cy="275" r="14" fill="${GREEN}"/>
    <text x="330" y="282" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="${BG}">+</text>

    <!-- Annotation -->
    <line x1="310" y1="275" x2="240" y2="275" stroke="${ORANGE}" stroke-width="2"/>
    ${roundRect(60, 260, 175, 30, "${ORANGE}30", 8)}
    <text x="148" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${ORANGE}">+ رو بزن تا کلید اضافه بشه</text>

    <!-- Paste hint -->
    ${roundRect(510, 330, 230, 55, "${GREEN}15", 12)}
    <text x="720" y="355" text-anchor="end" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">✨ کلید اتوماتیک paste می‌شه</text>
    <text x="720" y="375" text-anchor="end" font-family="Arial,sans-serif" font-size="13" fill="${GREEN}">وقتی + رو بزنی</text>
  `);
}

// --- Step 3: Connect ---

function stepConnectEn(): string {
  return wrap(`
    ${badge(60, 50, 3)}
    <text x="95" y="57" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">Connect &amp; Go!</text>
    <text x="60" y="90" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">Follow these simple steps in the Outline app</text>

    <!-- Steps list -->
    ${roundRect(60, 120, 350, 60, ACCENT)}
    <circle cx="90" cy="150" r="16" fill="${GREEN}"/>
    <text x="90" y="156" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">1</text>
    <text x="120" y="146" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">Open the Outline app</text>
    <text x="120" y="166" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">Find it in your apps</text>

    ${roundRect(60, 195, 350, 60, ACCENT)}
    <circle cx="90" cy="225" r="16" fill="${GREEN}"/>
    <text x="90" y="231" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">2</text>
    <text x="120" y="221" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">Tap the + button (top right)</text>
    <text x="120" y="241" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">It will detect your copied key</text>

    ${roundRect(60, 270, 350, 60, ACCENT)}
    <circle cx="90" cy="300" r="16" fill="${GREEN}"/>
    <text x="90" y="306" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">3</text>
    <text x="120" y="296" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">Tap "Connect"</text>
    <text x="120" y="316" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">You're now protected!</text>

    <!-- Phone mockup showing connected state -->
    ${phone(500, 100, 220, 260)}
    <text x="610" y="145" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">Outline VPN</text>

    <!-- Connected indicator -->
    <circle cx="610" cy="220" r="45" fill="${GREEN}" opacity="0.15"/>
    <circle cx="610" cy="220" r="30" fill="${GREEN}" opacity="0.3"/>
    <text x="610" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="${GREEN}">✓</text>
    <text x="610" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="${GREEN}">Connected</text>
    <text x="610" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="${MUTED}">Your connection is secure</text>

    <!-- Success banner -->
    ${roundRect(60, 345, 680, 40, "${GREEN}20", 12)}
    <text x="400" y="370" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="${GREEN}">🎉 That's it! The VPN runs in the background automatically</text>
  `);
}

function stepConnectFa(): string {
  return wrap(`
    ${badge(740, 50, 3)}
    <text x="720" y="57" text-anchor="end" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="${WHITE}">وصل شو!</text>
    <text x="740" y="90" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${MUTED}">این مراحل ساده رو توی اپ Outline انجام بده</text>

    <!-- Steps list (RTL) -->
    ${roundRect(390, 120, 350, 60, ACCENT)}
    <circle cx="710" cy="150" r="16" fill="${GREEN}"/>
    <text x="710" y="156" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">1</text>
    <text x="690" y="146" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">اپ Outline رو باز کن</text>
    <text x="690" y="166" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">توی اپ‌هات پیداش کن</text>

    ${roundRect(390, 195, 350, 60, ACCENT)}
    <circle cx="710" cy="225" r="16" fill="${GREEN}"/>
    <text x="710" y="231" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">2</text>
    <text x="690" y="221" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">دکمه + رو بزن (بالا سمت راست)</text>
    <text x="690" y="241" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">کلید کپی شده رو تشخیص می‌ده</text>

    ${roundRect(390, 270, 350, 60, ACCENT)}
    <circle cx="710" cy="300" r="16" fill="${GREEN}"/>
    <text x="710" y="306" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${BG}">3</text>
    <text x="690" y="296" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="${WHITE}">«اتصال» رو بزن</text>
    <text x="690" y="316" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">الان محافظت شدی!</text>

    <!-- Phone mockup showing connected state -->
    ${phone(80, 100, 220, 260)}
    <text x="190" y="145" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="${MUTED}">Outline VPN</text>

    <!-- Connected indicator -->
    <circle cx="190" cy="220" r="45" fill="${GREEN}" opacity="0.15"/>
    <circle cx="190" cy="220" r="30" fill="${GREEN}" opacity="0.3"/>
    <text x="190" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="${GREEN}">✓</text>
    <text x="190" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="${GREEN}">وصل شد</text>
    <text x="190" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="${MUTED}">اتصال شما امن است</text>

    <!-- Success banner -->
    ${roundRect(60, 345, 680, 40, "${GREEN}20", 12)}
    <text x="400" y="370" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="${GREEN}">🎉 همین! VPN اتوماتیک در پس‌زمینه اجرا می‌شه</text>
  `);
}

// --- Render all images ---

const images: [string, () => string][] = [
  ["setup-download-en.png", stepDownloadEn],
  ["setup-download-fa.png", stepDownloadFa],
  ["setup-copykey-en.png", stepCopykeyEn],
  ["setup-copykey-fa.png", stepCopykeyFa],
  ["setup-connect-en.png", stepConnectEn],
  ["setup-connect-fa.png", stepConnectFa],
];

for (const [filename, generator] of images) {
  const svg = generator();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  const outPath = resolve(OUT_DIR, filename);
  writeFileSync(outPath, png);
  console.log(`✓ ${filename} (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log(`\nDone! ${images.length} images generated in ${OUT_DIR}`);
