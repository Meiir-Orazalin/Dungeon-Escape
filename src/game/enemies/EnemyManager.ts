import Phaser from "phaser";

import { COMBAT_CONFIG } from "../combat/config";
import { createKnockback, updateKnockback } from "../combat/knockback";
import { selectMeleeHits } from "../combat/melee";
import type { KnockbackState, Vector2 } from "../combat/types";
import { PLAYER_BODY_SIZE, TEXTURE_KEYS } from "../constants";
import type { RoomDiscoveryState } from "../dungeon/discovery";
import { isWalkableWorldPoint } from "../dungeon/navigation";
import type { DungeonLayout, DungeonRoom } from "../dungeon/types";
import { ENCOUNTER_GAME_OBJECT_NAMES, ENEMY_ARCHETYPE_CONFIG } from "../encounters/config";
import type { EncounterPlan, EnemySpawnPlan } from "../encounters/types";
import type { Player } from "../entities/Player";
import { deriveEffectiveEnemyStats, getFloorDifficulty } from "../run/difficulty";
import type { EffectiveEnemyStats, FloorDifficultyProfile } from "../run/types";
import {
  createAshWispState,
  createStoneWardenState,
  decideBoneStalker,
  updateAshWisp,
  updateStoneWarden,
} from "./enemyBrain";
import { EnemyProjectile } from "./EnemyProjectile";
import { STONE_WARDEN_CONFIG } from "./enemyConfig";
import type { AshWispState, EnemyReadableState, StoneWardenState } from "./types";

export interface EnemySummary {
  readonly id: string;
  readonly archetype: EnemySpawnPlan["archetype"];
  readonly roomId: number;
  readonly position: Vector2;
  readonly spawnPosition: Vector2;
  readonly currentHealth: number;
  readonly maximumHealth: number;
  readonly alive: boolean;
  readonly state: EnemyReadableState;
}

type ArcadeCallbackObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

interface EnemyRuntime {
  readonly plan: EnemySpawnPlan;
  readonly room: DungeonRoom;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly telegraph: Phaser.GameObjects.Arc;
  readonly effective: EffectiveEnemyStats;
  health: number;
  state: EnemyReadableState;
  wispState: AshWispState;
  wardenState: StoneWardenState;
  knockback: KnockbackState | null;
  wallImpact: boolean;
  discovered: boolean;
}

interface EnemyManagerCallbacks {
  readonly damagePlayer: (source: Vector2) => void;
  readonly enemyDefeated: (
    details: Readonly<{
      enemyId: string;
      archetype: EnemySpawnPlan["archetype"];
      roomId: number;
      position: Vector2;
    }>,
  ) => void;
}

function textureFor(archetype: EnemySpawnPlan["archetype"]): string {
  if (archetype === "bone-stalker") return TEXTURE_KEYS.BONE_STALKER;
  if (archetype === "ash-wisp") return TEXTURE_KEYS.ASH_WISP;
  return TEXTURE_KEYS.STONE_WARDEN;
}

