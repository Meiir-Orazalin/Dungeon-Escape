export function parseHexColor(value: string): Readonly<{ r: number; g: number; b: number }> {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Invalid six-digit hex color: ${value}`);
  return Object.freeze({
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  });
}

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  const fgLuminance =
    0.2126 * linearChannel(fg.r) + 0.7152 * linearChannel(fg.g) + 0.0722 * linearChannel(fg.b);
  const bgLuminance =
    0.2126 * linearChannel(bg.r) + 0.7152 * linearChannel(bg.g) + 0.0722 * linearChannel(bg.b);
  return (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
}

export const RELEASE_CONTRAST_PAIRS = Object.freeze([
  { id: "hud", foreground: "#eef0e7", background: "#12191b", minimum: 4.5 },
  { id: "hud-high-contrast", foreground: "#ffffff", background: "#080b0d", minimum: 4.5 },
  { id: "interaction", foreground: "#ffe0a1", background: "#111719", minimum: 4.5 },
  { id: "menu", foreground: "#eef0e7", background: "#080b0d", minimum: 4.5 },
  { id: "settings", foreground: "#e9ebe5", background: "#111719", minimum: 4.5 },
  { id: "pause", foreground: "#eef0e7", background: "#101719", minimum: 4.5 },
  { id: "manual", foreground: "#e9ebe5", background: "#111719", minimum: 4.5 },
  { id: "upgrade", foreground: "#f3d7a1", background: "#151d1f", minimum: 4.5 },
  { id: "floor-cleared", foreground: "#f3d7a1", background: "#11191b", minimum: 4.5 },
  { id: "victory", foreground: "#eef0e7", background: "#10191b", minimum: 4.5 },
  { id: "defeat", foreground: "#f1d9d4", background: "#211416", minimum: 4.5 },
  { id: "health-bar", foreground: "#d96652", background: "#221619", minimum: 3 },
  { id: "low-health", foreground: "#ffd0c8", background: "#381417", minimum: 4.5 },
  { id: "portrait", foreground: "#aab6b5", background: "#080b0f", minimum: 4.5 },
]);
