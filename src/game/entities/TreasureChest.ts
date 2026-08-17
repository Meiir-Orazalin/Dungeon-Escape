import Phaser from "phaser";

import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";
import type { ChestPlan } from "../loot/types";

export class TreasureChest extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private opened = false;

  public constructor(
    scene: Phaser.Scene,
    public readonly plan: ChestPlan,
  ) {
    super(scene, plan.position.x, plan.position.y);
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    scene.add.existing(this);
    this.setName(`${LOOT_GAME_OBJECT_NAMES.CHEST_PREFIX}${plan.id}`).setDepth(4.8);
    this.draw();
  }

  public open(): boolean {
    if (this.opened) return false;
    this.opened = true;
    this.draw();
    return true;
  }

  public isOpened(): boolean {
    return this.opened;
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.fillStyle(0x030405, 0.42);
    this.graphics.fillEllipse(0, 15, 42, 13);
    if (this.opened) {
      this.graphics.fillStyle(0x4b3020, 1);
      this.graphics.fillRoundedRect(-20, -2, 40, 20, 3);
      this.graphics.lineStyle(2, 0x9b6b38, 0.9);
      this.graphics.strokeRoundedRect(-20, -2, 40, 20, 3);
      this.graphics.fillStyle(0x241913, 1);
      this.graphics.fillRoundedRect(-19, -19, 38, 10, 3);
      this.graphics.lineStyle(2, 0xbf8a48, 0.8);
      this.graphics.strokeRoundedRect(-19, -19, 38, 10, 3);
      this.graphics.lineStyle(2, 0xd8a959, 0.65);
      this.graphics.lineBetween(-13, 1, 13, 1);
      return;
    }
    this.graphics.fillStyle(0x55341e, 1);
    this.graphics.fillRoundedRect(-20, -9, 40, 27, 4);
    this.graphics.fillStyle(0x6f4524, 1);
    this.graphics.fillRoundedRect(-20, -17, 40, 14, 5);
    this.graphics.lineStyle(2, 0xbf8a48, 0.95);
    this.graphics.strokeRoundedRect(-20, -17, 40, 35, 5);
    this.graphics.lineStyle(3, 0x2c2020, 0.7);
    this.graphics.lineBetween(0, -16, 0, 17);
    this.graphics.fillStyle(0xe0ad56, 1);
    this.graphics.fillRoundedRect(-4, -3, 8, 10, 2);
    this.graphics.fillStyle(0xffdc7a, 0.9);
    this.graphics.fillCircle(0, 0, 2);
  }
}
