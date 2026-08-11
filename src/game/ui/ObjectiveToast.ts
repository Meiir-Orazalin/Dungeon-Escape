import type Phaser from "phaser";

import { GAME_WIDTH } from "../constants";

export class ObjectiveToast {
  private readonly container: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private tween?: Phaser.Tweens.Tween;

  public constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add
      .container(GAME_WIDTH / 2, 166)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);
    const plate = scene.add
      .rectangle(0, 0, 490, 72, 0x0a0e10, 0.94)
      .setStrokeStyle(1, 0xb98d51, 0.62);
    this.title = scene.add
      .text(0, -13, "", {
        color: "#e8c47e",
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "17px",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    this.detail = scene.add
      .text(0, 14, "", {
        color: "#aab4b2",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
      })
      .setOrigin(0.5);
    this.container.add([plate, this.title, this.detail]);
  }

  public show(title: string, detail: string): void {
    this.tween?.stop();
    this.tween?.remove();
    this.title.setText(title);
    this.detail.setText(detail);
    this.container.setVisible(true).setAlpha(1).setY(166);
    this.tween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 152,
      delay: 1_450,
      duration: 420,
      ease: "Quad.easeIn",
      onComplete: () => this.container.setVisible(false),
    });
  }
}
