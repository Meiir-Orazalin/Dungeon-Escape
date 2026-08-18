import {
  completeOnboarding,
  loadPresentationSettings,
  requiresOnboarding,
  resetOnboarding,
  savePresentationSettings,
} from "./settingsStorage";
import {
  resetPresentationSettings,
  updatePresentationSetting,
  type PresentationSettings,
} from "./settings";

export const PRESENTATION_RUNTIME_REGISTRY_KEY = "presentation-runtime";

type SettingsListener = (settings: PresentationSettings) => void;

export class PresentationRuntime {
  private settings: PresentationSettings;
  private onboardingRequired: boolean;
  private readonly listeners = new Set<SettingsListener>();

  public constructor(
    private readonly storage: Storage | undefined,
    private readonly prefersReducedMotion: boolean,
  ) {
    this.settings = loadPresentationSettings(storage, prefersReducedMotion);
    this.onboardingRequired = requiresOnboarding(storage);
    this.applyDocumentClasses();
  }

  public getSettings(): PresentationSettings {
    return this.settings;
  }

  public update<K extends keyof PresentationSettings>(
    key: K,
    value: PresentationSettings[K],
  ): void {
    this.settings = updatePresentationSetting(this.settings, key, value);
    savePresentationSettings(this.storage, this.settings);
    this.notify();
  }

  public toggleMute(): boolean {
    this.update("muted", !this.settings.muted);
    return this.settings.muted;
  }

  public resetSettings(): void {
    this.settings = resetPresentationSettings(this.prefersReducedMotion);
    savePresentationSettings(this.storage, this.settings);
    this.notify();
  }

  public needsOnboarding(): boolean {
    return this.onboardingRequired;
  }

  public finishOnboarding(): void {
    completeOnboarding(this.storage);
    this.onboardingRequired = false;
  }

  public resetOnboarding(): void {
    resetOnboarding(this.storage);
    this.onboardingRequired = true;
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.applyDocumentClasses();
    this.listeners.forEach((listener) => listener(this.settings));
  }

  private applyDocumentClasses(): void {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("reduced-motion", this.settings.reducedMotion);
    document.documentElement.classList.toggle("high-contrast", this.settings.highContrast);
    document.documentElement.classList.toggle("large-text", this.settings.largeText);
  }
}

export function getPresentationRuntime(scene: Phaser.Scene): PresentationRuntime {
  const runtime = scene.registry.get(PRESENTATION_RUNTIME_REGISTRY_KEY) as unknown;
  if (!(runtime instanceof PresentationRuntime)) {
    throw new Error("Presentation runtime is unavailable.");
  }
  return runtime;
}
