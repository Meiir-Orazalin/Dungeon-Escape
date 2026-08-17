import Phaser from "phaser";

import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";
import type { ForgeMarkerState } from "../loot/minimapLoot";
import type { ForgePlan } from "../loot/types";

export class Runeforge extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Arc;
  private forgeState: ForgeMarkerState = "dormant";
  private readonly pulse: Phaser.Tweens.Tween;

  public constructor(
    scene: Phaser.Scene,
    public readonly plan: ForgePlan,
  ) {
    super(scene, plan.position.x, plan.position.y);
    this.glow = scene.add.circle(0, 0, 29, 0xd89445, 0.08);
    this.graphics = scene.add.graphics();
    this.add([this.glow, this.graphics]);
    scene.add.existing(this);
    this.setName(LOOT_GAME_OBJECT_NAMES.FORGE).setDepth(4.7);
    this.pulse = scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.06, to: 0.18 },
      scale: { from: 0.92, to: 1.08 },
      duration: 950,
      yoyo: true,
      repeat: -1,
    });
    this.draw();
  }

  public setForgeState(state: ForgeMarkerState): void {
    if (state === this.forgeState) return;
    this.forgeState = state;
    this.pulse[state === "ready" ? "resume" : "pause"]();
    this.glow.setScale(1).setAlpha(state === "ready" ? 0.16 : 0.05);
    this.draw();
  }

  public getForgeState(): ForgeMarkerState {
    return this.forgeState;
  }

  public freeze(): void {
    this.pulse.pause();
  }

  public override destroy(fromScene?: boolean): void {
    this.pulse.destroy();
    super.destroy(fromScene);
  }

  private draw(): void {
    const color =
      this.forgeState === "ready"
        ? 0xf2b955
        : this.forgeState === "exhausted"
          ? 0x586264
          : 0x8d663c;
    this.graphics.clear();
    this.graphics.fillStyle(0x050708, 0.48);
    this.graphics.fillEllipse(0, 19, 58, 16);
    this.graphics.fillStyle(0x252d2f, 1);
    this.graphics.fillRoundedRect(-26, 7, 52, 17, 4);
    this.graphics.lineStyle(2, 0x596466, 0.9);
    this.graphics.strokeRoundedRect(-26, 7, 52, 17, 4);
    this.graphics.fillStyle(0x121719, 1);
    this.graphics.fillCircle(0, -2, 22);
    this.graphics.lineStyle(3, color, this.forgeState === "exhausted" ? 0.45 : 0.95);
    this.graphics.strokeCircle(0, -2, 18);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -17);
    this.graphics.lineTo(10, -2);
    this.graphics.lineTo(0, 13);
    this.graphics.lineTo(-10, -2);
    this.graphics.closePath();
    this.graphics.strokePath();
    this.graphics.fillStyle(color, this.forgeState === "exhausted" ? 0.25 : 0.85);
    this.graphics.fillCircle(0, -2, this.forgeState === "ready" ? 5 : 3);
  }
}
