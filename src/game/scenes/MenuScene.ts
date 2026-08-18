import Phaser from "phaser";

import { getAudioDirector, type AudioDirector } from "../audio/AudioDirector";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, TEXTURE_KEYS } from "../constants";
import {
  getPresentationRuntime,
  type PresentationRuntime,
} from "../presentation/PresentationRuntime";
import { requestGameFullscreen } from "../presentation/fullscreen";
import { FieldManualOverlay } from "../ui/FieldManualOverlay";
import { SettingsOverlay } from "../ui/SettingsOverlay";
import { announceGameState } from "../ui/announce";

export class MenuScene extends Phaser.Scene {
  private hasStarted = false;
  private buttons: Phaser.GameObjects.Container[] = [];
  private manual?: FieldManualOverlay;
  private settings?: SettingsOverlay;
  private presentation?: PresentationRuntime;
  private audio?: AudioDirector;
  private muteHeld = false;
  private fullscreenHeld = false;

  public constructor() {
    super(SCENE_KEYS.MENU);
  }

  public create(): void {
    this.hasStarted = false;
    this.buttons = [];
    this.manual = undefined;
    this.settings = undefined;
    this.presentation = getPresentationRuntime(this);
    this.audio = getAudioDirector(this);
    this.drawBackdrop();
    this.drawMenu();
    this.registerInput();
    announceGameState("Main menu. Start Run, open How to Play, or open Settings.");
  }

