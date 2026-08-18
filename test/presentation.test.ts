import { describe, expect, it } from "vitest";

import {
  createEnemyAwakeningState,
  enemyCanAct,
  ENEMY_AWAKENING_MS,
  updateEnemyAwakening,
} from "../src/game/balance/enemyAwakening";
import { COMBAT_CONFIG } from "../src/game/combat/config";
import { ASH_WISP_CONFIG, STONE_WARDEN_CONFIG } from "../src/game/enemies/enemyConfig";
import { decideEffectAcquisition, effectBudget } from "../src/game/effects/effectConfig";
import { derivePresentationTokens } from "../src/game/presentation/contrast";
import {
  shouldRequestAutomaticPause,
  shouldResumeFromFocus,
} from "../src/game/presentation/focusPause";
import { fullscreenLabel, requestGameFullscreen } from "../src/game/presentation/fullscreen";
import {
  enemyHealthBarWidth,
  healthBarRatio,
  shouldShowEnemyHealthBar,
} from "../src/game/presentation/healthBar";
import {
  NO_PRESENTATION_MODAL,
  transitionPresentationModal,
} from "../src/game/presentation/modalState";
import { deriveEffectivePresentation, isLowHealth } from "../src/game/presentation/motion";
import {
  DEFAULT_PRESENTATION_SETTINGS,
  effectiveScreenShake,
  parsePresentationSettings,
  resetPresentationSettings,
  serializePresentationSettings,
  updatePresentationSetting,
  validatePresentationSettings,
} from "../src/game/presentation/settings";
import {
  completeOnboarding,
  loadPresentationSettings,
  requiresOnboarding,
  resetOnboarding,
  savePresentationSettings,
  type PresentationStorage,
} from "../src/game/presentation/settingsStorage";

function memoryStorage(initial: Record<string, string> = {}): PresentationStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

describe("Phase 7 presentation settings", () => {
  it("uses the documented defaults without gameplay progress", () => {
    expect(DEFAULT_PRESENTATION_SETTINGS).toEqual({
      masterVolume: 0.8,
      ambienceVolume: 0.35,
      effectsVolume: 0.75,
      muted: false,
      reducedMotion: false,
      screenShake: true,
      highContrast: false,
      largeText: false,
    });
    expect(Object.keys(DEFAULT_PRESENTATION_SETTINGS)).not.toContain("seed");
    expect(Object.keys(DEFAULT_PRESENTATION_SETTINGS)).not.toContain("health");
  });

  it("clamps finite volume values and safely replaces non-finite values", () => {
    expect(validatePresentationSettings({ masterVolume: -2 }).masterVolume).toBe(0);
    expect(validatePresentationSettings({ masterVolume: 2 }).masterVolume).toBe(1);
    expect(validatePresentationSettings({ effectsVolume: Number.NaN }).effectsVolume).toBe(0.75);
    expect(
      validatePresentationSettings({ ambienceVolume: Number.POSITIVE_INFINITY }).ambienceVolume,
    ).toBe(0.35);
  });

  it("fills missing fields, ignores unknown fields, and survives malformed JSON", () => {
    expect(validatePresentationSettings({ muted: true, runFingerprint: "rn-bad" })).toEqual({
      ...DEFAULT_PRESENTATION_SETTINGS,
      muted: true,
    });
    expect(parsePresentationSettings("not-json")).toEqual(DEFAULT_PRESENTATION_SETTINGS);
  });

  it("uses the media-query default only without stored preferences", () => {
    expect(parsePresentationSettings(null, true).reducedMotion).toBe(true);
    expect(parsePresentationSettings("{}", true).reducedMotion).toBe(false);
  });

  it("serializes stably and mute preserves channel values", () => {
    const muted = updatePresentationSetting(DEFAULT_PRESENTATION_SETTINGS, "muted", true);
    expect(muted.masterVolume).toBe(0.8);
    expect(muted.ambienceVolume).toBe(0.35);
    expect(serializePresentationSettings(muted)).toBe(serializePresentationSettings(muted));
    expect(parsePresentationSettings(serializePresentationSettings(muted))).toEqual(muted);
  });

  it("resets safely and reduced motion suppresses effective shake", () => {
    const reduced = updatePresentationSetting(DEFAULT_PRESENTATION_SETTINGS, "reducedMotion", true);
    expect(reduced.screenShake).toBe(true);
    expect(effectiveScreenShake(reduced)).toBe(false);
    expect(resetPresentationSettings()).toEqual(DEFAULT_PRESENTATION_SETTINGS);
  });

  it("guards denied storage reads and writes", () => {
    const denied: PresentationStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadPresentationSettings(denied)).toEqual(DEFAULT_PRESENTATION_SETTINGS);
    expect(savePresentationSettings(denied, DEFAULT_PRESENTATION_SETTINGS)).toBe(false);
    expect(requiresOnboarding(denied)).toBe(true);
    expect(resetOnboarding(denied)).toBe(false);
  });
});

