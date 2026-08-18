import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  AUDIO_EFFECT_IDS,
  AUDIO_EFFECT_VOICE_CAP,
  AUDIO_TOTAL_BYTE_BUDGET,
  FLOOR_AMBIENCE_IDS,
} from "../src/game/audio/config";
import { ambienceForFloor } from "../src/game/audio/floorAmbience";
import { decideEffectVoice } from "../src/game/audio/voiceBudget";
import { deriveEffectiveAudioGains } from "../src/game/audio/volume";
import {
  assertFiniteBudget,
  classifyProductionChunk,
  totalBytes,
} from "../src/game/presentation/performance";
import { DEFAULT_PRESENTATION_SETTINGS } from "../src/game/presentation/settings";

interface AudioManifest {
  readonly contractVersion: number;
  readonly files: readonly Readonly<{
    id: string;
    path: string;
    kind: "ambience" | "effect";
    sampleRate: number;
    channelCount: number;
    bitsPerSample: number;
    duration: number;
    byteSize: number;
    sha256: string;
  }>[];
}

async function manifest(): Promise<AudioManifest> {
  return JSON.parse(
    await readFile(new URL("../public/audio/audio-manifest.json", import.meta.url), "utf8"),
  ) as AudioManifest;
}

describe("Phase 7 audio contracts", () => {
  it("composes documented gains and makes mute immediately silent", () => {
    const gains = deriveEffectiveAudioGains(DEFAULT_PRESENTATION_SETTINGS);
    expect(gains.master).toBe(0.8);
    expect(gains.ambience).toBeCloseTo(0.28);
    expect(gains.effects).toBeCloseTo(0.6);
    expect(deriveEffectiveAudioGains({ ...DEFAULT_PRESENTATION_SETTINGS, muted: true })).toEqual({
      master: 0,
      ambience: 0,
      effects: 0,
    });
  });

  it("keeps every gain finite and clamped", () => {
    const gains = deriveEffectiveAudioGains({
      ...DEFAULT_PRESENTATION_SETTINGS,
      masterVolume: Number.NaN,
      ambienceVolume: 3,
      effectsVolume: -1,
    });
    expect(gains).toEqual({ master: 0, ambience: 0, effects: 0 });
  });

  it("maps exactly one ambience identity to each floor", () => {
    expect(FLOOR_AMBIENCE_IDS).toHaveLength(3);
    expect(ambienceForFloor(1)).toBe("ambience-catacombs");
    expect(ambienceForFloor(2)).toBe("ambience-ember-vaults");
    expect(ambienceForFloor(3)).toBe("ambience-obsidian-sanctum");
    expect(() => ambienceForFloor(4 as 1)).toThrow(/No ambience/);
  });

  it("caps effects at ten and deterministically replaces the oldest non-critical voice", () => {
    expect(AUDIO_EFFECT_VOICE_CAP).toBe(10);
    const voices = Array.from({ length: 10 }, (_, id) => ({
      id,
      critical: id === 0,
      startedSequence: id,
    }));
    expect(decideEffectVoice(voices, 10, false)).toEqual({ action: "replace", voiceId: 1 });
    expect(decideEffectVoice(voices.slice(0, 9), 10, false)).toEqual({ action: "accept" });
  });

  it("protects critical voice priority and rejects non-critical overflow when necessary", () => {
    const critical = Array.from({ length: 10 }, (_, id) => ({
      id,
      critical: true,
      startedSequence: id,
    }));
    expect(decideEffectVoice(critical, 10, false)).toEqual({ action: "reject" });
    expect(decideEffectVoice(critical, 10, true)).toEqual({ action: "replace", voiceId: 0 });
    expect(() => decideEffectVoice([], 0, false)).toThrow(/positive/);
  });

  it("declares a valid original mono PCM manifest within budget", async () => {
    const value = await manifest();
    expect(value.contractVersion).toBe(1);
    expect(value.files.filter(({ kind }) => kind === "ambience")).toHaveLength(3);
    expect(value.files.filter(({ kind }) => kind === "effect")).toHaveLength(
      AUDIO_EFFECT_IDS.length,
    );
    expect(new Set(value.files.map(({ path }) => path)).size).toBe(value.files.length);
    value.files.forEach((entry) => {
      expect(entry.sampleRate).toBe(22_050);
      expect(entry.channelCount).toBe(1);
      expect(entry.bitsPerSample).toBe(16);
      expect(entry.duration).toBeGreaterThan(0);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.path).not.toMatch(/^https?:/);
    });
    expect(totalBytes(value.files.map(({ byteSize }) => byteSize))).toBeLessThanOrEqual(
      AUDIO_TOTAL_BYTE_BUDGET,
    );
  });
});

describe("Phase 7 production performance contracts", () => {
  it("isolates Phaser and leaves application modules outside the vendor chunk", () => {
    expect(classifyProductionChunk("/repo/node_modules/phaser/src/phaser.js")).toBe(
      "phaser-vendor",
    );
    expect(classifyProductionChunk("C:\\repo\\node_modules\\phaser\\src\\phaser.js")).toBe(
      "phaser-vendor",
    );
    expect(classifyProductionChunk("/repo/src/game/scenes/GameScene.ts")).toBeUndefined();
  });

  it("validates and totals stable finite asset budgets", () => {
    expect(assertFiniteBudget(350_000, "application")).toBe(350_000);
    expect(totalBytes([10, 20, 30])).toBe(60);
    expect(() => assertFiniteBudget(Number.NaN, "bad")).toThrow(/finite/);
    expect(() => totalBytes([10, -1])).toThrow(/non-negative/);
  });
});
