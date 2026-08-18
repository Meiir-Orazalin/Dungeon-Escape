import Phaser from "phaser";

import type { Player } from "../entities/Player";
import type { EnemyManager } from "../enemies/EnemyManager";
import type { MovementInput } from "../input/movement";
import { PLAYER_SPEED } from "../constants";
import { BASE_PLAYER_STATS } from "../upgrades/effectiveStats";
import type { EffectivePlayerStats } from "../upgrades/types";
import {
  beginAttack,
  cancelAttack,
  createReadyAttackState,
  registerAttackHits,
  updateAttackState,
} from "./attackState";
import { COMBAT_CONFIG } from "./config";
import {
  beginDash,
  cancelDash,
  clampDashCooldown,
  createReadyDashState,
  updateDashState,
} from "./dashState";
import { directionBetween } from "./facing";
import { createKnockback, updateKnockback } from "./knockback";
import type { AttackState, DashState, KnockbackState, PlayerVitality, Vector2 } from "./types";
import {
  applyPlayerDamage,
  createInitialVitality,
  healPlayer,
  increaseMaximumHealth,
  isPlayerInvulnerable,
  updateVitality,
} from "./vitality";

interface CombatCallbacks {
  readonly healthChanged: (vitality: PlayerVitality) => void;
  readonly playerDefeated: () => void;
}

interface CombatInitialState {
  readonly effectiveStats?: EffectivePlayerStats;
  readonly currentHealth?: number;
}

const NO_MOVEMENT: MovementInput = Object.freeze({
  up: false,
  down: false,
  left: false,
  right: false,
});

