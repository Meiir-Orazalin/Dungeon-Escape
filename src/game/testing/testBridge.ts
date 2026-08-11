import Phaser from "phaser";

import { SCENE_KEYS } from "../constants";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { GameScene, type GameSceneSnapshot } from "../scenes/GameScene";

export interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: GameSceneSnapshot["playerPosition"] | null;
  readonly spawnPosition: GameSceneSnapshot["spawnPosition"] | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly objectiveFingerprint: string | null;
  readonly roomCount: number | null;
  readonly spawnRoomId: number | null;
  readonly destinationRoomId: number | null;
  readonly keyRoomId: number | null;
  readonly gateRoomId: number | null;
  readonly keyPosition: GameSceneSnapshot["keyPosition"] | null;
  readonly gatePosition: GameSceneSnapshot["gatePosition"] | null;
  readonly worldSize: GameSceneSnapshot["worldSize"] | null;
  readonly discoveredRoomCount: number | null;
  readonly currentRoomId: number | null;
  readonly playerOnWalkableTile: boolean | null;
  readonly objectiveStatus: GameSceneSnapshot["objectiveStatus"] | null;
  readonly keyCollected: boolean | null;
  readonly keyObjectActive: boolean | null;
  readonly gateReady: boolean | null;
  readonly floorComplete: boolean | null;
  readonly movementEnabled: boolean | null;
  readonly interactionPrompt: string | null;
  readonly elapsedTimeMs: number | null;
}

export interface DungeonEscapeE2EBridge {
  snapshot: () => E2ESnapshot;
  teleportToTarget: (target: "spawn" | "key" | "gate") => void;
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
        objectiveFingerprint: gameSnapshot?.objectiveFingerprint ?? null,
        roomCount: gameSnapshot?.roomCount ?? null,
        spawnRoomId: gameSnapshot?.spawnRoomId ?? null,
        destinationRoomId: gameSnapshot?.destinationRoomId ?? null,
        keyRoomId: gameSnapshot?.keyRoomId ?? null,
        gateRoomId: gameSnapshot?.gateRoomId ?? null,
        keyPosition: gameSnapshot?.keyPosition ?? null,
        gatePosition: gameSnapshot?.gatePosition ?? null,
        worldSize: gameSnapshot?.worldSize ?? null,
        discoveredRoomCount: gameSnapshot?.discoveredRoomCount ?? null,
        currentRoomId: gameSnapshot?.currentRoomId ?? null,
        playerOnWalkableTile: gameSnapshot?.playerOnWalkableTile ?? null,
        objectiveStatus: gameSnapshot?.objectiveStatus ?? null,
        keyCollected: gameSnapshot?.keyCollected ?? null,
        keyObjectActive: gameSnapshot?.keyObjectActive ?? null,
        gateReady: gameSnapshot?.gateReady ?? null,
        floorComplete: gameSnapshot?.floorComplete ?? null,
        movementEnabled: gameSnapshot?.movementEnabled ?? null,
        interactionPrompt: gameSnapshot?.interactionPrompt ?? null,
        elapsedTimeMs: gameSnapshot?.elapsedTimeMs ?? null,
      };
    },
    teleportToTarget: (target): void => {
      if (!game.scene.isActive(SCENE_KEYS.GAME)) {
        throw new Error("Cannot teleport without an active GameScene.");
      }
      const gameScene = game.scene.getScene(SCENE_KEYS.GAME);
      const gameSnapshot = gameScene instanceof GameScene ? gameScene.getTestSnapshot() : null;
      const player = gameScene.children.getByName(GAME_OBJECT_NAMES.PLAYER);
      if (!gameSnapshot || !(player instanceof Phaser.Physics.Arcade.Sprite)) {
        throw new Error("Cannot teleport because the active player is unavailable.");
      }

      const targetObjectName =
        target === "key"
          ? GAME_OBJECT_NAMES.RUNIC_KEY
          : target === "gate"
            ? GAME_OBJECT_NAMES.ANCIENT_GATE
            : null;
      const targetObject = targetObjectName ? gameScene.children.getByName(targetObjectName) : null;
      if (
        targetObjectName &&
        (!(targetObject instanceof Phaser.GameObjects.Container) ||
          !targetObject.active ||
          !targetObject.visible)
      ) {
        throw new Error(`Cannot teleport because the ${target} target is unavailable.`);
      }
      const position =
        target === "spawn"
          ? gameSnapshot.spawnPosition
          : {
              x: (targetObject as Phaser.GameObjects.Container).x,
              y: (targetObject as Phaser.GameObjects.Container).y,
            };
      const body = player.body as Phaser.Physics.Arcade.Body;
      body.reset(position.x, position.y);
      player.setVelocity(0, 0);
    },
  };
}
