import {
  ONBOARDING_KEY,
  PRESENTATION_SETTINGS_KEY,
  parsePresentationSettings,
  serializePresentationSettings,
  type PresentationSettings,
} from "./settings";

export interface PresentationStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

export function loadPresentationSettings(
  storage: PresentationStorage | undefined,
  prefersReducedMotion = false,
): PresentationSettings {
  try {
    return parsePresentationSettings(
      storage?.getItem(PRESENTATION_SETTINGS_KEY) ?? null,
      prefersReducedMotion,
    );
  } catch {
    return parsePresentationSettings(null, prefersReducedMotion);
  }
}

export function savePresentationSettings(
  storage: PresentationStorage | undefined,
  settings: PresentationSettings,
): boolean {
  try {
    storage?.setItem(PRESENTATION_SETTINGS_KEY, serializePresentationSettings(settings));
    return storage !== undefined;
  } catch {
    return false;
  }
}

export function requiresOnboarding(storage: PresentationStorage | undefined): boolean {
  try {
    return storage?.getItem(ONBOARDING_KEY) !== "complete";
  } catch {
    return true;
  }
}

export function completeOnboarding(storage: PresentationStorage | undefined): boolean {
  try {
    storage?.setItem(ONBOARDING_KEY, "complete");
    return storage !== undefined;
  } catch {
    return false;
  }
}

export function resetOnboarding(storage: PresentationStorage | undefined): boolean {
  try {
    storage?.removeItem(ONBOARDING_KEY);
    return storage !== undefined;
  } catch {
    return false;
  }
}
