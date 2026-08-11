import type Phaser from "phaser";

import type { DungeonLayout } from "../dungeon/types";

export class DungeonHud {
  private readonly discoveredText: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, layout: DungeonLayout) {
    const container = scene.add.container(22, 20).setScrollFactor(0).setDepth(50);
    const plate = scene.add
      .rectangle(0, 0, 390, 82, 0x080b0d, 0.86)
      .setOrigin(0)
      .setStrokeStyle(1, 0xb88c52, 0.42);
    const title = scene.add.text(16, 11, "THE SHIFTING CATACOMBS", {
      color: "#d1b47e",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      letterSpacing: 1.5,
    });
    const seed = scene.add.text(16, 31, `SEED  ·  ${layout.seed}`, {
      color: "#929e9f",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      letterSpacing: 0.7,
    });
    const controls = scene.add.text(16, 52, "R  ·  RETURN     N  ·  NEW DUNGEON", {
      color: "#6f7c7e",
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      letterSpacing: 0.9,
    });
    this.discoveredText = scene.add
      .text(374, 52, `1 / ${layout.rooms.length} ROOMS`, {
        color: "#a88a5e",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        letterSpacing: 0.7,
      })
      .setOrigin(1, 0);
    container.add([plate, title, seed, controls, this.discoveredText]);
  }

  public updateDiscovered(discovered: number, total: number): void {
    this.discoveredText.setText(`${discovered} / ${total} ROOMS`);
  }
}
