import type { FloorNumber, FloorTheme } from "./types";

export const FLOOR_THEMES: readonly FloorTheme[] = Object.freeze([
  Object.freeze({
    id: "shifting-catacombs",
    name: "THE SHIFTING CATACOMBS",
    voidColor: 0x050709,
    floorColors: Object.freeze([0x161d20, 0x182023, 0x141b1e, 0x1a2224, 0x171e21]),
    floorLineColor: 0x283235,
    wallColors: Object.freeze([0x30383a, 0x343d3f, 0x2b3335]),
    wallLineColor: 0x4c5657,
    crackColor: 0x394244,
    accentColor: 0xe59a43,
    hudAccentColor: "#d1b47e",
    gateAccentColor: 0xe7bc62,
    forgeAccentColor: 0x78e1cc,
    overlayAccentColor: 0xc39a5c,
  }),
  Object.freeze({
    id: "ember-vaults",
    name: "THE EMBER VAULTS",
    voidColor: 0x080606,
    floorColors: Object.freeze([0x211a18, 0x261d1a, 0x1d1716, 0x29201c, 0x231b18]),
    floorLineColor: 0x3c2e29,
    wallColors: Object.freeze([0x453630, 0x4b3a32, 0x392e2b]),
    wallLineColor: 0x735548,
    crackColor: 0x6b4937,
    accentColor: 0xd4773f,
    hudAccentColor: "#d7a36d",
    gateAccentColor: 0xe28a51,
    forgeAccentColor: 0xe0ad65,
    overlayAccentColor: 0xb96f48,
  }),
  Object.freeze({
    id: "obsidian-sanctum",
    name: "THE OBSIDIAN SANCTUM",
    voidColor: 0x040407,
    floorColors: Object.freeze([0x15141d, 0x191722, 0x121119, 0x1c1926, 0x161520]),
    floorLineColor: 0x2d293c,
    wallColors: Object.freeze([0x302d3d, 0x373244, 0x292634]),
    wallLineColor: 0x5a526f,
    crackColor: 0x49415e,
    accentColor: 0x9a7bd1,
    hudAccentColor: "#b9a6de",
    gateAccentColor: 0xc1aae9,
    forgeAccentColor: 0x91d1c8,
    overlayAccentColor: 0x8069ad,
  }),
]);

export function getFloorTheme(floorNumber: FloorNumber): FloorTheme {
  const theme = FLOOR_THEMES[floorNumber - 1];
  if (!theme) throw new RangeError(`No floor theme exists for floor ${floorNumber}.`);
  return theme;
}
