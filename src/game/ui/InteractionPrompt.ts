import type Phaser from "phaser";

import { GAME_WIDTH } from "../constants";
import { OBJECTIVE_CONFIG } from "../objective/config";

export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private currentText: string | null = null;

  public constructor(scene: Phaser.Scene) {
    this.container = scene.add
      .container(GAME_WIDTH / 2, OBJECTIVE_CONFIG.promptY)
      .setScrollFactor(0)
      .setDepth(80)
      .setVisible(false);
    const plate = scene.add
      .rectangle(0, 0, 350, 42, 0x090c0e, 0.92)
      .setStrokeStyle(1, 0xc2985c, 0.64);
    this.label = scene.add
      .text(0, 0, "", {
        color: "#f2d39b",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);
    this.container.add([plate, this.label]);
  }

  public setText(text: string | null): void {
    if (text === this.currentText) return;
    this.currentText = text;
    if (!text) {
      this.container.setVisible(false);
      return;
    }
    this.label.setText(text);
    this.container.setVisible(true);
  }

  public getText(): string | null {
    return this.currentText;
  }
}
