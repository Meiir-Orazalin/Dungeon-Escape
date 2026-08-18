export const PRESENTATION_SETTINGS_KEY = "dungeon-escape.presentation.v1";
export const ONBOARDING_KEY = "dungeon-escape.onboarding.v1";

export interface PresentationSettings {
  readonly masterVolume: number;
  readonly ambienceVolume: number;
  readonly effectsVolume: number;
  readonly muted: boolean;
  readonly reducedMotion: boolean;
  readonly screenShake: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
}

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = Object.freeze({
  masterVolume: 0.8,
  ambienceVolume: 0.35,
  effectsVolume: 0.75,
  muted: false,
  reducedMotion: false,
  screenShake: true,
  highContrast: false,
  largeText: false,
});

function volume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function validatePresentationSettings(
  value: unknown,
  prefersReducedMotion = false,
  hasStoredPreference = true,
): PresentationSettings {
  const source =
    value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const reducedMotionDefault = hasStoredPreference ? false : prefersReducedMotion;
  return Object.freeze({
    masterVolume: volume(source.masterVolume, DEFAULT_PRESENTATION_SETTINGS.masterVolume),
    ambienceVolume: volume(source.ambienceVolume, DEFAULT_PRESENTATION_SETTINGS.ambienceVolume),
    effectsVolume: volume(source.effectsVolume, DEFAULT_PRESENTATION_SETTINGS.effectsVolume),
    muted: flag(source.muted, DEFAULT_PRESENTATION_SETTINGS.muted),
    reducedMotion: flag(source.reducedMotion, reducedMotionDefault),
    screenShake: flag(source.screenShake, DEFAULT_PRESENTATION_SETTINGS.screenShake),
    highContrast: flag(source.highContrast, DEFAULT_PRESENTATION_SETTINGS.highContrast),
    largeText: flag(source.largeText, DEFAULT_PRESENTATION_SETTINGS.largeText),
  });
}

export function parsePresentationSettings(
  raw: string | null,
  prefersReducedMotion = false,
): PresentationSettings {
  if (raw === null) return validatePresentationSettings({}, prefersReducedMotion, false);
  try {
    return validatePresentationSettings(JSON.parse(raw), prefersReducedMotion, true);
  } catch {
    return validatePresentationSettings({}, prefersReducedMotion, true);
  }
}

export function serializePresentationSettings(settings: PresentationSettings): string {
  const safe = validatePresentationSettings(settings);
  return JSON.stringify({
    masterVolume: safe.masterVolume,
    ambienceVolume: safe.ambienceVolume,
    effectsVolume: safe.effectsVolume,
    muted: safe.muted,
    reducedMotion: safe.reducedMotion,
    screenShake: safe.screenShake,
    highContrast: safe.highContrast,
    largeText: safe.largeText,
  });
}

export function updatePresentationSetting<K extends keyof PresentationSettings>(
  settings: PresentationSettings,
  key: K,
  value: PresentationSettings[K],
): PresentationSettings {
  return validatePresentationSettings({ ...settings, [key]: value });
}

export function resetPresentationSettings(prefersReducedMotion = false): PresentationSettings {
  return validatePresentationSettings({}, prefersReducedMotion, false);
}

export function effectiveScreenShake(settings: PresentationSettings): boolean {
  return settings.screenShake && !settings.reducedMotion;
}
