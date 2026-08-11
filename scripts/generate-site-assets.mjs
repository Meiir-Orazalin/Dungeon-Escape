import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(repositoryRoot, "public");

const palette = {
  background: "#080b0f",
  panel: "#11191c",
  stone: "#374246",
  mutedStone: "#202a2d",
  amber: "#d3a45f",
  brightAmber: "#f2cc83",
  text: "#edf0e8",
  muted: "#91a0a1",
};

function iconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="92" fill="${palette.background}"/>
  <rect x="28" y="28" width="456" height="456" rx="72" fill="none" stroke="${palette.stone}" stroke-width="8"/>
  <path d="M134 402V221c0-77 53-131 122-131s122 54 122 131v181" fill="${palette.panel}" stroke="${palette.amber}" stroke-width="18"/>
  <path d="M173 402V226c0-50 34-88 83-88s83 38 83 88v176" fill="${palette.background}" stroke="${palette.mutedStone}" stroke-width="12"/>
  <path d="M256 66v54M171 101l35 45M341 101l-35 45" stroke="${palette.brightAmber}" stroke-width="10" stroke-linecap="round"/>
  <circle cx="256" cy="239" r="80" fill="none" stroke="${palette.amber}" stroke-width="5" stroke-dasharray="10 14"/>
  <text x="256" y="294" text-anchor="middle" fill="${palette.text}" font-family="Georgia, serif" font-size="118" font-weight="700" letter-spacing="-10">DE</text>
  <path d="M102 412h308M128 444h256" stroke="${palette.stone}" stroke-width="12" stroke-linecap="round"/>
</svg>`;
}

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${palette.background}"/>
  <path d="M15 53V28c0-11 7-19 17-19s17 8 17 19v25" fill="${palette.panel}" stroke="${palette.amber}" stroke-width="3"/>
  <circle cx="32" cy="31" r="13" fill="none" stroke="${palette.brightAmber}" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="32" y="38" text-anchor="middle" fill="${palette.text}" font-family="Georgia, serif" font-size="17" font-weight="700">DE</text>
  <path d="M10 54h44" stroke="${palette.stone}" stroke-width="3" stroke-linecap="round"/>
</svg>\n`;

const socialPreviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="halo" cx="50%" cy="42%" r="62%">
      <stop offset="0" stop-color="#624a2d" stop-opacity=".48"/>
      <stop offset=".48" stop-color="#192326" stop-opacity=".22"/>
      <stop offset="1" stop-color="${palette.background}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="tiles" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M0 0h72v72H0z" fill="none" stroke="#7e8b8c" stroke-opacity=".07"/>
      <path d="M9 53l17-8 15 9 20-11" fill="none" stroke="#aab1ad" stroke-opacity=".06" stroke-width="2"/>
    </pattern>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1200" height="630" fill="${palette.background}"/>
  <rect width="1200" height="630" fill="url(#tiles)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <path d="M62 64h1076v502H62z" fill="none" stroke="#9dacaa" stroke-opacity=".22" stroke-width="2"/>
  <path d="M78 80h1044v470H78z" fill="none" stroke="${palette.amber}" stroke-opacity=".18"/>
  <g transform="translate(600 76)">
    <path d="M-105 210V94C-105 28-59-16 0-16S105 28 105 94v116" fill="#10171a" stroke="${palette.amber}" stroke-width="8"/>
    <path d="M-72 210V99C-72 54-42 22 0 22s72 32 72 77v111" fill="${palette.background}" stroke="#313d40" stroke-width="6"/>
    <circle r="70" cy="111" fill="none" stroke="${palette.brightAmber}" stroke-opacity=".82" stroke-width="3" stroke-dasharray="8 11" filter="url(#glow)"/>
    <path d="M0-38v38M-73-11l25 30M73-11L48 19" stroke="${palette.brightAmber}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-154 215h308M-125 240h250" stroke="#394548" stroke-width="10" stroke-linecap="round"/>
  </g>
  <g fill="none" stroke="${palette.amber}" stroke-width="4" stroke-linecap="round" opacity=".78">
    <path d="M182 178c0-29 24-53 53-53s53 24 53 53-24 53-53 53-53-24-53-53z"/>
    <path d="M235 144v68M217 162l18-18 18 18M216 194l19 18 19-18"/>
    <path d="M1018 180h-82m24-24 24 24-24 24M936 180v66"/>
  </g>
  <text x="600" y="374" text-anchor="middle" fill="${palette.text}" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" letter-spacing="5">DUNGEON ESCAPE</text>
  <text x="600" y="427" text-anchor="middle" fill="${palette.amber}" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="7">DETERMINISTIC DARK-FANTASY ACTION</text>
  <text x="600" y="474" text-anchor="middle" fill="${palette.muted}" font-family="Georgia, 'Times New Roman', serif" font-size="22">Fight the dead. Recover the Runic Key. Open the Ancient Gate.</text>
  <text x="600" y="530" text-anchor="middle" fill="#697679" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="4">MEIIRORAZALIN.COM</text>
</svg>`;

async function renderSvg(page, svg, width, height, outputPath) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${palette.background}}svg{display:block}</style></head><body>${svg}</body></html>`,
  );
  await page.screenshot({ path: outputPath, type: "png", animations: "disabled" });
}

await mkdir(publicDirectory, { recursive: true });
await writeFile(path.join(publicDirectory, "favicon.svg"), faviconSvg, "utf8");

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await renderSvg(page, iconSvg(192), 192, 192, path.join(publicDirectory, "icon-192.png"));
  await renderSvg(page, iconSvg(512), 512, 512, path.join(publicDirectory, "icon-512.png"));
  await renderSvg(
    page,
    socialPreviewSvg,
    1200,
    630,
    path.join(publicDirectory, "social-preview.png"),
  );
  await page.close();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to generate site images with project-local Chromium. Run pnpm test:e2e:install first. ${message}`,
    { cause: error },
  );
} finally {
  await browser?.close();
}

console.log("Generated favicon.svg, icon-192.png, icon-512.png, and social-preview.png.");
