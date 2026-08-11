import Phaser from "phaser";

import { PLAYER_BODY_SIZE, PLAYER_SPEED, TEXTURE_KEYS } from "../constants";
import { DEFAULT_FACING, facingFromMovement, normalizeDirection } from "../combat/facing";
import type { Vector2 } from "../combat/types";
import { calculateMovementVelocity, type MovementInput } from "../input/movement";
import { GAME_OBJECT_NAMES } from "../objective/config";

type SpawnPoint = Readonly<{ x: number; y: number }>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly spawnPoint: SpawnPoint;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private facing: Vector2 = DEFAULT_FACING;

  public constructor(scene: Phaser.Scene, spawnPoint: SpawnPoint) {
    super(scene, spawnPoint.x, spawnPoint.y, TEXTURE_KEYS.PLAYER);

    this.spawnPoint = spawnPoint;
    this.shadow = scene.add
      .ellipse(spawnPoint.x, spawnPoint.y + 16, 34, 13, 0x030405, 0.42)
      .setDepth(4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setName(GAME_OBJECT_NAMES.PLAYER);
    this.setData("gameObjectType", GAME_OBJECT_NAMES.PLAYER);
    this.setDepth(5);
    this.setCollideWorldBounds(true);
    this.setSize(PLAYER_BODY_SIZE, PLAYER_BODY_SIZE);
  }

  public applyMovement(input: MovementInput): void {
    const velocity = calculateMovementVelocity(input, PLAYER_SPEED);
    this.setVelocity(velocity.x, velocity.y);

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.setFacing(facingFromMovement(input, this.facing));
    }
  }

  public getFacing(): Vector2 {
    return this.facing;
  }

  public setFacing(direction: Vector2): void {
    this.facing = normalizeDirection(direction, this.facing);
    this.setRotation(Math.atan2(this.facing.y, this.facing.x));
  }

  public flashDamage(): void {
    this.setTint(0xff6f68);
    this.scene.time.delayedCall(110, () => {
      if (this.active) this.clearTint();
    });
  }

  public resetToSpawn(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.spawnPoint.x, this.spawnPoint.y);
    this.facing = DEFAULT_FACING;
    this.setRotation(0);
    this.syncShadow();
  }

  public getSpawnPoint(): SpawnPoint {
    return this.spawnPoint;
  }

  public stopMovement(): void {
    this.setVelocity(0, 0);
  }

  public override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.syncShadow();
  }

  public override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }

  private syncShadow(): void {
    this.shadow.setPosition(this.x, this.y + 16);
  }
}
