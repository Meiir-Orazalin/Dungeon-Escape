import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { formatElapsedTime } from "../objective/timer";
import { formatCompactBuild } from "../run/hudFormat";
import type { FloorSummary } from "../run/types";

interface FloorClearedDetails {
  readonly summary: FloorSummary;
  readonly runElapsedMs: number;
}

interface FloorClearedCallbacks {
  readonly continueRun: () => void;
  readonly replayFloor: () => void;
  readonly newRun: () => void;
}

export class FloorClearedOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private selected = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: FloorClearedDetails,
    private readonly callbacks: FloorClearedCallbacks,
  ) {
    const summary = details.summary;
    this.container = scene.add
      .container(0, 0)
      .setName(GAME_OBJECT_NAMES.FLOOR_CLEARED_OVERLAY)
      .setScrollFactor(0)
      .setDepth(1_000);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020304, 0.8).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 430, 0x0a0e11, 0.985)
      .setStrokeStyle(2, 0xc79b5d, 0.78);
    const title = scene.add
      .text(GAME_WIDTH / 2, 82, "FLOOR CLEARED", {
        color: "#f1d39a",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "38px",
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, 129, `FLOOR ${summary.floorNumber} / 3  ·  ${summary.floorName}`, {
        color: "#8fa09f",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 1.7,
      })
      .setOrigin(0.5);
    const detailsText = scene.add
      .text(
        GAME_WIDTH / 2,
        224,
        `FLOOR TIME  ·  ${formatElapsedTime(summary.elapsedTimeMs)}     RUN TIME  ·  ${formatElapsedTime(details.runElapsedMs)}\nHEALTH  ·  ${summary.healthRemaining}     SHARDS THIS FLOOR  ·  ${summary.shardsCollected}     AVAILABLE  ·  ${summary.availableShards}\nCHESTS  ·  ${summary.chestsOpened} / ${summary.totalChests}     ENEMIES  ·  ${summary.enemiesDefeated} / ${summary.totalEnemies}\nRUNES THIS FLOOR  ·  ${summary.upgradesSelected.length}     BUILD  ·  ${formatCompactBuild(summary.globalSelectedUpgradeIds)}\n\nDESCENT RESTORES 1 HEALTH`,
        {
          align: "center",
          color: "#b7c1be",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineSpacing: 7,
        },
      )
      .setOrigin(0.5);
    this.container.add([veil, panel, title, subtitle, detailsText]);
    this.createButton(270, 400, "DESCEND DEEPER", GAME_OBJECT_NAMES.DESCEND_BUTTON, () =>
      this.activate("continue"),
    );
    this.createButton(480, 400, "REPLAY FLOOR", GAME_OBJECT_NAMES.REPLAY_FLOOR_BUTTON, () =>
      this.activate("replay"),
    );
    this.createButton(690, 400, "NEW RUN", GAME_OBJECT_NAMES.NEW_RUN_BUTTON, () =>
      this.activate("new"),
    );
    const help = scene.add
      .text(
        GAME_WIDTH / 2,
        463,
        "ENTER / SPACE  ·  DESCEND     R  ·  REPLAY FLOOR     N  ·  NEW RUN",
        {
          color: "#778486",
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5);
    this.container.add(help);
    scene.input.keyboard?.on("keydown-ENTER", this.continueRun, this);
    scene.input.keyboard?.on("keydown-SPACE", this.continueRun, this);
    scene.input.keyboard?.on("keydown-R", this.replayFloor, this);
    scene.input.keyboard?.on("keydown-N", this.newRun, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.input.keyboard?.off("keydown-ENTER", this.continueRun, this);
    this.scene.input.keyboard?.off("keydown-SPACE", this.continueRun, this);
    this.scene.input.keyboard?.off("keydown-R", this.replayFloor, this);
    this.scene.input.keyboard?.off("keydown-N", this.newRun, this);
    this.zones.forEach((zone) => {
      zone.removeAllListeners();
      if (zone.active) zone.destroy();
    });
    if (this.container.active) this.container.destroy(true);
  }

  private createButton(
    x: number,
    y: number,
    labelText: string,
    name: string,
    action: () => void,
  ): void {
    const plate = this.scene.add
      .rectangle(x, y, 190, 52, 0x172023, 1)
      .setStrokeStyle(1, 0xc49a5c, 0.7);
    const label = this.scene.add
      .text(x, y, labelText, {
        color: "#ebc985",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    const zone = this.scene.add
      .zone(x, y, 190, 52)
      .setName(name)
      .setScrollFactor(0)
      .setDepth(1_001)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => plate.setFillStyle(0x293638, 1).setStrokeStyle(2, 0xe4ba76, 0.95));
    zone.on("pointerout", () => plate.setFillStyle(0x172023, 1).setStrokeStyle(1, 0xc49a5c, 0.7));
    zone.on("pointerdown", () => plate.setScale(0.98));
    zone.on("pointerup", () => {
      plate.setScale(1);
      action();
    });
    this.zones.push(zone);
    this.container.add([plate, label]);
  }

  private continueRun(): void {
    this.activate("continue");
  }
  private replayFloor(): void {
    this.activate("replay");
  }
  private newRun(): void {
    this.activate("new");
  }

  private activate(action: "continue" | "replay" | "new"): void {
    if (this.selected) return;
    this.selected = true;
    this.zones.forEach((zone) => zone.disableInteractive());
    if (action === "continue") this.callbacks.continueRun();
    else if (action === "replay") this.callbacks.replayFloor();
    else this.callbacks.newRun();
  }
}
