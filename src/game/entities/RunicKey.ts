import Phaser from "phaser";

import { GAME_OBJECT_NAMES } from "../objective/config";
import type { WorldPoint } from "../dungeon/types";

export class RunicKey extends Phaser.GameObjects.Container {
  private readonly pulseTween: Phaser.Tweens.Tween;

  public constructor(scene: Phaser.Scene, position: WorldPoint) {
    super(scene, position.x, position.y);
    scene.add.existing(this);

    const shadow = scene.add.ellipse(0, 15, 38, 16, 0x050607, 0.56);
    const pedestal = scene.add.ellipse(0, 10, 31, 13, 0x504537, 0.96).setStrokeStyle(1, 0x8e7550);
    const halo = scene.add.circle(0, -2, 30, 0xe1a943, 0.09).setBlendMode(Phaser.BlendModes.ADD);
    const rune = scene.add.graphics();
    rune.fillStyle(0xf2c56c, 1);
    rune.beginPath();
    rune.moveTo(0, -18);
    rune.lineTo(7, -5);
    rune.lineTo(0, 8);
    rune.lineTo(-7, -5);
    rune.closePath();
    rune.fillPath();
    rune.fillStyle(0x704621, 1);
    rune.beginPath();
    rune.moveTo(0, -12);
    rune.lineTo(3, -5);
    rune.lineTo(0, 2);
    rune.lineTo(-3, -5);
    rune.closePath();
    rune.fillPath();
    rune.lineStyle(2, 0xffe5a4, 0.9);
    rune.lineBetween(-8, -5, 8, -5);
    rune.lineBetween(0, -18, 0, 8);
    rune.fillStyle(0xffe4a1, 1);
    rune.fillCircle(0, -5, 2.5);

    this.add([shadow, pedestal, halo, rune]);
    this.setName(GAME_OBJECT_NAMES.RUNIC_KEY);
    this.setData("objectiveTarget", "key");
    this.setDepth(4.6);

    this.pulseTween = scene.tweens.add({
      targets: [halo, rune],
      y: "-=4",
      scale: 1.08,
      alpha: 0.78,
      duration: 1_050,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  public collect(): void {
    if (!this.active) return;
    this.pulseTween.stop();
    this.pulseTween.remove();
    this.setActive(false).setVisible(false);
  }

  public override destroy(fromScene?: boolean): void {
    this.pulseTween?.stop();
    this.pulseTween?.remove();
    super.destroy(fromScene);
  }
}