describe("Phase 7 onboarding and modal transitions", () => {
  it("records only the onboarding completion flag and can reset it", () => {
    const storage = memoryStorage();
    expect(requiresOnboarding(storage)).toBe(true);
    expect(completeOnboarding(storage)).toBe(true);
    expect(requiresOnboarding(storage)).toBe(false);
    expect(resetOnboarding(storage)).toBe(true);
    expect(requiresOnboarding(storage)).toBe(true);
  });

  it("enters pause only from active playing and ignores duplicates", () => {
    const runtime = { outcome: "active" as const, activity: "playing" as const };
    const paused = transitionPresentationModal(
      NO_PRESENTATION_MODAL,
      { type: "open-pause" },
      runtime,
    );
    expect(paused).toEqual({ kind: "pause" });
    expect(transitionPresentationModal(paused, { type: "open-pause" }, runtime)).toBe(paused);
    expect(transitionPresentationModal(paused, { type: "resume" }, runtime)).toBe(
      NO_PRESENTATION_MODAL,
    );
  });

  it("routes settings and manual back to their documented origins", () => {
    const runtime = { outcome: "active" as const, activity: "playing" as const };
    const pause = transitionPresentationModal(
      NO_PRESENTATION_MODAL,
      { type: "open-pause" },
      runtime,
    );
    const settings = transitionPresentationModal(
      pause,
      { type: "open-settings", returnTo: "pause" },
      runtime,
    );
    expect(transitionPresentationModal(settings, { type: "back" }, runtime)).toEqual({
      kind: "pause",
    });
    const manual = transitionPresentationModal(
      NO_PRESENTATION_MODAL,
      { type: "open-manual", returnTo: "game" },
      runtime,
    );
    expect(transitionPresentationModal(manual, { type: "back" }, runtime)).toBe(
      NO_PRESENTATION_MODAL,
    );
  });

  it("rejects pause for forge choice, floor clear, escape, and defeat", () => {
    expect(
      transitionPresentationModal(
        NO_PRESENTATION_MODAL,
        { type: "open-pause" },
        { outcome: "active", activity: "choosing-upgrade" },
      ),
    ).toBe(NO_PRESENTATION_MODAL);
    expect(
      transitionPresentationModal(
        NO_PRESENTATION_MODAL,
        { type: "open-pause" },
        { outcome: "active", activity: "floor-cleared" },
      ),
    ).toBe(NO_PRESENTATION_MODAL);
    expect(
      transitionPresentationModal(
        NO_PRESENTATION_MODAL,
        { type: "open-pause" },
        { outcome: "escaped", activity: "playing" },
      ),
    ).toBe(NO_PRESENTATION_MODAL);
    expect(
      transitionPresentationModal(
        NO_PRESENTATION_MODAL,
        { type: "open-pause" },
        { outcome: "defeated", activity: "playing" },
      ),
    ).toBe(NO_PRESENTATION_MODAL);
  });

  it("requests automatic pause only during active play and never automatic resume", () => {
    expect(shouldRequestAutomaticPause("active", "playing", "none")).toBe(true);
    expect(shouldRequestAutomaticPause("active", "playing", "pause")).toBe(false);
    expect(shouldRequestAutomaticPause("active", "floor-cleared", "none")).toBe(false);
    expect(shouldResumeFromFocus()).toBe(false);
  });
});

