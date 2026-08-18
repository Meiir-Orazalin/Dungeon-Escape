import type Phaser from "phaser";
import {
  enemyHealthBarWidth,
  healthBarRatio,
  shouldShowEnemyHealthBar,
} from "../presentation/healthBar";

export class EnemyHealthBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private damageRemainingMs = 0;
  private destroyed = false;
  private shown = false;
  public constructor(
    scene: Phaser.Scene,
    private readonly archetype: string,
  ) {
    this.graphics = scene.add.graphics().setDepth(8.2);
  }
  public damaged(): void {
    this.damageRemainingMs = 1500;
  }
  public update(
    x: number,
    y: number,
    current: number,
    maximum: number,
    discovered: boolean,
    engaged: boolean,
    delta: number,
    highContrast: boolean,
  ): void {
    this.damageRemainingMs = Math.max(
      0,
      this.damageRemainingMs - (Number.isFinite(delta) ? Math.max(0, delta) : 0),
    );
    this.graphics.clear();
    this.shown = shouldShowEnemyHealthBar(discovered, engaged, current > 0, this.damageRemainingMs);
    if (!this.shown) return;
    const width = enemyHealthBarWidth(this.archetype);
    const left = x - width / 2;
    const top = y - (this.archetype === "stone-warden" ? 38 : 31);
    this.graphics.fillStyle(0x07090a, 0.94).fillRect(left - 2, top - 2, width + 4, 8);
    this.graphics.fillStyle(0x4e171b, 1).fillRect(left, top, width, 4);
    this.graphics
      .fillStyle(0xd96858, 1)
      .fillRect(left, top, width * healthBarRatio(current, maximum), 4);
    this.graphics
      .lineStyle(highContrast ? 2 : 1, highContrast ? 0xffffff : 0xdda88c, 1)
      .strokeRect(left - 1, top - 1, width + 2, 6);
  }
  public isVisible(): boolean {
    return !this.destroyed && this.shown;
  }
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shown = false;
    this.graphics.destroy();
  }
}