export class EnemyManager {
  private readonly enemyGroup: Phaser.Physics.Arcade.Group;
  private readonly projectileGroup: Phaser.Physics.Arcade.Group;
  private readonly enemies = new Map<string, EnemyRuntime>();
  private readonly projectiles = new Set<EnemyProjectile>();
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
  private active = true;
  private currentRoomId: number;
  private projectileSequence = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: DungeonLayout,
    plan: EncounterPlan,
    private readonly player: Player,
    collisionGroup: Phaser.Physics.Arcade.StaticGroup,
    private readonly callbacks: EnemyManagerCallbacks,
    private readonly difficulty: FloorDifficultyProfile = getFloorDifficulty(1),
  ) {
    this.currentRoomId = layout.spawnRoomId;
    this.enemyGroup = scene.physics.add.group({ allowGravity: false });
    this.projectileGroup = scene.physics.add.group({ allowGravity: false });
    plan.enemies.forEach((enemyPlan) => this.createEnemy(enemyPlan));

    this.colliders.push(
      scene.physics.add.collider(this.enemyGroup, collisionGroup, (enemyObject) =>
        this.handleEnemyWallCollision(enemyObject),
      ),
      scene.physics.add.overlap(player, this.enemyGroup, (_playerObject, enemyObject) => {
        this.handlePlayerEnemyOverlap(enemyObject);
      }),
      scene.physics.add.collider(this.projectileGroup, collisionGroup, (projectileObject) => {
        this.destroyProjectileObject(projectileObject);
      }),
      scene.physics.add.overlap(player, this.projectileGroup, (_playerObject, projectileObject) => {
        this.handleProjectileOverlap(projectileObject);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  public update(delta: number, discovery: RoomDiscoveryState): void {
    this.currentRoomId = discovery.currentRoomId;
    this.enemies.forEach((enemy) => this.updateEnemy(enemy, delta, discovery));
    [...this.projectiles].forEach((projectile) => {
      if (!projectile.active) {
        this.projectiles.delete(projectile);
        return;
      }
      const playerDistance = Math.hypot(projectile.x - this.player.x, projectile.y - this.player.y);
      if (playerDistance <= PLAYER_BODY_SIZE / 2 + 6) {
        const position = { x: projectile.x, y: projectile.y };
        this.destroyProjectile(projectile);
        if (this.active) this.callbacks.damagePlayer(position);
        return;
      }
      if (!isWalkableWorldPoint(this.layout, projectile.x, projectile.y)) {
        this.destroyProjectile(projectile);
        return;
      }
      if (!projectile.updateLifetime(delta)) this.projectiles.delete(projectile);
    });
  }

  public applyMeleeAttack(
    origin: Vector2,
    facing: Vector2,
    alreadyHit: ReadonlySet<string>,
    damage: number = COMBAT_CONFIG.attackDamage,
    range: number = COMBAT_CONFIG.attackRange,
  ): readonly string[] {
    if (!this.active) return [];
    const targets = [...this.enemies.values()].map((enemy) => ({
      id: enemy.plan.id,
      position: { x: enemy.sprite.x, y: enemy.sprite.y },
      radius: ENEMY_ARCHETYPE_CONFIG[enemy.plan.archetype].bodyRadius,
      alive: enemy.health > 0 && enemy.sprite.active,
    }));
    const hits = selectMeleeHits(this.layout, origin, facing, targets, alreadyHit, range);
    hits.forEach((id) => this.damageEnemy(id, origin, damage));
    return hits;
  }

  public getAliveEnemyIds(): ReadonlySet<string> {
    return new Set(
      [...this.enemies.values()].filter((enemy) => enemy.health > 0).map((enemy) => enemy.plan.id),
    );
  }

  public getDefeatedCount(): number {
    return [...this.enemies.values()].filter((enemy) => enemy.health === 0).length;
  }

  public getTotalCount(): number {
    return this.enemies.size;
  }

  public getActiveProjectileCount(): number {
    return [...this.projectiles].filter((projectile) => projectile.active).length;
  }

  public getSummaries(): readonly EnemySummary[] {
    return Object.freeze(
      [...this.enemies.values()]
        .sort((left, right) => left.plan.roomId - right.plan.roomId)
        .map((enemy) =>
          Object.freeze({
            id: enemy.plan.id,
            archetype: enemy.plan.archetype,
            roomId: enemy.plan.roomId,
            position: Object.freeze({ x: enemy.sprite.x, y: enemy.sprite.y }),
            spawnPosition: Object.freeze({ x: enemy.plan.position.x, y: enemy.plan.position.y }),
            currentHealth: enemy.health,
            maximumHealth: enemy.effective.maximumHealth,
            alive: enemy.health > 0,
            state: enemy.state,
          }),
        ),
    );
  }

  public stopAll(): void {
    this.active = false;
    this.enemies.forEach((enemy) => {
      enemy.sprite.setVelocity(0, 0);
      enemy.telegraph.setVisible(false);
    });
    this.destroyAllProjectiles();
  }

  public pause(): void {
    this.active = false;
    this.enemies.forEach((enemy) => {
      enemy.sprite.setVelocity(0, 0);
      enemy.telegraph.setVisible(false);
    });
    this.destroyAllProjectiles();
  }

  public resume(): void {
    this.active = true;
  }

  public destroy(): void {
    this.active = false;
    this.destroyAllProjectiles();
    this.colliders.forEach((collider) => collider.destroy());
    this.colliders.length = 0;
    this.enemies.forEach((enemy) => {
      enemy.telegraph.destroy();
      enemy.shadow.destroy();
    });
    this.enemies.clear();
  }

  private createEnemy(plan: EnemySpawnPlan): void {
    const room = this.layout.rooms.find((candidate) => candidate.id === plan.roomId);
    if (!room) throw new Error(`Cannot render enemy ${plan.id}: room ${plan.roomId} is missing.`);
    const effective = deriveEffectiveEnemyStats(plan.archetype, this.difficulty);
    const sprite = this.scene.physics.add
      .sprite(plan.position.x, plan.position.y, textureFor(plan.archetype))
      .setName(`${ENCOUNTER_GAME_OBJECT_NAMES.ENEMY_PREFIX}${plan.id}`)
      .setData("enemyId", plan.id)
      .setData("homeRoom", {
        x: room.x,
        y: room.y,
        width: room.width,
        height: room.height,
        tileSize: this.layout.tileSize,
      })
      .setDepth(6)
      .setVisible(false)
      .setActive(true);
    const diameter = ENEMY_ARCHETYPE_CONFIG[plan.archetype].bodyRadius * 2;
    const radius = diameter / 2;
    sprite.setCircle(radius, sprite.width / 2 - radius, sprite.height / 2 - radius);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setCollideWorldBounds(true);
    const shadow = this.scene.add
      .ellipse(
        plan.position.x,
        plan.position.y + diameter / 2,
        diameter * 1.35,
        diameter * 0.55,
        0x020304,
        0.5,
      )
      .setDepth(5.4)
      .setVisible(false);
    const telegraph = this.scene.add
      .circle(plan.position.x, plan.position.y, diameter, 0xc85f51, 0)
      .setStrokeStyle(3, plan.archetype === "ash-wisp" ? 0xd492c9 : 0xe56f58, 0.9)
      .setDepth(5.8)
      .setVisible(false);
    this.enemyGroup.add(sprite);
    this.enemies.set(plan.id, {
      plan,
      room,
      sprite,
      shadow,
      telegraph,
      effective,
      health: effective.maximumHealth,
      state: "dormant",
      wispState: createAshWispState(effective),
      wardenState: createStoneWardenState(),
      knockback: null,
      wallImpact: false,
      discovered: false,
    });
  }

  private updateEnemy(enemy: EnemyRuntime, delta: number, discovery: RoomDiscoveryState): void {
    if (enemy.health === 0) return;
    const discovered = discovery.discoveredRoomIds.has(enemy.plan.roomId);
    if (discovered && !enemy.discovered) {
      enemy.discovered = true;
      enemy.sprite.setVisible(true);
      enemy.shadow.setVisible(true);
      (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    }
    if (!this.active) {
      enemy.sprite.setVelocity(0, 0);
      return;
    }
    if (enemy.knockback) {
      enemy.sprite.setVelocity(enemy.knockback.velocity.x, enemy.knockback.velocity.y);
      enemy.knockback = updateKnockback(enemy.knockback, delta);
      this.finishEnemyFrame(enemy);
      return;
    }

    const input = {
      discovered,
      playerInHomeRoom: discovery.currentRoomId === enemy.plan.roomId,
      dead: false,
      position: { x: enemy.sprite.x, y: enemy.sprite.y },
      spawnPosition: enemy.plan.position,
      playerPosition: { x: this.player.x, y: this.player.y },
    };
    if (enemy.plan.archetype === "bone-stalker") {
      const decision = decideBoneStalker(input, enemy.effective);
      enemy.state = decision.state;
      enemy.sprite.setVelocity(decision.velocity.x, decision.velocity.y);
    } else if (enemy.plan.archetype === "ash-wisp") {
      const transition = updateAshWisp(enemy.wispState, input, delta, enemy.effective);
      enemy.wispState = transition.state;
      enemy.state = transition.state.mode;
      enemy.sprite.setVelocity(transition.velocity.x, transition.velocity.y);
      enemy.telegraph.setVisible(enemy.state === "telegraph");
      if (!input.playerInHomeRoom) this.destroyOwnerProjectiles(enemy.plan.id);
      if (transition.fireProjectile) this.fireProjectile(enemy, transition.projectileDirection);
    } else {
      const transition = updateStoneWarden(
        enemy.wardenState,
        input,
        delta,
        {
          wallImpact: enemy.wallImpact,
        },
        enemy.effective,
      );
      enemy.wallImpact = false;
      enemy.wardenState = transition.state;
      enemy.state = transition.state.mode;
      enemy.sprite.setVelocity(transition.velocity.x, transition.velocity.y);
      enemy.telegraph.setVisible(enemy.state === "wind-up");
    }
    this.finishEnemyFrame(enemy);
  }

  private finishEnemyFrame(enemy: EnemyRuntime): void {
    const radius = ENEMY_ARCHETYPE_CONFIG[enemy.plan.archetype].bodyRadius;
    const minimumX = enemy.room.x * this.layout.tileSize + radius;
    const maximumX = (enemy.room.x + enemy.room.width) * this.layout.tileSize - radius;
    const minimumY = enemy.room.y * this.layout.tileSize + radius;
    const maximumY = (enemy.room.y + enemy.room.height) * this.layout.tileSize - radius;
    enemy.sprite.x = Phaser.Math.Clamp(enemy.sprite.x, minimumX, maximumX);
    enemy.sprite.y = Phaser.Math.Clamp(enemy.sprite.y, minimumY, maximumY);
    enemy.shadow.setPosition(enemy.sprite.x, enemy.sprite.y + radius);
    enemy.telegraph.setPosition(enemy.sprite.x, enemy.sprite.y);
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 0) {
      enemy.sprite.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
    }
  }

  private damageEnemy(id: string, source: Vector2, damage: number): void {
    const enemy = this.enemies.get(id);
    if (!enemy || enemy.health === 0) return;
    enemy.health = Math.max(0, enemy.health - Math.max(1, Math.floor(damage)));
    enemy.sprite.setTint(0xffe1b1);
    this.scene.time.delayedCall(90, () => {
      if (enemy.sprite.active) enemy.sprite.clearTint();
    });
    enemy.knockback = createKnockback(
      { x: enemy.sprite.x, y: enemy.sprite.y },
      source,
      COMBAT_CONFIG.enemyKnockbackSpeed,
      COMBAT_CONFIG.enemyKnockbackMs,
    );
    if (enemy.plan.archetype === "stone-warden") {
      const input = {
        discovered: true,
        playerInHomeRoom: true,
        dead: false,
        position: { x: enemy.sprite.x, y: enemy.sprite.y },
        spawnPosition: enemy.plan.position,
        playerPosition: { x: this.player.x, y: this.player.y },
      };
      enemy.wardenState = updateStoneWarden(
        enemy.wardenState,
        input,
        0,
        {
          swordInterrupted: true,
        },
        enemy.effective,
      ).state;
      enemy.state = enemy.wardenState.mode;
      enemy.telegraph.setVisible(false);
    }
    this.createImpact(enemy.sprite.x, enemy.sprite.y);
    if (enemy.health === 0) this.defeatEnemy(enemy);
  }

  private defeatEnemy(enemy: EnemyRuntime): void {
    enemy.state = "dead";
    enemy.knockback = null;
    enemy.sprite.setVelocity(0, 0).setActive(false).setVisible(false);
    (enemy.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    enemy.shadow.setVisible(false);
    enemy.telegraph.setVisible(false);
    this.destroyOwnerProjectiles(enemy.plan.id);
    this.callbacks.enemyDefeated(
      Object.freeze({
        enemyId: enemy.plan.id,
        archetype: enemy.plan.archetype,
        roomId: enemy.plan.roomId,
        position: Object.freeze({ x: enemy.sprite.x, y: enemy.sprite.y }),
      }),
    );
  }

  private fireProjectile(enemy: EnemyRuntime, direction: Vector2): void {
    if (!this.active || enemy.health === 0 || this.currentRoomId !== enemy.plan.roomId) return;
    const projectile = new EnemyProjectile(
      this.scene,
      `${enemy.plan.id}:${this.projectileSequence++}`,
      enemy.sprite.x,
      enemy.sprite.y,
      direction,
    );
    projectile.setData("ownerEnemyId", enemy.plan.id);
    this.projectileGroup.add(projectile);
    projectile.setVelocity(
      direction.x * enemy.effective.wispProjectileSpeed,
      direction.y * enemy.effective.wispProjectileSpeed,
    );
    this.projectiles.add(projectile);
  }

  private handleEnemyWallCollision(object: ArcadeCallbackObject): void {
    if (!(object instanceof Phaser.Physics.Arcade.Sprite)) return;
    const id = object.getData("enemyId") as unknown;
    if (typeof id !== "string") return;
    const enemy = this.enemies.get(id);
    if (
      enemy?.plan.archetype === "stone-warden" &&
      enemy.state === "charge" &&
      enemy.wardenState.remainingMs <= STONE_WARDEN_CONFIG.chargeDurationMs - 50
    ) {
      const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
      const direction = enemy.wardenState.lockedDirection;
      enemy.wallImpact =
        (direction.x < 0 && body.blocked.left) ||
        (direction.x > 0 && body.blocked.right) ||
        (direction.y < 0 && body.blocked.up) ||
        (direction.y > 0 && body.blocked.down);
    }
  }

  private handlePlayerEnemyOverlap(object: ArcadeCallbackObject): void {
    if (!this.active || !(object instanceof Phaser.Physics.Arcade.Sprite)) return;
    const id = object.getData("enemyId") as unknown;
    const enemy = typeof id === "string" ? this.enemies.get(id) : undefined;
    if (
      !enemy ||
      enemy.health === 0 ||
      !enemy.discovered ||
      this.currentRoomId !== enemy.plan.roomId
    ) {
      return;
    }
    this.callbacks.damagePlayer({ x: enemy.sprite.x, y: enemy.sprite.y });
  }

  private handleProjectileOverlap(object: ArcadeCallbackObject): void {
    if (!(object instanceof EnemyProjectile)) return;
    const position = { x: object.x, y: object.y };
    this.destroyProjectile(object);
    if (this.active) this.callbacks.damagePlayer(position);
  }

  private destroyProjectileObject(object: ArcadeCallbackObject): void {
    if (object instanceof EnemyProjectile) this.destroyProjectile(object);
  }

  private destroyProjectile(projectile: EnemyProjectile): void {
    this.projectiles.delete(projectile);
    if (projectile.active) projectile.destroy();
  }

  private destroyOwnerProjectiles(ownerEnemyId: string): void {
    [...this.projectiles]
      .filter((projectile) => projectile.getData("ownerEnemyId") === ownerEnemyId)
      .forEach((projectile) => this.destroyProjectile(projectile));
  }

  private destroyAllProjectiles(): void {
    [...this.projectiles].forEach((projectile) => this.destroyProjectile(projectile));
  }

  private createImpact(x: number, y: number): void {
    const impact = this.scene.add.circle(x, y, 6, 0xffd28c, 0.9).setDepth(8);
    this.scene.tweens.add({
      targets: impact,
      scale: 2.2,
      alpha: 0,
      duration: 150,
      onComplete: () => impact.destroy(),
    });
  }
}
