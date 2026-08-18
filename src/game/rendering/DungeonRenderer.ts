import Phaser from "phaser";

import { hashSeed } from "../dungeon/seed";
import type { DungeonLayout } from "../dungeon/types";
import { getFloorTheme } from "../run/themes";
import type { FloorTheme } from "../run/types";

function decorationValue(seedHash: number, tileIndex: number): number {
  let value = seedHash ^ Math.imul(tileIndex + 1, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export class DungeonRenderer {
  public readonly collisionGroup: Phaser.Physics.Arcade.StaticGroup;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: DungeonLayout,
    private readonly theme: FloorTheme = getFloorTheme(1),
  ) {
    this.collisionGroup = this.scene.physics.add.staticGroup();
  }

  public build(): void {
    this.drawFloor();
    this.drawWalls();
    this.createCollisionBodies();
    this.createDeterministicTorches();
  }

  private drawFloor(): void {
    const graphics = this.scene.add.graphics().setDepth(-10);
    const tileSize = this.layout.tileSize;
    const seedHash = hashSeed(`${this.layout.seed}:floor-decoration`);

    this.layout.floorMask.forEach((walkable, index) => {
      if (!walkable) return;
      const tileX = index % this.layout.mapWidth;
      const tileY = Math.floor(index / this.layout.mapWidth);
      const variation = decorationValue(seedHash, index) % 5;
      const color = this.theme.floorColors[variation] as number;

      graphics.fillStyle(color, 1);
      graphics.fillRect(tileX * tileSize, tileY * tileSize, tileSize, tileSize);
      graphics.lineStyle(1, this.theme.floorLineColor, 0.42);
      graphics.strokeRect(tileX * tileSize + 1, tileY * tileSize + 1, tileSize - 2, tileSize - 2);

      if (decorationValue(seedHash ^ 0xa53a9d1b, index) % 97 === 0) {
        graphics.lineStyle(1, this.theme.crackColor, 0.58);
        graphics.beginPath();
        graphics.moveTo(tileX * tileSize + 6, tileY * tileSize + 22);
        graphics.lineTo(tileX * tileSize + 15, tileY * tileSize + 17);
        graphics.lineTo(tileX * tileSize + 25, tileY * tileSize + 21);
        graphics.strokePath();
      }
    });
  }

  private drawWalls(): void {
    const graphics = this.scene.add.graphics().setDepth(2);
    const tileSize = this.layout.tileSize;
    const seedHash = hashSeed(`${this.layout.seed}:wall-decoration`);

    this.layout.wallMask.forEach((isWall, index) => {
      if (!isWall) return;
      const tileX = index % this.layout.mapWidth;
      const tileY = Math.floor(index / this.layout.mapWidth);
      const x = tileX * tileSize;
      const y = tileY * tileSize;
      const variation = decorationValue(seedHash, index) % 3;
      const color = this.theme.wallColors[variation] as number;

      graphics.fillStyle(0x090c0e, 0.8);
      graphics.fillRect(x + 3, y + 4, tileSize, tileSize);
      graphics.fillStyle(color, 1);
      graphics.fillRect(x, y, tileSize, tileSize);
      graphics.lineStyle(1, this.theme.wallLineColor, 0.72);
      graphics.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      graphics.lineStyle(1, 0x1a2022, 0.85);
      graphics.lineBetween(x + 2, y + tileSize / 2, x + tileSize - 2, y + tileSize / 2);

      if ((tileX + tileY) % 2 === 0) {
        graphics.lineBetween(x + tileSize / 2, y + 2, x + tileSize / 2, y + tileSize / 2);
      } else {
        graphics.lineBetween(
          x + tileSize / 3,
          y + tileSize / 2,
          x + tileSize / 3,
          y + tileSize - 2,
        );
      }
    });
  }

  private createCollisionBodies(): void {
    this.layout.collisionRectangles.forEach((rectangle) => {
      const zone = this.scene.add.zone(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      this.scene.physics.add.existing(zone, true);
      this.collisionGroup.add(zone);
    });
  }

  private createDeterministicTorches(): void {
    const tileSize = this.layout.tileSize;
    const seedHash = hashSeed(`${this.layout.seed}:torches`);
    const selected: Array<{ x: number; y: number }> = [];

    this.layout.wallMask.forEach((isWall, index) => {
      if (!isWall || selected.length >= 14 || decorationValue(seedHash, index) % 29 !== 0) return;
      const tileX = index % this.layout.mapWidth;
      const tileY = Math.floor(index / this.layout.mapWidth);
      const hasFloorNeighbour = [
        [tileX + 1, tileY],
        [tileX - 1, tileY],
        [tileX, tileY + 1],
        [tileX, tileY - 1],
      ].some(
        ([x, y]) =>
          x !== undefined &&
          y !== undefined &&
          x >= 0 &&
          y >= 0 &&
          x < this.layout.mapWidth &&
          y < this.layout.mapHeight &&
          this.layout.floorMask[y * this.layout.mapWidth + x] === true,
      );
      if (!hasFloorNeighbour) return;
      if (selected.some((position) => Math.hypot(position.x - tileX, position.y - tileY) < 7)) {
        return;
      }
      selected.push({ x: tileX, y: tileY });
    });

    const glows = selected.map((position) => {
      const x = (position.x + 0.5) * tileSize;
      const y = (position.y + 0.5) * tileSize;
      const glow = this.scene.add
        .circle(x, y, 56, this.theme.accentColor, 0.075)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      this.scene.add.circle(x, y + 2, 6, this.theme.gateAccentColor, 0.78).setDepth(4);
      this.scene.add.circle(x, y - 2, 3, 0xffd797, 1).setDepth(4);
      return glow;
    });

    if (glows.length > 0) {
      this.scene.tweens.add({
        targets: glows,
        scale: 1.14,
        alpha: 0.12,
        duration: 920,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }
}
