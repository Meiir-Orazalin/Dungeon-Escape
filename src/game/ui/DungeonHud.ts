import type Phaser from "phaser";

import type { DungeonLayout } from "../dungeon/types";
import { formatElapsedTime } from "../objective/timer";
import type { EscapeObjectiveState } from "../objective/types";

export class DungeonHud {
  private readonly discoveredText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private displayedSecond = -1;

  public constructor(scene: Phaser.Scene, layout: DungeonLayout) {
    const container = scene.add.container(22, 20).setScrollFactor(0).setDepth(50);
    const plate = scene.add
      .rectangle(0, 0, 650, 110, 0x080b0d, 0.86)
      .setOrigin(0)
      .setStrokeStyle(1, 0xb88c52, 0.42);
    const title = scene.add.text(16, 11, "THE SHIFTING CATACOMBS", {
      color: "#d1b47e",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      letterSpacing: 1.5,
    });
    this.timerText = scene.add
      .text(632, 11, "TIME  ·  00:00", {
        color: "#d1b47e",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 1.1,
      })
      .setOrigin(1, 0);
    const seed = scene.add.text(16, 31, `SEED  ·  ${layout.seed}`, {
      color: "#929e9f",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      letterSpacing: 0.7,
    });
    this.objectiveText = scene.add.text(16, 50, "OBJECTIVE  ·  FIND THE RUNIC KEY", {
      color: "#e1bd79",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    this.keyText = scene.add.text(16, 70, "KEY  ·  MISSING", {
      color: "#9b7770",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      letterSpacing: 0.8,
    });
    const controls = scene.add.text(16, 90, "E  ·  INTERACT     R  ·  RESTART     N  ·  NEW", {
      color: "#6f7c7e",
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      letterSpacing: 0.9,
    });
    this.discoveredText = scene.add
      .text(632, 90, `1 / ${layout.rooms.length} ROOMS`, {
        color: "#a88a5e",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        letterSpacing: 0.7,
      })
      .setOrigin(1, 0);
    container.add([
      plate,
      title,
      this.timerText,
      seed,
      this.objectiveText,
      this.keyText,
      controls,
      this.discoveredText,
    ]);
  }

  public updateDiscovered(discovered: number, total: number): void {
    this.discoveredText.setText(`${discovered} / ${total} ROOMS`);
  }

  public updateObjective(state: EscapeObjectiveState): void {
    const objective =
      state.status === "seeking-key"
        ? "OBJECTIVE  ·  FIND THE RUNIC KEY"
        : state.status === "key-collected"
          ? "OBJECTIVE  ·  REACH THE ANCIENT GATE"
          : "OBJECTIVE  ·  ESCAPED";
    this.objectiveText.setText(objective);
    this.keyText
      .setText(state.status === "seeking-key" ? "KEY  ·  MISSING" : "KEY  ·  ACQUIRED")
      .setColor(state.status === "seeking-key" ? "#9b7770" : "#8fd0b8");
  }

  public updateTimer(elapsedTimeMs: number): void {
    const displayedSecond = Math.floor(Math.max(0, elapsedTimeMs) / 1_000);
    if (displayedSecond === this.displayedSecond) return;
    this.displayedSecond = displayedSecond;
    this.timerText.setText(`TIME  ·  ${formatElapsedTime(elapsedTimeMs)}`);
  }
}
