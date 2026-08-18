import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { createRunPlan } from "../src/game/run/createRunPlan";
import {
  detectRuntimeCapabilities,
  selectRendererCapability,
} from "../src/game/platform/capabilities";
import {
  RELEASE_CONTRAST_PAIRS,
  contrastRatio,
  parseHexColor,
} from "../src/game/platform/contrastAudit";
import { createFatalErrorContent, FATAL_ERROR_TITLE } from "../src/game/platform/fatalError";
import {
  acceptsOneShotKey,
  shouldPreventGameKeyDefault,
} from "../src/game/platform/keyboardPolicy";
import { mapClientPointerToWorld } from "../src/game/platform/pointerCoordinates";
import { RELEASE_BUDGETS, withinReleaseBudget } from "../src/game/platform/releaseBudgets";
import {
  formatRendererType,
  PHASER_RENDERER_TYPES,
  rendererTypeForBoot,
} from "../src/game/platform/renderer";
import { createReleaseIdentity, shortenBuildSha } from "../src/game/platform/version";
import { nonNegativeCount } from "../src/game/testing/lifecycleDiagnostics";

interface FixtureFloor {
  floorNumber: number;
  floorSeed: string;
  layoutFingerprint: string;
  objectiveFingerprint: string;
  encounterFingerprint: string;
  lootFingerprint: string;
}
interface FixtureEntry {
  runSeed: string;
  runFingerprint: string;
  floors: FixtureFloor[];
}

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/v0.7.0-planning-fingerprints.json", import.meta.url), "utf8"),
) as { contractVersion: number; cases: FixtureEntry[] };

describe("v0.7.0 planning compatibility", () => {
  it("preserves all five run fingerprints and all sixty floor contracts", () => {
    expect(fixture.contractVersion).toBe(1);
    expect(fixture.cases).toHaveLength(5);
    for (const expected of fixture.cases) {
      const actual = createRunPlan(expected.runSeed);
      expect(actual.fingerprint).toBe(expected.runFingerprint);
      expect(actual.floors).toHaveLength(3);
      actual.floors.forEach((floor, index) => {
        const expectedFloor = expected.floors[index];
        expect(expectedFloor).toBeDefined();
        expect(floor.floorNumber).toBe(expectedFloor?.floorNumber);
        expect(floor.floorSeed).toBe(expectedFloor?.floorSeed);
        expect(floor.layout.fingerprint).toBe(expectedFloor?.layoutFingerprint);
        expect(floor.objective.fingerprint).toBe(expectedFloor?.objectiveFingerprint);
        expect(floor.encounter.fingerprint).toBe(expectedFloor?.encounterFingerprint);
        expect(floor.loot.fingerprint).toBe(expectedFloor?.lootFingerprint);
      });
    }
  });

  it("keeps renderer, presentation, capability, and version state outside planning", () => {
    const baseline = createRunPlan("final-release-alpha");
    rendererTypeForBoot(true, "canvas");
    createReleaseIdentity("1.0.0", "abcdef012345");
    selectRendererCapability({ webgl: false, canvas2d: true });
    expect(createRunPlan("final-release-alpha")).toEqual(baseline);
  });
});

describe("release capabilities and renderer configuration", () => {
  it("prefers WebGL, falls back to Canvas, and reports a clean fatal state", () => {
    expect(selectRendererCapability({ webgl: true, canvas2d: true })).toBe("webgl");
    expect(selectRendererCapability({ webgl: false, canvas2d: true })).toBe("canvas");
    expect(selectRendererCapability({ webgl: false, canvas2d: false })).toBe("unavailable");
  });

  it("uses AUTO in production and accepts only the E2E Canvas override", () => {
    expect(rendererTypeForBoot(false, "canvas")).toBe(PHASER_RENDERER_TYPES.AUTO);
    expect(rendererTypeForBoot(true, "invalid")).toBe(PHASER_RENDERER_TYPES.AUTO);
    expect(rendererTypeForBoot(true, "canvas")).toBe(PHASER_RENDERER_TYPES.CANVAS);
    expect(formatRendererType(PHASER_RENDERER_TYPES.WEBGL)).toBe("webgl");
    expect(formatRendererType(PHASER_RENDERER_TYPES.CANVAS)).toBe("canvas");
    expect(formatRendererType(999)).toBe("unknown");
  });

  it("detects unavailable optional browser features without gameplay state", () => {
    const fakeDocument = {
      createElement: () => ({ getContext: () => null }),
      documentElement: {},
    } as unknown as Document;
    const fakeWindow = {
      matchMedia: () => ({ matches: true }),
    } as unknown as Window;
    const capabilities = detectRuntimeCapabilities(fakeWindow, fakeDocument);
    expect(capabilities).toEqual({
      canvas2d: false,
      webgl: false,
      audio: false,
      storageRead: false,
      storageWrite: false,
      fullscreen: false,
      reducedMotion: true,
      pointer: false,
    });
    expect(Object.keys(capabilities)).not.toContain("seed");
  });
});

