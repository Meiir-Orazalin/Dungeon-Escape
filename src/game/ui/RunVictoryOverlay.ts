import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { formatElapsedTime } from "../objective/timer";
import { formatCompactBuild } from "../run/hudFormat";
import type { FloorSummary, RunStatistics } from "../run/types";
import type { UpgradeId } from "../upgrades/types";

interface VictoryDetails {
  readonly runSeed: string;
  readonly runElapsedMs: number;
  readonly summaries: readonly FloorSummary[];
  readonly statistics: RunStatistics;
  readonly finalHealth: number;
  readonly availableShards: number;
  readonly selectedUpgradeIds: readonly UpgradeId[];
}

export class RunVictoryOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private selected = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: VictoryDetails,
    private readonly callbacks: Readonly<{ replay: () => void; newRun: () => void }>,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName(GAME_OBJECT_NAMES.RUN_VICTORY_OVERLAY)
      .setScrollFactor(0)
      .setDepth(1_000);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020304, 0.84).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 780, 440, 0x090e11, 0.99)
      .setStrokeStyle(2, 0xcaa05f, 0.82);
    const title = scene.add
      .text(GAME_WIDTH / 2, 72, "DUNGEON CONQUERED", {
        color: "#f3d79c",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "38px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const times = details.summaries
      .map((summary) => `F${summary.floorNumber} ${formatElapsedTime(summary.elapsedTimeMs)}`)
      .join("     ");
    const text = scene.add
      .text(
        GAME_WIDTH / 2,
        230,
        `RUN SEED  ·  ${details.runSeed}\nRUN TIME  ·  ${formatElapsedTime(details.runElapsedMs)}     ${times}\nHEALTH  ·  ${details.finalHealth}     FLOORS  ·  3 / 3\nENEMIES  ·  ${details.statistics.enemiesDefeated}     ROOMS  ·  ${details.statistics.roomsDiscovered}     CHESTS  ·  ${details.statistics.chestsOpened}\nSHARDS COLLECTED  ·  ${details.statistics.shardsCollected}     AVAILABLE  ·  ${details.availableShards}     FLASKS  ·  ${details.statistics.flasksConsumed}\nUPGRADES  ·  ${details.selectedUpgradeIds.length} / 6\nRUN BUILD  ·  ${formatCompactBuild(details.selectedUpgradeIds)}`,
        {
          align: "center",
          color: "#bac4c1",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineSpacing: 7,
          wordWrap: { width: 720 },
        },
      )
      .setOrigin(0.5);
    this.container.add([veil, panel, title, text]);
    this.createButton(365, 405, "REPLAY THIS RUN", GAME_OBJECT_NAMES.REPLAY_RUN_BUTTON, () =>
      this.activate("replay"),
    );
    this.createButton(595, 405, "NEW RUN", GAME_OBJECT_NAMES.NEW_RUN_BUTTON, () =>
      this.activate("new"),
    );
    const help = scene.add
      .text(GAME_WIDTH / 2, 468, "R  ·  REPLAY THIS RUN     N / ENTER / SPACE  ·  NEW RUN", {
        color: "#748184",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        letterSpacing: 1.2,
      })
      .setOrigin(0.5);
    this.container.add(help);
    scene.input.keyboard?.on("keydown-R", this.replay, this);
    scene.input.keyboard?.on("keydown-N", this.newRun, this);
    scene.input.keyboard?.on("keydown-ENTER", this.newRun, this);
    scene.input.keyboard?.on("keydown-SPACE", this.newRun, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.input.keyboard?.off("keydown-R", this.replay, this);
    this.scene.input.keyboard?.off("keydown-N", this.newRun, this);
    this.scene.input.keyboard?.off("keydown-ENTER", this.newRun, this);
    this.scene.input.keyboard?.off("keydown-SPACE", this.newRun, this);
    this.zones.forEach((zone) => {
      zone.removeAllListeners();
      if (zone.active) zone.destroy();
    });
    if (this.container.active) this.container.destroy(true);
  }

  private createButton(x: number, y: number, text: string, name: string, action: () => void): void {
    const plate = this.scene.add
      .rectangle(x, y, 210, 54, 0x172023, 1)
      .setStrokeStyle(1, 0xc49a5c, 0.72);
    const label = this.scene.add
      .text(x, y, text, {
        color: "#edcd8d",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const zone = this.scene.add
      .zone(x, y, 210, 54)
      .setName(name)
      .setScrollFactor(0)
      .setDepth(1_001)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => plate.setFillStyle(0x293638, 1));
    zone.on("pointerout", () => plate.setFillStyle(0x172023, 1));
    zone.on("pointerup", action);
    this.zones.push(zone);
    this.container.add([plate, label]);
  }

  private replay(): void {
    this.activate("replay");
  }
  private newRun(): void {
    this.activate("new");
  }
  private activate(action: "replay" | "new"): void {
    if (this.selected) return;
    this.selected = true;
    this.zones.forEach((zone) => zone.disableInteractive());
    if (action === "replay") this.callbacks.replay();
    else this.callbacks.newRun();
  }
}
