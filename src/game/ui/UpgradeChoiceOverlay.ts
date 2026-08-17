import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";
import { getUpgrade } from "../upgrades/catalog";
import type { UpgradeId, UpgradeOffer } from "../upgrades/types";

interface UpgradeChoiceCallbacks {
  readonly select: (upgradeId: UpgradeId) => void;
  readonly close: () => void;
}

interface CardRuntime {
  readonly id: UpgradeId;
  readonly plate: Phaser.GameObjects.Rectangle;
  readonly title: Phaser.GameObjects.Text;
  readonly zone: Phaser.GameObjects.Zone;
}

export class UpgradeChoiceOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly cards: readonly CardRuntime[];
  private readonly closeZone: Phaser.GameObjects.Zone;
  private highlightedIndex = 0;
  private closed = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    offer: UpgradeOffer,
    availableShards: number,
    cost: number,
    private readonly callbacks: UpgradeChoiceCallbacks,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName(LOOT_GAME_OBJECT_NAMES.UPGRADE_OVERLAY)
      .setScrollFactor(0)
      .setDepth(950);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020405, 0.76).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 850, 430, 0x0a1012, 0.985)
      .setStrokeStyle(2, 0xd19e55, 0.78);
    const inner = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 830, 410, 0x000000, 0)
      .setStrokeStyle(1, 0x70b8ad, 0.2);
    const title = scene.add
      .text(GAME_WIDTH / 2, 76, "RUNEFORGE", {
        color: "#f0cf8a",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "35px",
        fontStyle: "bold",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const resources = scene.add
      .text(GAME_WIDTH / 2, 116, `RUNIC SHARDS  ·  ${availableShards}     COST  ·  ${cost}`, {
        color: "#7dd6c8",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 1.6,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, 142, "CHOOSE ONE RUNE FOR THIS RUN", {
        color: "#77888a",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        letterSpacing: 2.2,
      })
      .setOrigin(0.5);
    this.container.add([veil, panel, inner, title, resources, subtitle]);

    this.cards = Object.freeze(
      offer.upgradeIds.map((id, index) => this.createCard(id, index, 205 + index * 275)),
    );
    const instructions = scene.add
      .text(
        GAME_WIDTH / 2,
        454,
        "ARROWS  ·  HIGHLIGHT     1 / 2 / 3  ·  CHOOSE     ENTER  ·  CONFIRM     ESC  ·  LEAVE",
        {
          color: "#859294",
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          letterSpacing: 0.95,
        },
      )
      .setOrigin(0.5);
    const closeLabel = scene.add
      .text(868, 70, "×", {
        color: "#9fa9a7",
        fontFamily: "Arial, sans-serif",
        fontSize: "27px",
      })
      .setOrigin(0.5);
    this.closeZone = scene.add
      .zone(868, 70, 42, 42)
      .setName(LOOT_GAME_OBJECT_NAMES.UPGRADE_CLOSE)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.closeZone.on("pointerover", () => closeLabel.setColor("#ffe0a1"));
    this.closeZone.on("pointerout", () => closeLabel.setColor("#9fa9a7"));
    this.closeZone.on("pointerup", this.close, this);
    this.container.add([instructions, closeLabel, this.closeZone]);
    this.renderHighlight();
    this.registerInput();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public getOfferIds(): readonly UpgradeId[] {
    return Object.freeze(this.cards.map((card) => card.id));
  }

  public destroy(): void {
    if (this.closed) return;
    this.closed = true;
    this.unregisterInput();
    this.cards.forEach((card) => card.zone.removeAllListeners());
    this.closeZone.removeAllListeners();
    this.container.destroy(true);
  }

  private createCard(id: UpgradeId, index: number, x: number): CardRuntime {
    const definition = getUpgrade(id);
    const plate = this.scene.add
      .rectangle(x, 285, 245, 245, 0x121a1c, 1)
      .setStrokeStyle(1, 0x607173, 0.7);
    const number = this.scene.add
      .text(x - 101, 178, `${index + 1}`, {
        color: "#8acdc1",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const rune = this.scene.add.graphics();
    rune.lineStyle(3, index === 0 ? 0xdfaa55 : index === 1 ? 0x7fc8ba : 0xb788c2, 0.9);
    rune.strokeCircle(x, 220, 25);
    rune.beginPath();
    rune.moveTo(x, 198);
    rune.lineTo(x + 15, 220);
    rune.lineTo(x, 242);
    rune.lineTo(x - 15, 220);
    rune.closePath();
    rune.strokePath();
    const title = this.scene.add
      .text(x, 264, definition.name, {
        align: "center",
        color: "#e7c77f",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        letterSpacing: 1.1,
      })
      .setOrigin(0.5);
    const description = this.scene.add
      .text(x, 310, definition.description, {
        align: "center",
        color: "#aeb9b7",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        wordWrap: { width: 205 },
      })
      .setOrigin(0.5);
    const effect = this.scene.add
      .text(x, 371, definition.effectSummary, {
        align: "center",
        color: "#79cbbb",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        wordWrap: { width: 210 },
      })
      .setOrigin(0.5);
    const zone = this.scene.add
      .zone(x, 285, 245, 245)
      .setName(`${LOOT_GAME_OBJECT_NAMES.UPGRADE_CARD_PREFIX}${id}`)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => {
      this.highlightedIndex = index;
      this.renderHighlight();
    });
    zone.on("pointerdown", () => plate.setScale(0.985));
    zone.on("pointerup", () => {
      plate.setScale(1);
      this.select(index);
    });
    this.container.add([plate, number, rune, title, description, effect, zone]);
    return Object.freeze({ id, plate, title, zone });
  }

  private registerInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.on("keydown-LEFT", this.previous, this);
    keyboard?.on("keydown-UP", this.previous, this);
    keyboard?.on("keydown-RIGHT", this.next, this);
    keyboard?.on("keydown-DOWN", this.next, this);
    keyboard?.on("keydown-ONE", this.selectFirst, this);
    keyboard?.on("keydown-TWO", this.selectSecond, this);
    keyboard?.on("keydown-THREE", this.selectThird, this);
    keyboard?.on("keydown-ENTER", this.confirm, this);
    keyboard?.on("keydown-ESC", this.close, this);
  }

  private unregisterInput(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off("keydown-LEFT", this.previous, this);
    keyboard?.off("keydown-UP", this.previous, this);
    keyboard?.off("keydown-RIGHT", this.next, this);
    keyboard?.off("keydown-DOWN", this.next, this);
    keyboard?.off("keydown-ONE", this.selectFirst, this);
    keyboard?.off("keydown-TWO", this.selectSecond, this);
    keyboard?.off("keydown-THREE", this.selectThird, this);
    keyboard?.off("keydown-ENTER", this.confirm, this);
    keyboard?.off("keydown-ESC", this.close, this);
  }

  private previous(): void {
    this.highlightedIndex = (this.highlightedIndex + this.cards.length - 1) % this.cards.length;
    this.renderHighlight();
  }

  private next(): void {
    this.highlightedIndex = (this.highlightedIndex + 1) % this.cards.length;
    this.renderHighlight();
  }

  private selectFirst(): void {
    this.select(0);
  }

  private selectSecond(): void {
    this.select(1);
  }

  private selectThird(): void {
    this.select(2);
  }

  private confirm(): void {
    this.select(this.highlightedIndex);
  }

  private select(index: number): void {
    if (this.closed) return;
    const id = this.cards[index]?.id;
    if (!id) return;
    this.closed = true;
    this.unregisterInput();
    this.callbacks.select(id);
    this.container.destroy(true);
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.unregisterInput();
    this.callbacks.close();
    this.container.destroy(true);
  }

  private renderHighlight(): void {
    this.cards.forEach((card, index) => {
      const highlighted = index === this.highlightedIndex;
      card.plate
        .setFillStyle(highlighted ? 0x1d2a2b : 0x121a1c, 1)
        .setStrokeStyle(
          highlighted ? 2 : 1,
          highlighted ? 0xe0b15f : 0x607173,
          highlighted ? 1 : 0.7,
        );
      card.title.setColor(highlighted ? "#ffe3a4" : "#e7c77f");
    });
  }
}