export class CombatController {
  private attackState: AttackState = createReadyAttackState();
  private dashState: DashState = createReadyDashState();
  private vitality: PlayerVitality = createInitialVitality();
  private knockback: KnockbackState | null = null;
  private effectiveStats: EffectivePlayerStats = BASE_PLAYER_STATS;
  private readonly slash: Phaser.GameObjects.Graphics;
  private active = true;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: EnemyManager,
    private readonly callbacks: CombatCallbacks,
    initial: CombatInitialState = {},
  ) {
    this.effectiveStats = initial.effectiveStats ?? BASE_PLAYER_STATS;
    this.vitality = createInitialVitality(
      this.effectiveStats.maximumHealth,
      initial.currentHealth ?? this.effectiveStats.maximumHealth,
    );
    this.slash = scene.add.graphics().setDepth(8).setVisible(false);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public update(delta: number, movementInput: MovementInput = NO_MOVEMENT): void {
    if (!this.active || this.vitality.status === "defeated") {
      this.player.stopMovement();
      return;
    }
    const previousAttackPhase = this.attackState.phase;
    this.vitality = updateVitality(this.vitality, delta);
    this.dashState = updateDashState(this.dashState, delta);
    this.knockback = updateKnockback(this.knockback, delta);
    this.attackState = updateAttackState(this.attackState, delta, this.effectiveStats);
    if (this.attackState.phase === "active") {
      const hits = this.enemies.applyMeleeAttack(
        { x: this.player.x, y: this.player.y },
        this.player.getFacing(),
        this.attackState.hitEnemyIds,
        this.effectiveStats.meleeDamage,
        this.effectiveStats.meleeRange,
      );
      this.attackState = registerAttackHits(this.attackState, hits);
    }
    if (previousAttackPhase !== this.attackState.phase) this.updateSlashVisual();

    if (this.knockback) {
      this.player.setVelocity(this.knockback.velocity.x, this.knockback.velocity.y);
    } else if (this.vitality.status === "alive" && this.vitality.hitStunRemainingMs > 0) {
      this.player.stopMovement();
    } else if (this.dashState.status === "active") {
      this.player.setVelocity(
        this.dashState.direction.x * this.effectiveStats.dashSpeed,
        this.dashState.direction.y * this.effectiveStats.dashSpeed,
      );
    } else {
      this.player.applyMovement(
        movementInput,
        PLAYER_SPEED * this.effectiveStats.movementSpeedMultiplier,
      );
    }
    if (this.attackState.phase === "active") this.syncSlashTransform();
    const invulnerable = isPlayerInvulnerable(this.vitality, this.dashState.status === "active");
    this.player.setAlpha(invulnerable ? 0.72 : 1);
  }

  public beginFacingAttack(direction?: Vector2): boolean {
    if (!this.active || this.vitality.status !== "alive") return false;
    if (direction) this.player.setFacing(direction);
    const next = beginAttack(
      this.attackState,
      {
        dashing: this.dashState.status === "active",
        hitStunned: this.vitality.hitStunRemainingMs > 0,
      },
      this.effectiveStats,
    );
    if (next === this.attackState) return false;
    this.attackState = next;
    this.updateSlashVisual();
    return true;
  }

  public beginPointerAttack(worldPosition: Vector2): boolean {
    const direction = directionBetween(
      { x: this.player.x, y: this.player.y },
      worldPosition,
      this.player.getFacing(),
    );
    return this.beginFacingAttack(direction);
  }

  public beginDash(movementInput: MovementInput): boolean {
    if (!this.active || this.vitality.status !== "alive") return false;
    const movementDirection = {
      x: Number(movementInput.right) - Number(movementInput.left),
      y: Number(movementInput.down) - Number(movementInput.up),
    };
    const next = beginDash(
      this.dashState,
      movementDirection,
      this.player.getFacing(),
      this.vitality.hitStunRemainingMs > 0,
      this.effectiveStats,
    );
    if (next === this.dashState) return false;
    this.attackState = cancelAttack(this.attackState);
    this.dashState = next;
    if (next.status === "active") this.player.setFacing(next.direction);
    this.createDashTrail();
    return true;
  }

  public receiveDamage(source: Vector2): "accepted" | "ignored" | "defeated" {
    if (!this.active) return "ignored";
    const transition = applyPlayerDamage(
      this.vitality,
      COMBAT_CONFIG.damagePerHit,
      this.dashState.status === "active",
      this.effectiveStats.postHitInvulnerabilityMs,
      this.effectiveStats.hitStunMs,
    );
    if (transition.outcome === "ignored") return "ignored";
    this.vitality = transition.state;
    this.attackState = cancelAttack(this.attackState);
    this.dashState = cancelDash(this.dashState);
    this.knockback = createKnockback(
      { x: this.player.x, y: this.player.y },
      source,
      COMBAT_CONFIG.playerKnockbackSpeed,
      this.effectiveStats.playerKnockbackMs,
      this.player.getFacing(),
    );
    this.player.flashDamage();
    this.scene.cameras.main.shake(90, 0.0045);
    this.createDamageVignette();
    this.updateSlashVisual();
    this.callbacks.healthChanged(this.vitality);
    if (transition.outcome === "defeated") this.callbacks.playerDefeated();
    return transition.outcome;
  }

  public canInteract(): boolean {
    return (
      this.active &&
      this.vitality.status === "alive" &&
      this.vitality.hitStunRemainingMs === 0 &&
      this.dashState.status !== "active"
    );
  }

  public pause(): void {
    this.attackState = cancelAttack(this.attackState);
    this.updateSlashVisual();
    this.player.stopMovement();
  }

  public heal(
    amount: number,
  ): Readonly<{ consumed: boolean; restoredHealth: number; vitality: PlayerVitality }> {
    if (!this.active) {
      return Object.freeze({ consumed: false, restoredHealth: 0, vitality: this.vitality });
    }
    const transition = healPlayer(this.vitality, amount);
    this.vitality = transition.state;
    if (transition.consumed) this.callbacks.healthChanged(this.vitality);
    return Object.freeze({
      consumed: transition.consumed,
      restoredHealth: transition.restoredHealth,
      vitality: this.vitality,
    });
  }

  public applyEffectiveStats(stats: EffectivePlayerStats, restoreForVitalRune: boolean): void {
    const previousMaximum = this.effectiveStats.maximumHealth;
    this.effectiveStats = stats;
    this.dashState = clampDashCooldown(this.dashState, stats.dashCooldownMs);
    if (stats.maximumHealth !== previousMaximum) {
      const transition = increaseMaximumHealth(
        this.vitality,
        stats.maximumHealth,
        restoreForVitalRune ? 1 : 0,
      );
      this.vitality = transition.state;
      this.callbacks.healthChanged(this.vitality);
    }
  }

  public getEffectiveStats(): EffectivePlayerStats {
    return this.effectiveStats;
  }

  public stopTerminal(): void {
    this.active = false;
    this.attackState = cancelAttack(this.attackState);
    this.dashState = cancelDash(this.dashState);
    this.knockback = null;
    this.slash.setVisible(false).clear();
    this.player.setAlpha(1);
    this.player.stopMovement();
  }

  public getVitality(): PlayerVitality {
    return this.vitality;
  }

  public getAttackState(): AttackState {
    return this.attackState;
  }

  public getDashState(): DashState {
    return this.dashState;
  }

  public isInvulnerable(): boolean {
    return isPlayerInvulnerable(this.vitality, this.dashState.status === "active");
  }

  public destroy(): void {
    this.active = false;
    this.slash.destroy();
  }

  private updateSlashVisual(): void {
    this.slash.clear().setVisible(this.attackState.phase === "active");
    if (this.attackState.phase !== "active") return;
    const facing = this.player.getFacing();
    const angle = Math.atan2(facing.y, facing.x);
    const halfArc = (this.effectiveStats.meleeArcDegrees * Math.PI) / 360;
    this.slash.setPosition(this.player.x, this.player.y).setRotation(angle);
    this.slash.lineStyle(7, 0xffe2a1, 0.9);
    this.slash.beginPath();
    this.slash.arc(0, 0, this.effectiveStats.meleeRange, -halfArc, halfArc, false);
    this.slash.strokePath();
    this.slash.lineStyle(2, 0xffffff, 0.72);
    this.slash.beginPath();
    this.slash.arc(0, 0, this.effectiveStats.meleeRange - 7, -halfArc, halfArc, false);
    this.slash.strokePath();
  }

  private syncSlashTransform(): void {
    const facing = this.player.getFacing();
    this.slash
      .setPosition(this.player.x, this.player.y)
      .setRotation(Math.atan2(facing.y, facing.x));
  }

  private createDashTrail(): void {
    const facing = this.player.getFacing();
    for (let index = 1; index <= 3; index += 1) {
      const afterImage = this.scene.add
        .circle(
          this.player.x - facing.x * index * 12,
          this.player.y - facing.y * index * 12,
          11 - index,
          0xe7c47f,
          0.28,
        )
        .setDepth(5.6);
      this.scene.tweens.add({
        targets: afterImage,
        alpha: 0,
        scale: 0.55,
        duration: 180,
        onComplete: () => afterImage.destroy(),
      });
    }
  }

  private createDamageVignette(): void {
    const flash = this.scene.add
      .rectangle(0, 0, 960, 540, 0x9d1f24, 0.2)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy(),
    });
  }
}