describe("fatal presentation, release identity, input, and pointer mapping", () => {
  it("creates friendly fatal copy without stack or path disclosure", () => {
    const content = createFatalErrorContent(createReleaseIdentity("1.0.0"), "renderer");
    expect(content.title).toBe(FATAL_ERROR_TITLE);
    expect(content.versionLabel).toBe("v1.0.0");
    expect(JSON.stringify(content)).not.toMatch(/stack|\/Users\//i);
  });

  it("formats the package version and optional build SHA safely", () => {
    expect(createReleaseIdentity("1.0.0", "ABCDEF012345")).toEqual({
      version: "1.0.0",
      label: "v1.0.0 · abcdef0",
      buildSha: "abcdef0",
    });
    expect(shortenBuildSha(undefined)).toBeNull();
    expect(shortenBuildSha("not-a-sha")).toBeNull();
  });

  it("maps scaled and scrolled client coordinates independently of DPR", () => {
    const mapped = mapClientPointerToWorld(
      510,
      290,
      { left: 30, top: 20, width: 960, height: 540 },
      { scrollX: 100, scrollY: 200, zoom: 2, viewportWidth: 960, viewportHeight: 540 },
    );
    expect(mapped).toEqual({ x: 340, y: 335 });
    expect(() =>
      mapClientPointerToWorld(
        0,
        0,
        { left: 0, top: 0, width: 0, height: 1 },
        { scrollX: 0, scrollY: 0, zoom: 1, viewportWidth: 960, viewportHeight: 540 },
      ),
    ).toThrow(/positive dimensions/);
  });

  it("prevents gameplay scrolling and suppresses repeated one-shot actions", () => {
    expect(shouldPreventGameKeyDefault("ArrowDown", true)).toBe(true);
    expect(shouldPreventGameKeyDefault("m", true)).toBe(true);
    expect(shouldPreventGameKeyDefault("ArrowDown", false)).toBe(false);
    expect(shouldPreventGameKeyDefault("Tab", true)).toBe(false);
    expect(acceptsOneShotKey("m", true)).toBe(false);
    expect(acceptsOneShotKey("ArrowDown", true)).toBe(true);
  });
});

describe("accessibility and static release budgets", () => {
  it("validates all fourteen essential contrast pairs", () => {
    expect(RELEASE_CONTRAST_PAIRS).toHaveLength(14);
    RELEASE_CONTRAST_PAIRS.forEach((pair) =>
      expect(contrastRatio(pair.foreground, pair.background), pair.id).toBeGreaterThanOrEqual(
        pair.minimum,
      ),
    );
    expect(() => parseHexColor("red")).toThrow(/Invalid/);
  });

  it("publishes exact final budgets and accepts exact boundaries", () => {
    expect(RELEASE_BUDGETS).toEqual({
      applicationJavaScriptBytes: 300_000,
      phaserVendorBytes: 1_450_000,
      totalJavaScriptGzipBytes: 450_000,
      totalAudioBytes: 3_500_000,
      totalSiteBytes: 6_500_000,
      singleNonAudioAssetBytes: 1_500_000,
    });
    Object.values(RELEASE_BUDGETS).forEach((budget) => {
      expect(withinReleaseBudget(budget, budget)).toBe(true);
      expect(withinReleaseBudget(budget + 1, budget)).toBe(false);
    });
    expect(() => withinReleaseBudget(Number.NaN, 1)).toThrow(/finite/);
  });

  it("normalizes lifecycle counts without exposing runtime objects", () => {
    expect(nonNegativeCount(4.9)).toBe(4);
    expect(nonNegativeCount(-2)).toBe(0);
    expect(nonNegativeCount(Number.NaN)).toBe(0);
  });
});