  private drawBackdrop(): void {
    this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TEXTURE_KEYS.FLOOR)
      .setTint(0x687176);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x07090b, 0x07090b, 0x11181a, 0x11181a, 0.72, 0.72, 0.35, 0.35);
    shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    shade.lineStyle(this.presentation?.getSettings().highContrast ? 3 : 1, 0x9c7745, 0.5);
    shade.strokeRect(29, 29, GAME_WIDTH - 58, GAME_HEIGHT - 58);
    this.add.circle(114, 112, 95, 0xf1a64a, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(846, 420, 130, 0x5a8591, 0.045).setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawMenu(): void {
    const settings = this.presentation?.getSettings();
    const scale = settings?.largeText ? 1.14 : 1;
    this.add
      .text(480, 72, "THREE FLOORS · ONE DETERMINISTIC RUN", {
        color: "#bd9b67",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(12 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(480, 125, "DUNGEON ESCAPE", {
        color: "#eef0e7",
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(50 * scale)}px`,
        fontStyle: "bold",
        stroke: "#080a0b",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(480, 171, "Fight, loot, forge a run build, and open each Ancient Gate.", {
        color: "#9ba6a6",
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(15 * scale)}px`,
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    this.createButton(480, 240, 280, 54, "START RUN", this.startGame);
    this.createButton(330, 307, 260, 44, "HOW TO PLAY", this.openManual);
    this.createButton(630, 307, 260, 44, "SETTINGS", this.openSettings);
    this.createButton(480, 363, 280, 38, "FULLSCREEN", this.toggleFullscreen);
    this.add
      .text(480, 414, "ESC  ·  PAUSE     M  ·  MUTE     H  ·  FIELD MANUAL     F  ·  FULLSCREEN", {
        color: "#7f8d8e",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(10 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.add
      .text(
        480,
        462,
        "WASD / ARROWS  ·  MOVE     SPACE / J / CLICK  ·  ATTACK     SHIFT  ·  DASH     E  ·  INTERACT\nR  ·  REPLAY CURRENT FLOOR     N  ·  NEW RUN",
        {
          align: "center",
          color: "#9da8a7",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(10 * scale)}px`,
          fontStyle: "bold",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);
    this.add
      .text(480, 512, "Best played in landscape with keyboard and pointer.", {
        color: "#647274",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setName("landscape-recommendation");
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    callback: () => void,
  ): void {
    const stroke = this.presentation?.getSettings().highContrast ? 3 : 1;
    const plate = this.add
      .rectangle(0, 0, width, height, 0x151d1f, 0.98)
      .setStrokeStyle(stroke, 0xc69b5c, 0.72);
    const text = this.add
      .text(0, 0, label, {
        color: "#f3d7a1",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const button = this.add
      .container(x, y, [plate, text])
      .setSize(width, height)
      .setInteractive({ useHandCursor: true });
    button.on("pointerover", () => {
      plate.setFillStyle(0x273033, 1);
      this.audio?.playEffect("ui-focus");
    });
    button.on("pointerout", () => plate.setFillStyle(0x151d1f, 0.98));
    button.on("pointerup", callback, this);
    this.buttons.push(button);
  }

  private registerInput(): void {
    const k = this.input.keyboard;
    if (!k) throw new Error("Dungeon Escape requires keyboard input support.");
    k.on("keydown-ENTER", this.startGame, this);
    k.on("keydown-SPACE", this.startGame, this);
    k.on("keydown-H", this.openManual, this);
    k.on("keydown-S", this.openSettings, this);
    k.on("keydown-M", this.handleMuteDown, this);
    k.on("keyup-M", this.handleMuteUp, this);
    k.on("keydown-F", this.handleFullscreenDown, this);
    k.on("keyup-F", this.handleFullscreenUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUpInput, this);
  }

  private startGame(): void {
    if (this.hasStarted || this.manual || this.settings) return;
    this.hasStarted = true;
    this.buttons.forEach((button) => button.disableInteractive());
    this.audio?.unlock();
    this.audio?.playEffect("ui-confirm");
    this.scene.start(SCENE_KEYS.GAME);
  }
  private openManual(): void {
    if (this.manual || this.settings || this.hasStarted) return;
    this.audio?.unlock();
    this.audio?.playEffect("ui-confirm");
    this.manual = new FieldManualOverlay(
      this,
      this.presentation?.getSettings() ?? getPresentationRuntime(this).getSettings(),
      {
        close: () => {
          this.manual = undefined;
          this.audio?.playEffect("ui-back");
          announceGameState("Returned to the main menu.");
        },
        focus: () => this.audio?.playEffect("ui-focus"),
      },
    );
    announceGameState(
      "Field Manual opened. Four sections explain combat, escape, loot, and the three-floor run.",
    );
  }
  private openSettings(): void {
    if (this.manual || this.settings || this.hasStarted || !this.presentation) return;
    this.audio?.unlock();
    this.audio?.playEffect("ui-confirm");
    this.settings = new SettingsOverlay(this, this.presentation.getSettings(), {
      change: (key, value) => {
        this.presentation?.update(key, value);
        this.settings?.updateSettings(
          this.presentation?.getSettings() ?? this.presentation!.getSettings(),
        );
      },
      resetSettings: () => {
        this.presentation?.resetSettings();
        if (this.presentation) this.settings?.updateSettings(this.presentation.getSettings());
      },
      resetOnboarding: () => {
        this.presentation?.resetOnboarding();
        announceGameState("First-run onboarding reset.");
      },
      back: () => {
        this.settings = undefined;
        this.audio?.playEffect("ui-back");
        this.scene.restart();
      },
      focus: () => this.audio?.playEffect("ui-focus"),
    });
    announceGameState("Settings opened.");
  }
  private handleMuteDown(): void {
    if (this.muteHeld) return;
    this.muteHeld = true;
    this.toggleMute();
  }
  private handleMuteUp(): void {
    this.muteHeld = false;
  }
  private toggleMute(): void {
    if (!this.presentation) return;
    const muted = this.presentation.toggleMute();
    announceGameState(muted ? "Audio muted." : "Audio unmuted.");
  }
  private handleFullscreenDown(): void {
    if (this.fullscreenHeld) return;
    this.fullscreenHeld = true;
    void this.toggleFullscreen();
  }
  private handleFullscreenUp(): void {
    this.fullscreenHeld = false;
  }
  private async toggleFullscreen(): Promise<void> {
    this.audio?.unlock();
    const frame = document.querySelector<HTMLElement>(".game-frame") ?? undefined;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        announceGameState("Fullscreen exited.");
      } catch {
        announceGameState("Fullscreen could not be exited.");
      }
      return;
    }
    const entered = await requestGameFullscreen(frame);
    announceGameState(entered ? "Fullscreen entered." : "Fullscreen is unavailable.");
  }
  private cleanUpInput(): void {
    const k = this.input.keyboard;
    k?.off("keydown-ENTER", this.startGame, this);
    k?.off("keydown-SPACE", this.startGame, this);
    k?.off("keydown-H", this.openManual, this);
    k?.off("keydown-S", this.openSettings, this);
    k?.off("keydown-M", this.handleMuteDown, this);
    k?.off("keyup-M", this.handleMuteUp, this);
    k?.off("keydown-F", this.handleFullscreenDown, this);
    k?.off("keyup-F", this.handleFullscreenUp, this);
    this.buttons.forEach((button) => button.removeAllListeners());
    this.manual?.destroy();
    this.settings?.destroy();
  }
}
