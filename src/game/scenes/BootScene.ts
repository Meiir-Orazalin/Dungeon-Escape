import Phaser from "phaser";

import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.BOOT);
  }

  public create(): void {
    this.createFloorTexture();
    this.createStoneTexture();
    this.createPlayerTexture();
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createFloorTexture(): void {
    const graphics = this.add.graphics().setVisible(false);

    graphics.fillStyle(0x141a1d);
    graphics.fillRect(0, 0, 64, 64);
    graphics.lineStyle(1, 0x252e31, 0.75);
    graphics.strokeRect(1, 1, 62, 62);
    graphics.lineStyle(1, 0x0c1012, 0.65);
    graphics.beginPath();
    graphics.moveTo(10, 42);
    graphics.lineTo(25, 37);
    graphics.lineTo(37, 44);
    graphics.lineTo(53, 39);
    graphics.strokePath();
    graphics.fillStyle(0x30383a, 0.32);
    graphics.fillCircle(13, 15, 1.5);
    graphics.fillCircle(49, 25, 1);
    graphics.generateTexture(TEXTURE_KEYS.FLOOR, 64, 64);
    graphics.destroy();
  }

  private createStoneTexture(): void {
    const graphics = this.add.graphics().setVisible(false);

    graphics.fillStyle(0x171c20);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x333b3e);
    graphics.fillRoundedRect(2, 3, 38, 27, 3);
    graphics.fillStyle(0x293134);
    graphics.fillRoundedRect(43, 3, 19, 27, 3);
    graphics.fillStyle(0x252c2f);
    graphics.fillRoundedRect(2, 33, 23, 28, 3);
    graphics.fillStyle(0x30383b);
    graphics.fillRoundedRect(28, 33, 34, 28, 3);
    graphics.lineStyle(1, 0x434c4f, 0.75);
    graphics.lineBetween(7, 8, 32, 8);
    graphics.lineBetween(33, 38, 55, 38);
    graphics.generateTexture(TEXTURE_KEYS.STONE, 64, 64);
    graphics.destroy();
  }

  private createPlayerTexture(): void {
    const graphics = this.add.graphics().setVisible(false);

    graphics.fillStyle(0x181313, 0.4);
    graphics.fillCircle(20, 20, 18);
    graphics.fillStyle(0x713d2d);
    graphics.fillCircle(18, 20, 14);
    graphics.fillStyle(0xb8643d);
    graphics.fillTriangle(7, 30, 28, 31, 23, 9);
    graphics.fillStyle(0xe8c985);
    graphics.fillCircle(18, 14, 7);
    graphics.fillStyle(0xf4ad4f);
    graphics.fillTriangle(24, 15, 37, 20, 24, 25);
    graphics.fillStyle(0xffe3a3);
    graphics.fillCircle(29, 20, 3);
    graphics.generateTexture(TEXTURE_KEYS.PLAYER, 40, 40);
    graphics.destroy();
  }
}
