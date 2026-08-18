import Phaser from "phaser";

import { AUDIO_DIRECTOR_REGISTRY_KEY, AudioDirector } from "../audio/AudioDirector";
import { SCENE_KEYS, TEXTURE_KEYS } from "../constants";
import {
  PRESENTATION_RUNTIME_REGISTRY_KEY,
  PresentationRuntime,
} from "../presentation/PresentationRuntime";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.BOOT);
  }

  public create(): void {
    let storage: Storage | undefined;
    try {
      storage = typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
      storage = undefined;
    }
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const presentation = new PresentationRuntime(storage, prefersReducedMotion);
    const audio = new AudioDirector(this.game, presentation.getSettings());
    presentation.subscribe((settings) => audio.applySettings(settings));
    this.registry.set(PRESENTATION_RUNTIME_REGISTRY_KEY, presentation);
    this.registry.set(AUDIO_DIRECTOR_REGISTRY_KEY, audio);
    this.createFloorTexture();
    this.createStoneTexture();
    this.createPlayerTexture();
    this.createEnemyTextures();
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

  private createEnemyTextures(): void {
    const graphics = this.add.graphics().setVisible(false);

    graphics.fillStyle(0x161617, 0.9);
    graphics.fillCircle(21, 22, 15);
    graphics.lineStyle(5, 0xd3c7aa, 1);
    graphics.lineBetween(12, 12, 30, 30);
    graphics.lineBetween(30, 12, 12, 30);
    graphics.fillStyle(0xc9bda1, 1);
    graphics.fillCircle(21, 19, 11);
    graphics.fillStyle(0x1b1716, 1);
    graphics.fillCircle(17, 17, 2.5);
    graphics.fillCircle(25, 17, 2.5);
    graphics.fillStyle(0xd85f45, 1);
    graphics.fillCircle(17, 17, 1.3);
    graphics.fillCircle(25, 17, 1.3);
    graphics.generateTexture(TEXTURE_KEYS.BONE_STALKER, 42, 42);
    graphics.clear();

    graphics.fillStyle(0x3d264d, 0.75);
    graphics.fillCircle(20, 20, 16);
    graphics.fillStyle(0x8d5daf, 0.9);
    graphics.fillCircle(20, 18, 11);
    graphics.fillStyle(0xd18b62, 0.9);
    graphics.fillCircle(20, 18, 6);
    graphics.fillStyle(0xffd28d, 1);
    graphics.fillCircle(20, 18, 2.6);
    graphics.lineStyle(2, 0x9e6ab8, 0.8);
    graphics.strokeCircle(20, 20, 16);
    graphics.generateTexture(TEXTURE_KEYS.ASH_WISP, 40, 40);
    graphics.clear();

    graphics.fillStyle(0x111617, 0.9);
    graphics.fillRoundedRect(5, 8, 42, 42, 8);
    graphics.fillStyle(0x515b5b, 1);
    graphics.fillRoundedRect(8, 5, 36, 40, 7);
    graphics.fillStyle(0x30393a, 1);
    graphics.fillRect(12, 11, 28, 27);
    graphics.lineStyle(3, 0xc45e4c, 0.9);
    graphics.lineBetween(14, 15, 24, 24);
    graphics.lineBetween(24, 24, 18, 35);
    graphics.lineBetween(24, 24, 37, 18);
    graphics.fillStyle(0xe37a59, 1);
    graphics.fillCircle(18, 17, 2);
    graphics.fillCircle(34, 17, 2);
    graphics.generateTexture(TEXTURE_KEYS.STONE_WARDEN, 52, 52);
    graphics.clear();

    graphics.fillStyle(0x6e376e, 0.55);
    graphics.fillCircle(8, 8, 8);
    graphics.fillStyle(0xd77f61, 0.95);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0xffdda1, 1);
    graphics.fillCircle(8, 8, 2);
    graphics.generateTexture(TEXTURE_KEYS.ASH_PROJECTILE, 16, 16);
    graphics.destroy();
  }
}
