import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { formatElapsedTime } from "../objective/timer";

interface CompletionDetails {
  readonly seed: string;
  readonly completionTimeMs: number;
  readonly discoveredRooms: number;
  readonly totalRooms: number;
}

interface CompletionCallbacks {
  readonly replay: () => void;
  readonly newDungeon: () => void;
}

export class FloorCompleteOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly replayButton: Phaser.GameObjects.Zone;
  private readonly newDungeonButton: Phaser.GameObjects.Zone;
  private hasSelected = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: CompletionDetails,
    private readonly callbacks: CompletionCallbacks,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName(GAME_OBJECT_NAMES.COMPLETION_OVERLAY)
      .setScrollFactor(0)
      .setDepth(1_000);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x030507, 0.78).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 690, 400, 0x0b1013, 0.98)
      .setStrokeStyle(2, 0xc39a5c, 0.7);
    const innerLine = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 672, 382, 0x000000, 0)
      .setStrokeStyle(1, 0x788587, 0.24);
    const title = scene.add
      .text(GAME_WIDTH / 2, 128, "DUNGEON ESCAPED", {
        color: "#f2d49b",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "42px",
        fontStyle: "bold",
        stroke: "#050708",
        strokeThickness: 4,
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, 177, "THE ANCIENT GATE ANSWERS THE RUNE", {
        color: "#7f9392",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 2.5,
      })
      .setOrigin(0.5);
    const detailsText = scene.add
      .text(
        GAME_WIDTH / 2,
        246,
        `SEED  ·  ${details.seed}\nTIME  ·  ${formatElapsedTime(details.completionTimeMs)}\nROOMS DISCOVERED  ·  ${details.discoveredRooms} / ${details.totalRooms}`,
        {
          align: "center",
          color: "#b6c0bd",
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    this.container.add([veil, panel, innerLine, title, subtitle, detailsText]);
    this.replayButton = this.createButton(
      358,
      374,
      "REPLAY THIS SEED",
      GAME_OBJECT_NAMES.REPLAY_BUTTON,
      () => this.activate("replay"),
    );
    this.newDungeonButton = this.createButton(
      602,
      374,
      "NEW DUNGEON",
      GAME_OBJECT_NAMES.NEW_DUNGEON_BUTTON,
      () => this.activate("new"),
    );
    const instructions = scene.add
      .text(GAME_WIDTH / 2, 449, "R  ·  REPLAY     N / ENTER / SPACE  ·  NEW DUNGEON", {
        color: "#707e80",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        letterSpacing: 1.4,
      })
      .setOrigin(0.5);
    this.container.add(instructions);

    scene.input.keyboard?.on("keydown-R", this.handleReplay, this);
    scene.input.keyboard?.on("keydown-N", this.handleNewDungeon, this);
    scene.input.keyboard?.on("keydown-ENTER", this.handleNewDungeon, this);
    scene.input.keyboard?.on("keydown-SPACE", this.handleNewDungeon, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public destroy(): void {
    this.scene.input.keyboard?.off("keydown-R", this.handleReplay, this);
    this.scene.input.keyboard?.off("keydown-N", this.handleNewDungeon, this);
    this.scene.input.keyboard?.off("keydown-ENTER", this.handleNewDungeon, this);
    this.scene.input.keyboard?.off("keydown-SPACE", this.handleNewDungeon, this);
    this.replayButton.removeAllListeners();
    this.newDungeonButton.removeAllListeners();
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    name: string,
    callback: () => void,
  ): Phaser.GameObjects.Zone {
    const plate = this.scene.add
      .rectangle(x, y, 214, 55, 0x172023, 1)
      .setStrokeStyle(1, 0xc49a5c, 0.68);
    const label = this.scene.add
      .text(x, y, text, {
        color: "#ebc985",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 1.2,
      })
      .setOrigin(0.5);
    this.container.add([plate, label]);
    const hitZone = this.scene.add
      .zone(x, y, 214, 55)
      .setName(name)
      .setScrollFactor(0)
      .setDepth(1_001)
      .setInteractive({ useHandCursor: true });
    hitZone.on("pointerover", () => {
      plate.setFillStyle(0x293638, 1).setStrokeStyle(2, 0xe4ba76, 0.95);
      label.setColor("#ffe2a6");
    });
    hitZone.on("pointerout", () => {
      plate.setFillStyle(0x172023, 1).setStrokeStyle(1, 0xc49a5c, 0.68);
      label.setColor("#ebc985");
    });
    hitZone.on("pointerdown", () => {
      plate.setFillStyle(0x3a4544, 1);
      callback();
    });
    return hitZone;
  }

  private handleReplay(): void {
    this.activate("replay");
  }

  private handleNewDungeon(): void {
    this.activate("new");
  }

  private activate(selection: "replay" | "new"): void {
    if (this.hasSelected) return;
    this.hasSelected = true;
    this.replayButton.disableInteractive();
    this.newDungeonButton.disableInteractive();
    if (selection === "replay") this.callbacks.replay();
    else this.callbacks.newDungeon();
  }
}
