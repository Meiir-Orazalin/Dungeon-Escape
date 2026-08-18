import type { PresentationSettings } from "../presentation/settings";
import type { EffectiveAudioGains } from "./types";

function gain(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function deriveEffectiveAudioGains(settings: PresentationSettings): EffectiveAudioGains {
  const master = settings.muted ? 0 : gain(settings.masterVolume);
  return Object.freeze({
    master,
    ambience: master * gain(settings.ambienceVolume),
    effects: master * gain(settings.effectsVolume),
  });
}
