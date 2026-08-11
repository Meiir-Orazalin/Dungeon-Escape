import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { formatElapsedTime } from "../objective/timer";

interface DefeatDetails {
  readonly seed: string;
  readonly elapsedTimeMs: number;
  readonly discoveredRooms: number;
  readonly totalRooms: number;
  readonly defeatedEnemies: number;
  readonly totalEnemies: number;
}

interface DefeatCallbacks {
  readonly replay: () => void;
  readonly newDungeon: () => void;
}

export class PlayerDefeatedOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly replayButton: Phaser.GameObjects.Zone;
  private readonly newDungeonButton: Phaser.GameObjects.Zone;
  private hasSelected = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: DefeatDetails,
    private readonly callbacks: DefeatCallbacks,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName(GAME_OBJECT_NAMES.DEFEAT_OVERLAY)
      .setScrollFactor(0)
      .setDepth(1_000);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x030304, 0.82).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 690, 400, 0x100b0c, 0.98)
      .setStrokeStyle(2, 0xa8544e, 0.72);
    const inner = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 672, 382, 0x000000, 0)
      .setStrokeStyle(1, 0x78686a, 0.3);
    const title = scene.add
      .text(GAME_WIDTH / 2, 126, "FALLEN IN THE CATACOMBS", {
        color: "#e4a39a",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "35px",
        fontStyle: "bold",
        stroke: "#050506",
        strokeThickness: 4,
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, 177, "THE DUNGEON CLAIMS ANOTHER SHADOW", {
        color: "#8f797b",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 2.3,
      })
      .setOrigin(0.5);
    const detailsText = scene.add
      .text(
        GAME_WIDTH / 2,
        248,
        `SEED  ·  ${details.seed}\nTIME  ·  ${formatElapsedTime(details.elapsedTimeMs)}\nROOMS DISCOVERED  ·  ${details.discoveredRooms} / ${details.totalRooms}\nENEMIES DEFEATED  ·  ${details.defeatedEnemies} / ${details.totalEnemies}`,
        {
          align: "center",
          color: "#b8aeb0",
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);
    this.container.add([veil, panel, inner, title, subtitle, detailsText]);
    this.replayButton = this.createButton(
      358,
      374,
      "REPLAY THIS SEED",
      GAME_OBJECT_NAMES.DEFEAT_REPLAY_BUTTON,
      () => this.activate("replay"),
    );
    this.newDungeonButton = this.createButton(
      602,
      374,
      "NEW DUNGEON",
      GAME_OBJECT_NAMES.DEFEAT_NEW_DUNGEON_BUTTON,
      () => this.activate("new"),
    );
    const instructions = scene.add
      .text(GAME_WIDTH / 2, 449, "R  ·  REPLAY     N / ENTER / SPACE  ·  NEW DUNGEON", {
        color: "#7f7072",
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
      .rectangle(x, y, 214, 55, 0x241719, 1)
      .setStrokeStyle(1, 0xbd675d, 0.74);
    const label = this.scene.add
      .text(x, y, text, {
        color: "#e8b1a7",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 1.2,
      })
      .setOrigin(0.5);
    this.container.add([plate, label]);
    const zone = this.scene.add
      .zone(x, y, 214, 55)
      .setName(name)
      .setScrollFactor(0)
      .setDepth(1_001)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => {
      plate.setFillStyle(0x382125, 1).setStrokeStyle(2, 0xe18b7c, 0.9);
      label.setColor("#ffe0d7");
    });
    zone.on("pointerout", () => {
      plate.setFillStyle(0x241719, 1).setStrokeStyle(1, 0xbd675d, 0.74);
      label.setColor("#e8b1a7");
    });
    zone.on("pointerdown", () => plate.setScale(0.98));
    zone.on("pointerup", () => {
      plate.setScale(1);
      callback();
    });
    return zone;
  }

  private handleReplay(): void {
    this.activate("replay");
  }

  private handleNewDungeon(): void {
    this.activate("new");
  }

  private activate(action: "replay" | "new"): void {
    if (this.hasSelected) return;
    this.hasSelected = true;
    this.replayButton.disableInteractive();
    this.newDungeonButton.disableInteractive();
    if (action === "replay") this.callbacks.replay();
    else this.callbacks.newDungeon();
  }
}
