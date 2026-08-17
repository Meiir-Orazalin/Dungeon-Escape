import Phaser from "phaser";

import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";

export class RunicShardPickup extends Phaser.GameObjects.Container {
  private readonly bob: Phaser.Tweens.Tween;

  public constructor(
    scene: Phaser.Scene,
    public readonly pickupId: string,
    public readonly sourceId: string,
    public readonly amount: number,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    const glow = scene.add.circle(0, 0, 13, 0x6ed9d0, 0.13);
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x183b3d, 1);
    graphics.fillTriangle(0, -11, 8, 2, 0, 11);
    graphics.fillTriangle(0, -11, -8, 2, 0, 11);
    graphics.lineStyle(2, 0x8af0df, 0.95);
    graphics.strokeTriangle(0, -11, 8, 2, 0, 11);
    graphics.strokeTriangle(0, -11, -8, 2, 0, 11);
    graphics.fillStyle(0xd7fff0, 1);
    graphics.fillCircle(0, 0, 2.2);
    this.add([glow, graphics]);
    if (amount > 1) {
      this.add(
        scene.add
          .text(11, -13, `${amount}`, {
            color: "#efffdc",
            fontFamily: "Arial, sans-serif",
            fontSize: "10px",
            fontStyle: "bold",
            stroke: "#071011",
            strokeThickness: 3,
          })
          .setOrigin(0.5),
      );
    }
    scene.add.existing(this);
    this.setName(`${LOOT_GAME_OBJECT_NAMES.PICKUP_PREFIX}${pickupId}`).setDepth(5.2);
    this.bob = scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  public freeze(): void {
    this.bob.pause();
  }

  public override destroy(fromScene?: boolean): void {
    this.bob.destroy();
    super.destroy(fromScene);
  }
}
