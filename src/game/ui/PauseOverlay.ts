import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import type { PresentationSettings } from "../presentation/settings";

interface PauseCallbacks {
  readonly resume: () => void;
  readonly manual: () => void;
  readonly settings: () => void;
  readonly replay: () => void;
  readonly newRun: () => void;
  readonly fullscreen: () => void;
  readonly mute: () => void;
}

export class PauseOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private destroyed = false;
  private muteHeld = false;
  private fullscreenHeld = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: Readonly<{
      floorNumber: number;
      floorName: string;
      runSeed: string;
      health: string;
      buildCount: number;
    }>,
    settings: PresentationSettings,
    private readonly callbacks: PauseCallbacks,
  ) {
    const scale = settings.largeText ? 1.14 : 1;
    const stroke = settings.highContrast ? 3 : 1;
    this.container = scene.add
      .container(0, 0)
      .setName("pause-overlay")
      .setScrollFactor(0)
      .setDepth(975);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020405, 0.76).setOrigin(0);
    const panel = scene.add
      .rectangle(480, 270, 670, 454, 0x091013, 0.99)
      .setStrokeStyle(stroke, 0xd0a35e, 0.95);
    const title = scene.add
      .text(480, 72, "RUN PAUSED", {
        color: "#f1d79e",
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(34 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const summary = scene.add
      .text(
        480,
        119,
        `FLOOR ${details.floorNumber} / 3  ·  ${details.floorName}\nHEALTH ${details.health}  ·  BUILD ${details.buildCount} / 6\nRUN SEED  ·  ${details.runSeed}`,
        {
          color: "#98a7a6",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(10 * scale)}px`,
          align: "center",
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5);
    this.container.add([veil, panel, title, summary]);
    const actions = [
      ["RESUME", callbacks.resume],
      ["FIELD MANUAL", callbacks.manual],
      ["SETTINGS", callbacks.settings],
      ["REPLAY CURRENT FLOOR", callbacks.replay],
      ["NEW RUN", callbacks.newRun],
      ["FULLSCREEN", callbacks.fullscreen],
    ] as const;
    actions.forEach(([label, callback], index) => {
      const x = index % 2 === 0 ? 350 : 610;
      const y = 205 + Math.floor(index / 2) * 67;
      const plate = scene.add
        .rectangle(x, y, 224, 48, 0x152023, 1)
        .setStrokeStyle(stroke, 0x758688, 0.72);
      const text = scene.add
        .text(x, y, label, {
          color: index === 0 ? "#f0ca84" : "#b9c4c2",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(11 * scale)}px`,
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5);
      const zone = scene.add.zone(x, y, 224, 48).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => plate.setStrokeStyle(2, 0xe2b76f, 1));
      zone.on("pointerout", () => plate.setStrokeStyle(stroke, 0x758688, 0.72));
      zone.on("pointerup", callback);
      this.zones.push(zone);
      this.container.add([plate, text, zone]);
    });
    const quick = scene.add
      .text(
        480,
        435,
        `ESC / ENTER  ·  RESUME     H  ·  MANUAL     S  ·  SETTINGS     F  ·  FULLSCREEN     M  ·  ${settings.muted ? "UNMUTE" : "MUTE"}`,
        {
          color: "#758486",
          fontFamily: "Arial, sans-serif",
          fontSize: "9px",
          fontStyle: "bold",
          letterSpacing: 0.7,
        },
      )
      .setOrigin(0.5);
    this.container.add(quick);
    // The overlay can be constructed from GameScene's keydown-ESC listener. Defer
    // registration so this overlay cannot consume that same opening event and
    // immediately resume on EventEmitter implementations that visit new listeners.
    queueMicrotask(() => {
      if (!this.destroyed) this.registerInput();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unregisterInput();
    this.zones.forEach((zone) => zone.removeAllListeners());
    this.container.destroy(true);
  }
  private registerInput(): void {
    const k = this.scene.input.keyboard;
    k?.on("keydown-ESC", this.resume, this);
    k?.on("keydown-ENTER", this.resume, this);
    k?.on("keydown-H", this.manual, this);
    k?.on("keydown-S", this.settings, this);
    k?.on("keydown-F", this.fullscreen, this);
    k?.on("keyup-F", this.releaseFullscreen, this);
    k?.on("keydown-M", this.mute, this);
    k?.on("keyup-M", this.releaseMute, this);
  }
  private unregisterInput(): void {
    const k = this.scene.input.keyboard;
    k?.off("keydown-ESC", this.resume, this);
    k?.off("keydown-ENTER", this.resume, this);
    k?.off("keydown-H", this.manual, this);
    k?.off("keydown-S", this.settings, this);
    k?.off("keydown-F", this.fullscreen, this);
    k?.off("keyup-F", this.releaseFullscreen, this);
    k?.off("keydown-M", this.mute, this);
    k?.off("keyup-M", this.releaseMute, this);
  }
  private resume(): void {
    this.destroy();
    this.callbacks.resume();
  }
  private manual(): void {
    this.destroy();
    this.callbacks.manual();
  }
  private settings(): void {
    this.destroy();
    this.callbacks.settings();
  }
  private fullscreen(): void {
    if (this.fullscreenHeld) return;
    this.fullscreenHeld = true;
    this.callbacks.fullscreen();
  }
  private releaseFullscreen(): void {
    this.fullscreenHeld = false;
  }
  private mute(): void {
    if (this.muteHeld) return;
    this.muteHeld = true;
    this.callbacks.mute();
  }
  private releaseMute(): void {
    this.muteHeld = false;
  }
}
