import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { rendererTypeForBoot } from "./platform/renderer";

export function createGameConfig(
  rendererOverride?: string,
  isE2E = import.meta.env.MODE === "e2e",
): Phaser.Types.Core.GameConfig {
  return {
    type: rendererTypeForBoot(isE2E, rendererOverride),
    parent: "game-container",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#080b0d",
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, MenuScene, GameScene],
  };
}

export const gameConfig = createGameConfig();
