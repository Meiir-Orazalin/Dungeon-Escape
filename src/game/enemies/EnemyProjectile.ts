import Phaser from "phaser";

import { TEXTURE_KEYS } from "../constants";
import { ENCOUNTER_GAME_OBJECT_NAMES } from "../encounters/config";
import { ASH_WISP_CONFIG } from "./enemyConfig";
import { updateProjectileLifetime } from "./enemyBrain";

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  private remainingLifetimeMs: number = ASH_WISP_CONFIG.projectileLifetimeMs;

  public constructor(
    scene: Phaser.Scene,
    public readonly ownerId: string,
    x: number,
    y: number,
    direction: Readonly<{ x: number; y: number }>,
  ) {
    super(scene, x, y, TEXTURE_KEYS.ASH_PROJECTILE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setName(`${ENCOUNTER_GAME_OBJECT_NAMES.PROJECTILE_PREFIX}${ownerId}`);
    this.setDepth(7.2);
    this.setCircle(6, 2, 2);
    this.setVelocity(
      direction.x * ASH_WISP_CONFIG.projectileSpeed,
      direction.y * ASH_WISP_CONFIG.projectileSpeed,
    );
  }

  public updateLifetime(delta: number): boolean {
    this.remainingLifetimeMs = updateProjectileLifetime(this.remainingLifetimeMs, delta);
    if (this.remainingLifetimeMs > 0) return true;
    this.destroy();
    return false;
  }
}