describe("Phase 7 enemy awakening and visual derivation", () => {
  it("keeps undiscovered enemies dormant and starts exact 450 ms awakening", () => {
    const dormant = createEnemyAwakeningState();
    expect(updateEnemyAwakening(dormant, { discovered: false, dead: false, deltaMs: 500 })).toBe(
      dormant,
    );
    const awakening = updateEnemyAwakening(dormant, { discovered: true, dead: false, deltaMs: 0 });
    expect(awakening).toEqual({
      status: "awakening",
      consumed: true,
      remainingMs: ENEMY_AWAKENING_MS,
    });
    expect(enemyCanAct(awakening)).toBe(false);
  });

  it("blocks action below the boundary and activates exactly at it", () => {
    const awakening = updateEnemyAwakening(createEnemyAwakeningState(), {
      discovered: true,
      dead: false,
      deltaMs: 0,
    });
    const almost = updateEnemyAwakening(awakening, { discovered: true, dead: false, deltaMs: 449 });
    expect(almost).toEqual({ status: "awakening", consumed: true, remainingMs: 1 });
    expect(enemyCanAct(almost)).toBe(false);
    expect(updateEnemyAwakening(almost, { discovered: true, dead: false, deltaMs: 1 })).toEqual({
      status: "active",
      consumed: true,
      remainingMs: 0,
    });
  });

  it("consumes awakening once even if the player leaves, and death wins", () => {
    const awakening = updateEnemyAwakening(createEnemyAwakeningState(), {
      discovered: true,
      dead: false,
      deltaMs: 0,
    });
    const active = updateEnemyAwakening(awakening, {
      discovered: false,
      dead: false,
      deltaMs: 450,
    });
    expect(active).toEqual({ status: "active", consumed: true, remainingMs: 0 });
    expect(updateEnemyAwakening(active, { discovered: true, dead: false, deltaMs: 0 })).toBe(
      active,
    );
    expect(updateEnemyAwakening(awakening, { discovered: true, dead: true, deltaMs: 0 })).toEqual({
      status: "dead",
      consumed: true,
      remainingMs: 0,
    });
  });

  it("leaves base combat damage and telegraphs unchanged", () => {
    expect(COMBAT_CONFIG.damagePerHit).toBe(1);
    expect(ASH_WISP_CONFIG.shotTelegraphMs).toBe(350);
    expect(STONE_WARDEN_CONFIG.chargeWindUpMs).toBe(550);
  });

  it("derives low-health, reduced-motion, contrast, and bounded effects", () => {
    expect(isLowHealth(2)).toBe(true);
    expect(isLowHealth(3)).toBe(false);
    expect(isLowHealth(0, "defeated")).toBe(false);
    const reduced = deriveEffectivePresentation({
      ...DEFAULT_PRESENTATION_SETTINGS,
      reducedMotion: true,
      screenShake: true,
    });
    expect(reduced.screenShake).toBe(false);
    expect(reduced.continuousMotion).toBe(false);
    expect(reduced.transientEffectCap).toBe(48);
    expect(effectBudget(false)).toBe(96);
    expect(decideEffectAcquisition(96, 96)).toBe("reuse-oldest");
    expect(derivePresentationTokens(true).markerLineWidth).toBe(3);
  });

  it("derives accessible health bars without physics state", () => {
    expect(healthBarRatio(3, 5)).toBe(0.6);
    expect(healthBarRatio(8, 5)).toBe(1);
    expect(healthBarRatio(-1, 5)).toBe(0);
    expect(enemyHealthBarWidth("stone-warden")).toBeGreaterThan(enemyHealthBarWidth("ash-wisp"));
    expect(shouldShowEnemyHealthBar(false, true, true, 100)).toBe(false);
    expect(shouldShowEnemyHealthBar(true, false, true, 1)).toBe(true);
    expect(shouldShowEnemyHealthBar(true, true, false, 100)).toBe(false);
  });

  it("guards fullscreen support and formats state", async () => {
    expect(fullscreenLabel(false)).toBe("ENTER FULLSCREEN");
    expect(fullscreenLabel(true)).toBe("EXIT FULLSCREEN");
    expect(await requestGameFullscreen(undefined)).toBe(false);
    expect(
      await requestGameFullscreen({
        requestFullscreen: async () => {
          throw new Error("denied");
        },
      } as unknown as HTMLElement),
    ).toBe(false);
  });
});
