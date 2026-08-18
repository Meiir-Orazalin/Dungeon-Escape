import type { AudioEffectId, FloorAmbienceId } from "./types";

export const AUDIO_SAMPLE_RATE = 22_050;
export const AUDIO_EFFECT_VOICE_CAP = 10;
export const AUDIO_CROSSFADE_MS = 450;
export const AUDIO_TOTAL_BYTE_BUDGET = 3.5 * 1024 * 1024;

export const FLOOR_AMBIENCE_IDS: readonly FloorAmbienceId[] = Object.freeze([
  "ambience-catacombs",
  "ambience-ember-vaults",
  "ambience-obsidian-sanctum",
]);

export const AUDIO_EFFECT_IDS: readonly AudioEffectId[] = Object.freeze([
  "ui-focus",
  "ui-confirm",
  "ui-back",
  "sword-swing",
  "dash",
  "enemy-hit",
  "enemy-defeat",
  "player-hit",
  "key-collected",
  "gate-sealed",
  "gate-ready",
  "chest-open",
  "shard-collected",
  "flask-heal",
  "forge-ready",
  "upgrade-selected",
  "floor-cleared",
  "run-victory",
  "run-defeat",
]);
