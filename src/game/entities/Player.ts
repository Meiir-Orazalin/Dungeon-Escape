import Phaser from "phaser";

import { PLAYER_BODY_SIZE, PLAYER_SPEED, TEXTURE_KEYS } from "../constants";
import { calculateMovementVelocity, type MovementInput } from "../input/movement";

type SpawnPoint = Readonly<{ x: number; y: number }>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly spawnPoint: SpawnPoint;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  public constructor(scene: Phaser.Scene, spawnPoint: SpawnPoint) {
    super(scene, spawnPoint.x, spawnPoint.y, TEXTURE_KEYS.PLAYER);

    this.spawnPoint = spawnPoint;
    this.shadow = scene.add
      .ellipse(spawnPoint.x, spawnPoint.y + 16, 34, 13, 0x030405, 0.42)
      .setDepth(4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    this.setCollideWorldBounds(true);
    this.setSize(PLAYER_BODY_SIZE, PLAYER_BODY_SIZE);
  }

  public applyMovement(input: MovementInput): void {
    const velocity = calculateMovementVelocity(input, PLAYER_SPEED);
    this.setVelocity(velocity.x, velocity.y);

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.setRotation(Math.atan2(velocity.y, velocity.x));
    }
  }

  public resetToSpawn(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.spawnPoint.x, this.spawnPoint.y);
    this.setRotation(0);
    this.syncShadow();
  }

  public getSpawnPoint(): SpawnPoint {
    return this.spawnPoint;
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
