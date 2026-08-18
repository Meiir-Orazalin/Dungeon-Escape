import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import type { PresentationSettings } from "../presentation/settings";

export const FIELD_MANUAL_SECTIONS = Object.freeze([
  Object.freeze({
    title: "MOVEMENT AND COMBAT",
    body: "WASD or Arrow Keys move. Space, J, or click attacks. Shift dashes. Enemies deal one health per accepted hit. Press Escape to pause safely.",
  }),
  Object.freeze({
    title: "THE ESCAPE",
    body: "Find the Runic Key, then reach the Ancient Gate and press E. Living enemies do not block escape, so every fight remains optional.",
  }),
  Object.freeze({
    title: "LOOT AND THE RUNEFORGE",
    body: "Treasure Chests and enemies yield Runic Shards. Vitality Flasks heal when injured. The Runeforge costs 6 then 8 shards; selected upgrades carry across floors.",
  }),
  Object.freeze({
    title: "THE THREE-FLOOR RUN",
    body: "Difficulty increases across three deterministic floors. Health, shards, and your build carry deeper. R replays the current checkpoint while active; terminal R replays the whole run. N creates a new run.",
  }),
]);

interface FieldManualCallbacks {
  readonly close: () => void;
  readonly focus?: () => void;
}

export class FieldManualOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly sectionTitle: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly page: Phaser.GameObjects.Text;
  private readonly previousZone: Phaser.GameObjects.Zone;
  private readonly nextZone: Phaser.GameObjects.Zone;
  private readonly closeZone: Phaser.GameObjects.Zone;
  private index = 0;
  private destroyed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    settings: PresentationSettings,
    private readonly callbacks: FieldManualCallbacks,
    onboarding = false,
  ) {
    const scale = settings.largeText ? 1.15 : 1;
    const stroke = settings.highContrast ? 3 : 1;
    this.container = scene.add
      .container(0, 0)
      .setName("field-manual-overlay")
      .setScrollFactor(0)
      .setDepth(980);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020405, 0.82).setOrigin(0);
    const panel = scene.add
      .rectangle(480, 270, 780, 438, 0x091013, 0.99)
      .setStrokeStyle(stroke, 0xd5aa68, 0.95);
    const eyebrow = scene.add
      .text(480, 76, onboarding ? "FIRST DESCENT BRIEFING" : "FIELD MANUAL", {
        color: "#d2a967",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(12 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.sectionTitle = scene.add
      .text(480, 137, "", {
        color: "#f0dfb8",
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(28 * scale)}px`,
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);
    this.body = scene.add
      .text(480, 252, "", {
        color: "#c2cdcb",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(16 * scale)}px`,
        align: "center",
        lineSpacing: 9,
        wordWrap: { width: settings.largeText ? 610 : 650 },
      })
      .setOrigin(0.5);
    this.page = scene.add
      .text(480, 393, "", {
        color: "#82c7ba",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(11 * scale)}px`,
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const previousLabel = scene.add
      .text(250, 443, "‹  PREVIOUS", {
        color: "#9aa7a6",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(12 * scale)}px`,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const nextLabel = scene.add
      .text(710, 443, "NEXT  ›", {
        color: "#f0c77e",
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(12 * scale)}px`,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const closeLabel = scene.add
      .text(
        480,
        480,
        onboarding
          ? "ENTER / SPACE  ·  CONTINUE     ESC  ·  SKIP"
          : "ENTER / SPACE  ·  NEXT     ESC  ·  BACK",
        {
          color: "#718082",
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(9 * scale)}px`,
          fontStyle: "bold",
          letterSpacing: 1.2,
        },
      )
      .setOrigin(0.5);
    this.previousZone = scene.add.zone(250, 443, 180, 46).setInteractive({ useHandCursor: true });
    this.nextZone = scene.add.zone(710, 443, 180, 46).setInteractive({ useHandCursor: true });
    this.closeZone = scene.add.zone(480, 480, 410, 38).setInteractive({ useHandCursor: true });
    this.previousZone.on("pointerup", this.previous, this);
    this.nextZone.on("pointerup", this.next, this);
    this.closeZone.on("pointerup", this.close, this);
    this.container.add([
      veil,
      panel,
      eyebrow,
      this.sectionTitle,
      this.body,
      this.page,
      previousLabel,
      nextLabel,
      closeLabel,
      this.previousZone,
      this.nextZone,
      this.closeZone,
    ]);
    this.render();
    this.registerInput();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public getSectionIndex(): number {
    return this.index;
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unregisterInput();
    this.previousZone.removeAllListeners();
    this.nextZone.removeAllListeners();
    this.closeZone.removeAllListeners();
    this.container.destroy(true);
  }

  private registerInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.on("keydown-LEFT", this.previous, this);
    keyboard?.on("keydown-UP", this.previous, this);
    keyboard?.on("keydown-RIGHT", this.next, this);
    keyboard?.on("keydown-DOWN", this.next, this);
    keyboard?.on("keydown-ENTER", this.advance, this);
    keyboard?.on("keydown-SPACE", this.advance, this);
    keyboard?.on("keydown-ESC", this.close, this);
  }

  private unregisterInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off("keydown-LEFT", this.previous, this);
    keyboard?.off("keydown-UP", this.previous, this);
    keyboard?.off("keydown-RIGHT", this.next, this);
    keyboard?.off("keydown-DOWN", this.next, this);
    keyboard?.off("keydown-ENTER", this.advance, this);
    keyboard?.off("keydown-SPACE", this.advance, this);
    keyboard?.off("keydown-ESC", this.close, this);
  }

  private previous(): void {
    this.index = (this.index + FIELD_MANUAL_SECTIONS.length - 1) % FIELD_MANUAL_SECTIONS.length;
    this.callbacks.focus?.();
    this.render();
  }

  private next(): void {
    this.index = (this.index + 1) % FIELD_MANUAL_SECTIONS.length;
    this.callbacks.focus?.();
    this.render();
  }

  private advance(): void {
    if (this.index === FIELD_MANUAL_SECTIONS.length - 1) this.close();
    else this.next();
  }

  private close(): void {
    if (this.destroyed) return;
    this.destroy();
    this.callbacks.close();
  }

  private render(): void {
    const section = FIELD_MANUAL_SECTIONS[this.index];
    if (!section) return;
    this.sectionTitle.setText(section.title);
    this.body.setText(section.body);
    this.page.setText(`${this.index + 1}  /  ${FIELD_MANUAL_SECTIONS.length}`);
  }
}
