import type Phaser from "phaser";

import { SCENE_KEYS } from "../constants";
import { GameScene, type GameSceneSnapshot } from "../scenes/GameScene";

export interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: GameSceneSnapshot["playerPosition"] | null;
  readonly spawnPosition: GameSceneSnapshot["spawnPosition"] | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly roomCount: number | null;
  readonly spawnRoomId: number | null;
  readonly destinationRoomId: number | null;
  readonly worldSize: GameSceneSnapshot["worldSize"] | null;
  readonly discoveredRoomCount: number | null;
  readonly currentRoomId: number | null;
  readonly playerOnWalkableTile: boolean | null;
}

export interface DungeonEscapeE2EBridge {
  snapshot: () => E2ESnapshot;
}

interface E2EWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: DungeonEscapeE2EBridge;
}

export function installE2EBridge(game: Phaser.Game): void {
  const e2eWindow = window as E2EWindow;

  e2eWindow.__DUNGEON_ESCAPE_E2E__ = {
    snapshot: (): E2ESnapshot => {
      const activeScene = game.scene.getScenes(true).at(-1)?.scene.key ?? null;
      const gameScene = game.scene.getScene(SCENE_KEYS.GAME);
      const gameSnapshot = gameScene instanceof GameScene ? gameScene.getTestSnapshot() : null;

      return {
        activeScene,
        playerPosition: gameSnapshot?.playerPosition ?? null,
        spawnPosition: gameSnapshot?.spawnPosition ?? null,
        seed: gameSnapshot?.seed ?? null,
        layoutFingerprint: gameSnapshot?.layoutFingerprint ?? null,
        roomCount: gameSnapshot?.roomCount ?? null,
        spawnRoomId: gameSnapshot?.spawnRoomId ?? null,
        destinationRoomId: gameSnapshot?.destinationRoomId ?? null,
        worldSize: gameSnapshot?.worldSize ?? null,
        discoveredRoomCount: gameSnapshot?.discoveredRoomCount ?? null,
        currentRoomId: gameSnapshot?.currentRoomId ?? null,
        playerOnWalkableTile: gameSnapshot?.playerOnWalkableTile ?? null,
      };
    },
  };
}
