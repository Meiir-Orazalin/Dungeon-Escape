import type { PresentationSettings } from "./settings";

export interface EffectivePresentation {
  readonly reducedMotion: boolean;
  readonly screenShake: boolean;
  readonly continuousMotion: boolean;
  readonly particleScale: number;
  readonly uiScale: number;
  readonly transientEffectCap: number;
}

export function deriveEffectivePresentation(settings: PresentationSettings): EffectivePresentation {
  return Object.freeze({
    reducedMotion: settings.reducedMotion,
    screenShake: settings.screenShake && !settings.reducedMotion,
    continuousMotion: !settings.reducedMotion,
    particleScale: settings.reducedMotion ? 0.35 : 1,
    uiScale: settings.largeText ? 1.15 : 1,
    transientEffectCap: settings.reducedMotion ? 48 : 96,
  });
}

export function isLowHealth(health: number, status: "alive" | "defeated" = "alive"): boolean {
  return status === "alive" && Number.isFinite(health) && health > 0 && health <= 2;
}
