import Phaser from "phaser";

import { decideEffectAcquisition, effectBudget } from "./effectConfig";

interface ActiveEffect {
  readonly sequence: number;
  readonly object: Phaser.GameObjects.Arc;
}

export class EffectPool {
  private active: ActiveEffect[] = [];
  private inactive: Phaser.GameObjects.Arc[] = [];
  private sequence = 0;
  private peak = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    private reducedMotion: boolean,
  ) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    const cap = effectBudget(reducedMotion);
    while (this.active.length > cap) this.release(this.active[0]?.sequence ?? -1);
  }

  public burst(x: number, y: number, color: number, count = 6): void {
    const actualCount = this.reducedMotion ? Math.max(1, Math.ceil(count * 0.35)) : count;
    for (let index = 0; index < actualCount; index += 1) {
      const cap = effectBudget(this.reducedMotion);
      const decision = decideEffectAcquisition(this.active.length, cap);
      if (decision === "reuse-oldest") this.release(this.active[0]?.sequence ?? -1);
      const angle = (Math.PI * 2 * index) / actualCount;
      const object = this.inactive.pop() ?? this.scene.add.circle(x, y, 3, color, 0.88);
      object
        .setPosition(x, y)
        .setRadius(3)
        .setFillStyle(color, 0.88)
        .setAlpha(1)
        .setVisible(true)
        .setActive(true)
        .setDepth(920);
      const sequence = this.sequence++;
      this.active.push({ sequence, object });
      this.peak = Math.max(this.peak, this.active.length);
      this.scene.tweens.add({
        targets: object,
        x: x + Math.cos(angle) * (this.reducedMotion ? 10 : 24),
        y: y + Math.sin(angle) * (this.reducedMotion ? 8 : 18),
        alpha: 0,
        duration: this.reducedMotion ? 100 : 220,
        onComplete: () => this.release(sequence),
      });
    }
  }

  public getActiveCount(): number {
    return this.active.length;
  }

  public getPeakCount(): number {
    return this.peak;
  }

  public destroy(): void {
    this.active.forEach(({ object }) => object.destroy());
    this.inactive.forEach((object) => object.destroy());
    this.active = [];
    this.inactive = [];
  }

  private release(sequence: number): void {
    const effect = this.active.find((candidate) => candidate.sequence === sequence);
    if (!effect) return;
    this.scene.tweens.killTweensOf(effect.object);
    effect.object.setActive(false).setVisible(false);
    this.inactive.push(effect.object);
    this.active = this.active.filter((candidate) => candidate.sequence !== sequence);
  }
}
