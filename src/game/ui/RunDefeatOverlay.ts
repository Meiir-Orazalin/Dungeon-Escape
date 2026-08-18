import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { formatElapsedTime } from "../objective/timer";
import { formatCompactBuild } from "../run/hudFormat";
import type { CurrentFloorStatistics, FloorNumber, RunStatistics } from "../run/types";
import type { UpgradeId } from "../upgrades/types";

interface DefeatDetails {
  readonly runSeed: string;
  readonly floorNumber: FloorNumber;
  readonly floorName: string;
  readonly runElapsedMs: number;
  readonly floorElapsedMs: number;
  readonly completedFloors: number;
  readonly cumulative: RunStatistics;
  readonly current: CurrentFloorStatistics;
  readonly availableShards: number;
  readonly selectedUpgradeIds: readonly UpgradeId[];
}

export class RunDefeatOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private selected = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    details: DefeatDetails,
    private readonly callbacks: Readonly<{ replay: () => void; newRun: () => void }>,
  ) {
    this.container = scene.add
      .container(0, 0)
      .setName(GAME_OBJECT_NAMES.RUN_DEFEAT_OVERLAY)
      .setScrollFactor(0)
      .setDepth(1_000);
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x040203, 0.86).setOrigin(0);
    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 780, 440, 0x110a0c, 0.99)
      .setStrokeStyle(2, 0xb35d56, 0.8);
    const title = scene.add
      .text(GAME_WIDTH / 2, 72, "FALLEN IN THE DEPTHS", {
        color: "#e7aaa1",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "37px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    const enemies = details.cumulative.enemiesDefeated + details.current.enemiesDefeated;
    const rooms = details.cumulative.roomsDiscovered + details.current.roomsDiscovered;
    const chests = details.cumulative.chestsOpened + details.current.chestsOpened;
    const shards = details.cumulative.shardsCollected + details.current.shardsCollected;
    const flasks = details.cumulative.flasksConsumed + details.current.flasksConsumed;
    const text = scene.add
      .text(
        GAME_WIDTH / 2,
        230,
        `RUN SEED  ·  ${details.runSeed}\nFLOOR REACHED  ·  ${details.floorNumber} / 3  ·  ${details.floorName}\nRUN TIME  ·  ${formatElapsedTime(details.runElapsedMs)}     FLOOR TIME  ·  ${formatElapsedTime(details.floorElapsedMs)}\nFLOORS COMPLETED  ·  ${details.completedFloors}\nENEMIES  ·  ${enemies}     ROOMS  ·  ${rooms}     CHESTS  ·  ${chests}\nSHARDS COLLECTED  ·  ${shards}     AVAILABLE  ·  ${details.availableShards}     FLASKS  ·  ${flasks}\nUPGRADES  ·  ${details.selectedUpgradeIds.length} / 6\nRUN BUILD  ·  ${formatCompactBuild(details.selectedUpgradeIds)}`,
        {
          align: "center",
          color: "#c1b5b7",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineSpacing: 6,
          wordWrap: { width: 720 },
        },
      )
      .setOrigin(0.5);
    this.container.add([veil, panel, title, text]);
    this.createButton(365, 410, "REPLAY THIS RUN", GAME_OBJECT_NAMES.REPLAY_RUN_BUTTON, () =>
      this.activate("replay"),
    );
    this.createButton(595, 410, "NEW RUN", GAME_OBJECT_NAMES.NEW_RUN_BUTTON, () =>
      this.activate("new"),
    );
    const help = scene.add
      .text(GAME_WIDTH / 2, 470, "R  ·  REPLAY THIS RUN     N / ENTER / SPACE  ·  NEW RUN", {
        color: "#817275",
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
      .rectangle(x, y, 210, 54, 0x241719, 1)
      .setStrokeStyle(1, 0xbd675d, 0.74);
    const label = this.scene.add
      .text(x, y, text, {
        color: "#edb8af",
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
    zone.on("pointerover", () => plate.setFillStyle(0x382125, 1));
    zone.on("pointerout", () => plate.setFillStyle(0x241719, 1));
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
