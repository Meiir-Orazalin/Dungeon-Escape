import Phaser from "phaser";

import type { WorldPoint } from "../dungeon/types";
import { GAME_OBJECT_NAMES } from "../objective/config";

export class AncientGate extends Phaser.GameObjects.Container {
  private readonly runeGraphics: Phaser.GameObjects.Graphics;
  private readonly core: Phaser.GameObjects.Arc;
  private readinessTween?: Phaser.Tweens.Tween;
  private reactionTween?: Phaser.Tweens.Tween;
  private ready = false;

  public constructor(scene: Phaser.Scene, position: WorldPoint) {
    super(scene, position.x, position.y);
    scene.add.existing(this);

    const shadow = scene.add.ellipse(0, 16, 78, 28, 0x030405, 0.62);
    const base = scene.add.ellipse(0, 12, 68, 27, 0x3c4140, 0.96).setStrokeStyle(2, 0x68706d);
    const outer = scene.add.circle(0, -5, 35, 0x171d1f, 0.96).setStrokeStyle(5, 0x4b5555, 1);
    const inner = scene.add.circle(0, -5, 26, 0x0c1012, 0.98).setStrokeStyle(2, 0x6a4a45, 0.9);
    this.core = scene.add.circle(0, -5, 18, 0x5b2524, 0.35);
    this.runeGraphics = scene.add.graphics();

    this.add([shadow, base, outer, inner, this.core, this.runeGraphics]);
    this.setName(GAME_OBJECT_NAMES.ANCIENT_GATE);
    this.setData("objectiveTarget", "gate");
    this.setDepth(4.4);
    this.redrawRunes();
  }

  public isReady(): boolean {
    return this.ready;
  }

  public setReady(ready: boolean): void {
    if (this.ready === ready) return;
    this.ready = ready;
    this.redrawRunes();
    this.core.setFillStyle(ready ? 0x4aa8a1 : 0x5b2524, ready ? 0.34 : 0.35);
    this.readinessTween?.stop();
    this.readinessTween?.remove();

    if (ready) {
      this.readinessTween = this.scene.tweens.add({
        targets: [this.core, this.runeGraphics],
        alpha: { from: 0.62, to: 1 },
        scale: { from: 0.94, to: 1.06 },
        duration: 980,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      this.core.setAlpha(1).setScale(1);
      this.runeGraphics.setAlpha(1).setScale(1);
    }
  }

  public playBlockedReaction(): void {
    this.reactionTween?.stop();
    this.reactionTween?.remove();
    this.reactionTween = this.scene.tweens.add({
      targets: [this.core, this.runeGraphics],
      alpha: 0.28,
      scale: 1.13,
      duration: 105,
      yoyo: true,
      repeat: 1,
      ease: "Quad.easeOut",
    });
  }

  public playCompletion(): void {
    this.readinessTween?.stop();
    this.readinessTween?.remove();
    this.reactionTween?.stop();
    this.reactionTween?.remove();
    this.scene.tweens.add({
      targets: [this.core, this.runeGraphics],
      alpha: 0.06,
      scale: 1.65,
      duration: 360,
      ease: "Cubic.easeOut",
    });
  }

  public override destroy(fromScene?: boolean): void {
    this.readinessTween?.stop();
    this.readinessTween?.remove();
    this.reactionTween?.stop();
    this.reactionTween?.remove();
    super.destroy(fromScene);
  }

  private redrawRunes(): void {
    const color = this.ready ? 0x8de0c8 : 0xb95650;
    this.runeGraphics.clear();
    this.runeGraphics.lineStyle(2, color, this.ready ? 0.92 : 0.76);
    this.runeGraphics.strokeCircle(0, -5, 28);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const innerX = Math.cos(angle) * 22;
      const innerY = -5 + Math.sin(angle) * 22;
      const outerX = Math.cos(angle) * 29;
      const outerY = -5 + Math.sin(angle) * 29;
      this.runeGraphics.lineBetween(innerX, innerY, outerX, outerY);
    }
    this.runeGraphics.fillStyle(color, this.ready ? 0.88 : 0.7);
    this.runeGraphics.beginPath();
    this.runeGraphics.moveTo(0, -14);
    this.runeGraphics.lineTo(5, -5);
    this.runeGraphics.lineTo(0, 4);
    this.runeGraphics.lineTo(-5, -5);
    this.runeGraphics.closePath();
    this.runeGraphics.fillPath();
  }
}
