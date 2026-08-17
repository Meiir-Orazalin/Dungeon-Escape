import Phaser from "phaser";

import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";

export class VitalityFlask extends Phaser.GameObjects.Container {
  private readonly bob: Phaser.Tweens.Tween;

  public constructor(
    scene: Phaser.Scene,
    public readonly pickupId: string,
    public readonly sourceId: string,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x08120d, 0.45);
    graphics.fillEllipse(0, 12, 25, 8);
    graphics.fillStyle(0x39443d, 1);
    graphics.fillRoundedRect(-5, -14, 10, 7, 2);
    graphics.fillStyle(0x8fd69a, 0.9);
    graphics.fillRoundedRect(-10, -8, 20, 22, 6);
    graphics.fillStyle(0x3f9e68, 1);
    graphics.fillRoundedRect(-7, -2, 14, 13, 4);
    graphics.lineStyle(2, 0xc2f1b3, 0.9);
    graphics.strokeRoundedRect(-10, -8, 20, 22, 6);
    graphics.fillStyle(0xe3ffd2, 1);
    graphics.fillCircle(-3, 1, 2.3);
    this.add(graphics);
    scene.add.existing(this);
    this.setName(`${LOOT_GAME_OBJECT_NAMES.PICKUP_PREFIX}${pickupId}`).setDepth(5.2);
    this.bob = scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 840,
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
