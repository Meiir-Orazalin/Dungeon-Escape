import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { effectiveScreenShake, type PresentationSettings } from "../presentation/settings";

type SettingKey =
  | "masterVolume"
  | "ambienceVolume"
  | "effectsVolume"
  | "muted"
  | "reducedMotion"
  | "screenShake"
  | "highContrast"
  | "largeText";
const ROWS: readonly Readonly<{
  key?: SettingKey;
  label: string;
  action?: "reset-settings" | "reset-onboarding" | "back";
}>[] = Object.freeze([
  { key: "masterVolume", label: "MASTER VOLUME" },
  { key: "ambienceVolume", label: "AMBIENCE VOLUME" },
  { key: "effectsVolume", label: "EFFECTS VOLUME" },
  { key: "muted", label: "MUTE" },
  { key: "reducedMotion", label: "REDUCED MOTION" },
  { key: "screenShake", label: "SCREEN SHAKE" },
  { key: "highContrast", label: "HIGH CONTRAST" },
  { key: "largeText", label: "LARGE TEXT" },
  { label: "RESET PRESENTATION SETTINGS", action: "reset-settings" },
  { label: "RESET ONBOARDING", action: "reset-onboarding" },
  { label: "BACK", action: "back" },
]);

interface SettingsCallbacks {
  readonly change: <K extends keyof PresentationSettings>(
    key: K,
    value: PresentationSettings[K],
  ) => void;
  readonly resetSettings: () => void;
  readonly resetOnboarding: () => void;
  readonly back: () => void;
  readonly focus?: () => void;
}

export class SettingsOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly values: Phaser.GameObjects.Text[] = [];
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private selected = 0;
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private settings: PresentationSettings,
    private readonly callbacks: SettingsCallbacks,
  ) {
    const scale = settings.largeText ? 1.12 : 1;
    const stroke = settings.highContrast ? 3 : 1;
    this.container = scene.add
      .container(0, 0)
      .setName("settings-overlay")
      .setScrollFactor(0)
      .setDepth(985);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020405, 0.84).setOrigin(0);
    this.panel = scene.add
      .rectangle(480, 270, 690, 480, 0x091013, 0.995)
      .setStrokeStyle(stroke, 0xd2a45f, 0.95);
    this.title = scene.add
      .text(480, 50, "SETTINGS", {
        color: "#f0d59c",
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(30 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.hint = scene.add
      .text(480, 82, "UP / DOWN  ·  SELECT     LEFT / RIGHT  ·  ADJUST     ESC  ·  BACK", {
        color: "#748285",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.container.add([veil, this.panel, this.title, this.hint]);
    ROWS.forEach((row, index) => {
      const y = 112 + index * 34;
      const label = scene.add
        .text(205, y, row.label, {
          color: "#aeb9b7",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(11 * scale)}px`,
          fontStyle: "bold",
          letterSpacing: 0.9,
        })
        .setOrigin(0, 0.5);
      const value = scene.add
        .text(755, y, "", {
          color: "#82d3c4",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(11 * scale)}px`,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);
      const zone = scene.add.zone(480, y, 570, 30).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        this.selected = index;
        this.callbacks.focus?.();
        this.render();
      });
      zone.on("pointerup", () => this.activate(index));
      this.labels.push(label);
      this.values.push(value);
      this.zones.push(zone);
      this.container.add([label, value, zone]);
    });
    this.registerInput();
    this.render();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public updateSettings(settings: PresentationSettings): void {
    this.settings = settings;
    const scale = settings.largeText ? 1.12 : 1;
    this.panel.setStrokeStyle(settings.highContrast ? 3 : 1, 0xd2a45f, 0.95);
    this.title.setFontSize(Math.round(30 * scale));
    this.hint.setFontSize(Math.round(9 * scale));
    this.labels.forEach((label) => label.setFontSize(Math.round(11 * scale)));
    this.values.forEach((value) => value.setFontSize(Math.round(11 * scale)));
    this.render();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unregisterInput();
    this.zones.forEach((zone) => zone.removeAllListeners());
    this.container.destroy(true);
  }

  private registerInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.on("keydown-UP", this.previous, this);
    keyboard?.on("keydown-DOWN", this.next, this);
    keyboard?.on("keydown-LEFT", this.decrease, this);
    keyboard?.on("keydown-RIGHT", this.increase, this);
    keyboard?.on("keydown-ENTER", this.activateCurrent, this);
    keyboard?.on("keydown-ESC", this.back, this);
  }

  private unregisterInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off("keydown-UP", this.previous, this);
    keyboard?.off("keydown-DOWN", this.next, this);
    keyboard?.off("keydown-LEFT", this.decrease, this);
    keyboard?.off("keydown-RIGHT", this.increase, this);
    keyboard?.off("keydown-ENTER", this.activateCurrent, this);
    keyboard?.off("keydown-ESC", this.back, this);
  }

  private previous(): void {
    this.selected = (this.selected + ROWS.length - 1) % ROWS.length;
    this.callbacks.focus?.();
    this.render();
  }
  private next(): void {
    this.selected = (this.selected + 1) % ROWS.length;
    this.callbacks.focus?.();
    this.render();
  }
  private decrease(): void {
    this.adjust(-0.1);
  }
  private increase(): void {
    this.adjust(0.1);
  }
  private activateCurrent(): void {
    this.activate(this.selected);
  }
  private back(): void {
    this.destroy();
    this.callbacks.back();
  }

  private activate(index: number): void {
    const row = ROWS[index];
    if (!row) return;
    if (row.action === "back") {
      this.back();
      return;
    }
    if (row.action === "reset-settings") {
      this.callbacks.resetSettings();
      return;
    }
    if (row.action === "reset-onboarding") {
      this.callbacks.resetOnboarding();
      return;
    }
    this.adjust(0.1);
  }

  private adjust(delta: number): void {
    const row = ROWS[this.selected];
    const key = row?.key;
    if (!key) return;
    const current = this.settings[key];
    if (typeof current === "number") {
      const value = Math.round(Math.min(1, Math.max(0, current + delta)) * 10) / 10;
      this.callbacks.change(key, value);
    } else this.callbacks.change(key, !current);
  }

  private render(): void {
    ROWS.forEach((row, index) => {
      this.labels[index]?.setColor(index === this.selected ? "#ffe0a4" : "#aeb9b7");
      const value = this.values[index];
      if (!value) return;
      if (!row.key) {
        value.setText(index === this.selected ? "◈" : "");
        return;
      }
      const setting = this.settings[row.key];
      const text =
        typeof setting === "number" ? `${Math.round(setting * 100)}%` : setting ? "ON" : "OFF";
      value.setText(
        row.key === "screenShake" && this.settings.reducedMotion ? `${text} · SUPPRESSED` : text,
      );
      value.setColor(
        row.key === "screenShake" && !effectiveScreenShake(this.settings) ? "#849092" : "#82d3c4",
      );
    });
  }
}
