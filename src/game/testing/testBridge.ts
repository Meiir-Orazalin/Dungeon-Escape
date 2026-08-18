import Phaser from "phaser";

import { SCENE_KEYS } from "../constants";
import { ENCOUNTER_GAME_OBJECT_NAMES } from "../encounters/config";
import { Player } from "../entities/Player";
import { LOOT_GAME_OBJECT_NAMES } from "../loot/config";
import { GAME_OBJECT_NAMES } from "../objective/config";
import { GameScene, type GameSceneSnapshot } from "../scenes/GameScene";

export interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: GameSceneSnapshot["playerPosition"] | null;
  readonly spawnPosition: GameSceneSnapshot["spawnPosition"] | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly objectiveFingerprint: string | null;
  readonly encounterFingerprint: string | null;
  readonly lootFingerprint: string | null;
  readonly runSeed: string | null;
  readonly runFingerprint: string | null;
  readonly floorCount: number | null;
  readonly currentFloorNumber: number | null;
  readonly currentFloorSeed: string | null;
  readonly currentFloorName: string | null;
  readonly currentFloorThemeId: string | null;
  readonly currentFloorDifficultyId: string | null;
  readonly floorPlans: GameSceneSnapshot["floorPlans"];
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
  readonly floorTimeMs: number | null;
  readonly runTimeMs: number | null;
  readonly totalEnemyCount: number | null;
  readonly aliveEnemyCount: number | null;
  readonly defeatedEnemyCount: number | null;
  readonly playerHealth: number | null;
  readonly playerMaximumHealth: number | null;
  readonly playerFacing: GameSceneSnapshot["playerFacing"] | null;
  readonly playerVitalityStatus: GameSceneSnapshot["playerVitalityStatus"] | null;
  readonly playerInvulnerable: boolean | null;
  readonly playerHitStunned: boolean | null;
  readonly playerAttackState: string | null;
  readonly playerDashState: string | null;
  readonly dashReady: boolean | null;
  readonly runOutcome: GameSceneSnapshot["runOutcome"] | null;
  readonly activeEnemyProjectileCount: number | null;
  readonly defeatOverlayVisible: boolean | null;
  readonly completionOverlayVisible: boolean | null;
  readonly floorClearedOverlayVisible: boolean | null;
  readonly runVictoryOverlayVisible: boolean | null;
  readonly runDefeatOverlayVisible: boolean | null;
  readonly threatRoomCount: number | null;
  readonly enemies: GameSceneSnapshot["enemies"];
  readonly effectiveEnemyDifficulty: GameSceneSnapshot["effectiveEnemyDifficulty"] | null;
  readonly forgeRoomId: number | null;
  readonly forgePosition: GameSceneSnapshot["forgePosition"] | null;
  readonly forgeState: string | null;
  readonly availableShardCount: number | null;
  readonly totalCollectedShardCount: number | null;
  readonly currentForgeCost: number | null;
  readonly forgeUpgradesCompleted: number | null;
  readonly currentFloorForgePurchases: number | null;
  readonly forgeExhausted: boolean | null;
  readonly upgradeOverlayVisible: boolean | null;
  readonly currentUpgradeOfferIds: GameSceneSnapshot["currentUpgradeOfferIds"];
  readonly currentUpgradeOfferFingerprint: string | null;
  readonly selectedUpgradeIds: GameSceneSnapshot["selectedUpgradeIds"];
  readonly effectiveMeleeDamage: number | null;
  readonly effectiveMeleeRange: number | null;
  readonly effectiveAttackRecovery: number | null;
  readonly effectiveAttackCooldown: number | null;
  readonly effectiveDashCooldown: number | null;
  readonly effectiveMaximumHealth: number | null;
  readonly effectivePostHitInvulnerability: number | null;
  readonly effectiveMovementMultiplier: number | null;
  readonly effectiveHitStunDuration: number | null;
  readonly effectivePlayerKnockbackDuration: number | null;
  readonly totalChestCount: number | null;
  readonly openedChestCount: number | null;
  readonly chests: GameSceneSnapshot["chests"];
  readonly pickups: GameSceneSnapshot["pickups"];
  readonly flaskConsumptionCount: number | null;
  readonly enemyRewards: GameSceneSnapshot["enemyRewards"];
  readonly runActivity: GameSceneSnapshot["runActivity"] | null;
  readonly checkpoint: GameSceneSnapshot["checkpoint"] | null;
  readonly cumulativeStatistics: GameSceneSnapshot["cumulativeStatistics"] | null;
  readonly currentFloorStatistics: GameSceneSnapshot["currentFloorStatistics"] | null;
  readonly completedFloorSummaries: GameSceneSnapshot["completedFloorSummaries"];
}

export interface DungeonEscapeE2EBridge {
  snapshot: () => E2ESnapshot;
  teleportToTarget: (target: "spawn" | "key" | "gate") => void;
  teleportNearEnemy: (enemyId: string) => void;
  teleportOntoEnemy: (enemyId: string) => void;
  teleportToChest: (chestId: string) => void;
  teleportToForge: () => void;
  teleportToPickup: (pickupId: string) => void;
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
        encounterFingerprint: gameSnapshot?.encounterFingerprint ?? null,
        lootFingerprint: gameSnapshot?.lootFingerprint ?? null,
        runSeed: gameSnapshot?.runSeed ?? null,
        runFingerprint: gameSnapshot?.runFingerprint ?? null,
        floorCount: gameSnapshot?.floorCount ?? null,
        currentFloorNumber: gameSnapshot?.currentFloorNumber ?? null,
        currentFloorSeed: gameSnapshot?.currentFloorSeed ?? null,
        currentFloorName: gameSnapshot?.currentFloorName ?? null,
        currentFloorThemeId: gameSnapshot?.currentFloorThemeId ?? null,
        currentFloorDifficultyId: gameSnapshot?.currentFloorDifficultyId ?? null,
        floorPlans: gameSnapshot?.floorPlans ?? [],
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
        floorTimeMs: gameSnapshot?.floorTimeMs ?? null,
        runTimeMs: gameSnapshot?.runTimeMs ?? null,
        totalEnemyCount: gameSnapshot?.totalEnemyCount ?? null,
        aliveEnemyCount: gameSnapshot?.aliveEnemyCount ?? null,
        defeatedEnemyCount: gameSnapshot?.defeatedEnemyCount ?? null,
        playerHealth: gameSnapshot?.playerHealth ?? null,
        playerMaximumHealth: gameSnapshot?.playerMaximumHealth ?? null,
        playerFacing: gameSnapshot?.playerFacing ?? null,
        playerVitalityStatus: gameSnapshot?.playerVitalityStatus ?? null,
        playerInvulnerable: gameSnapshot?.playerInvulnerable ?? null,
        playerHitStunned: gameSnapshot?.playerHitStunned ?? null,
        playerAttackState: gameSnapshot?.playerAttackState ?? null,
        playerDashState: gameSnapshot?.playerDashState ?? null,
        dashReady: gameSnapshot?.dashReady ?? null,
        runOutcome: gameSnapshot?.runOutcome ?? null,
        activeEnemyProjectileCount: gameSnapshot?.activeEnemyProjectileCount ?? null,
        defeatOverlayVisible: gameSnapshot?.defeatOverlayVisible ?? null,
        completionOverlayVisible: gameSnapshot?.completionOverlayVisible ?? null,
        floorClearedOverlayVisible: gameSnapshot?.floorClearedOverlayVisible ?? null,
        runVictoryOverlayVisible: gameSnapshot?.runVictoryOverlayVisible ?? null,
        runDefeatOverlayVisible: gameSnapshot?.runDefeatOverlayVisible ?? null,
        threatRoomCount: gameSnapshot?.threatRoomCount ?? null,
        enemies: gameSnapshot?.enemies ?? [],
        effectiveEnemyDifficulty: gameSnapshot?.effectiveEnemyDifficulty ?? null,
        forgeRoomId: gameSnapshot?.forgeRoomId ?? null,
        forgePosition: gameSnapshot?.forgePosition ?? null,
        forgeState: gameSnapshot?.forgeState ?? null,
        availableShardCount: gameSnapshot?.availableShardCount ?? null,
        totalCollectedShardCount: gameSnapshot?.totalCollectedShardCount ?? null,
        currentForgeCost: gameSnapshot?.currentForgeCost ?? null,
        forgeUpgradesCompleted: gameSnapshot?.forgeUpgradesCompleted ?? null,
        currentFloorForgePurchases: gameSnapshot?.currentFloorForgePurchases ?? null,
        forgeExhausted: gameSnapshot?.forgeExhausted ?? null,
        upgradeOverlayVisible: gameSnapshot?.upgradeOverlayVisible ?? null,
        currentUpgradeOfferIds: gameSnapshot?.currentUpgradeOfferIds ?? [],
        currentUpgradeOfferFingerprint: gameSnapshot?.currentUpgradeOfferFingerprint ?? null,
        selectedUpgradeIds: gameSnapshot?.selectedUpgradeIds ?? [],
        effectiveMeleeDamage: gameSnapshot?.effectiveMeleeDamage ?? null,
        effectiveMeleeRange: gameSnapshot?.effectiveMeleeRange ?? null,
        effectiveAttackRecovery: gameSnapshot?.effectiveAttackRecovery ?? null,
        effectiveAttackCooldown: gameSnapshot?.effectiveAttackCooldown ?? null,
        effectiveDashCooldown: gameSnapshot?.effectiveDashCooldown ?? null,
        effectiveMaximumHealth: gameSnapshot?.effectiveMaximumHealth ?? null,
        effectivePostHitInvulnerability: gameSnapshot?.effectivePostHitInvulnerability ?? null,
        effectiveMovementMultiplier: gameSnapshot?.effectiveMovementMultiplier ?? null,
        effectiveHitStunDuration: gameSnapshot?.effectiveHitStunDuration ?? null,
        effectivePlayerKnockbackDuration: gameSnapshot?.effectivePlayerKnockbackDuration ?? null,
        totalChestCount: gameSnapshot?.totalChestCount ?? null,
        openedChestCount: gameSnapshot?.openedChestCount ?? null,
        chests: gameSnapshot?.chests ?? [],
        pickups: gameSnapshot?.pickups ?? [],
        flaskConsumptionCount: gameSnapshot?.flaskConsumptionCount ?? null,
        enemyRewards: gameSnapshot?.enemyRewards ?? [],
        runActivity: gameSnapshot?.runActivity ?? null,
        checkpoint: gameSnapshot?.checkpoint ?? null,
        cumulativeStatistics: gameSnapshot?.cumulativeStatistics ?? null,
        currentFloorStatistics: gameSnapshot?.currentFloorStatistics ?? null,
        completedFloorSummaries: gameSnapshot?.completedFloorSummaries ?? [],
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
    teleportNearEnemy: (enemyId): void => {
      teleportRelativeToEnemy(game, enemyId, 52);
    },
    teleportOntoEnemy: (enemyId): void => {
      teleportRelativeToEnemy(game, enemyId, 0);
    },
    teleportToChest: (chestId): void => {
      const scene = requireActiveGameScene(game);
      const snapshot = scene.getTestSnapshot();
      const chest = snapshot?.chests.find((candidate) => candidate.id === chestId);
      if (!snapshot || snapshot.runOutcome !== "active" || !chest || chest.opened) {
        throw new Error(`Cannot teleport because closed chest ${chestId} is unavailable.`);
      }
      teleportPlayerToNamedContainer(
        scene,
        `${LOOT_GAME_OBJECT_NAMES.CHEST_PREFIX}${chestId}`,
        "Treasure Chest",
      );
    },
    teleportToForge: (): void => {
      const scene = requireActiveGameScene(game);
      const snapshot = scene.getTestSnapshot();
      if (!snapshot || snapshot.runOutcome !== "active" || snapshot.forgeExhausted) {
        throw new Error("Cannot teleport because the active Runeforge is unavailable.");
      }
      teleportPlayerToNamedContainer(scene, LOOT_GAME_OBJECT_NAMES.FORGE, "Runeforge");
    },
    teleportToPickup: (pickupId): void => {
      const scene = requireActiveGameScene(game);
      const snapshot = scene.getTestSnapshot();
      const pickup = snapshot?.pickups.find((candidate) => candidate.id === pickupId);
      if (!snapshot || snapshot.runOutcome !== "active" || !pickup?.active) {
        throw new Error(`Cannot teleport because active pickup ${pickupId} is unavailable.`);
      }
      teleportPlayerToNamedContainer(
        scene,
        `${LOOT_GAME_OBJECT_NAMES.PICKUP_PREFIX}${pickupId}`,
        "loot pickup",
      );
    },
  };
}

function requireActiveGameScene(game: Phaser.Game): GameScene {
  if (!game.scene.isActive(SCENE_KEYS.GAME)) {
    throw new Error("Cannot teleport without an active GameScene.");
  }
  const scene = game.scene.getScene(SCENE_KEYS.GAME);
  if (!(scene instanceof GameScene)) throw new Error("Active GameScene is unavailable.");
  return scene;
}

function teleportPlayerToNamedContainer(scene: GameScene, objectName: string, label: string): void {
  const snapshot = scene.getTestSnapshot();
  if (!snapshot || snapshot.runActivity !== "playing") {
    throw new Error(`Cannot teleport to ${label} unless the active run is playing.`);
  }
  const player = scene.children.getByName(GAME_OBJECT_NAMES.PLAYER);
  const target = scene.children.getByName(objectName);
  if (!(player instanceof Player) || !(target instanceof Phaser.GameObjects.Container)) {
    throw new Error(`Cannot teleport because ${label} or the player is unavailable.`);
  }
  const body = player.body as Phaser.Physics.Arcade.Body;
  body.reset(target.x, target.y);
  player.setVelocity(0, 0);
}

function teleportRelativeToEnemy(game: Phaser.Game, enemyId: string, distance: number): void {
  if (!game.scene.isActive(SCENE_KEYS.GAME)) {
    throw new Error("Cannot teleport near an enemy without an active GameScene.");
  }
  const gameScene = game.scene.getScene(SCENE_KEYS.GAME);
  const snapshot = gameScene instanceof GameScene ? gameScene.getTestSnapshot() : null;
  if (!snapshot || snapshot.runOutcome !== "active") {
    throw new Error("Cannot teleport near an enemy unless the run is active.");
  }
  const summary = snapshot.enemies.find((enemy) => enemy.id === enemyId);
  if (!summary || !summary.alive) {
    throw new Error(`Cannot teleport because living enemy ${enemyId} is unavailable.`);
  }
  const playerObject = gameScene.children.getByName(GAME_OBJECT_NAMES.PLAYER);
  const enemyObject = gameScene.children.getByName(
    `${ENCOUNTER_GAME_OBJECT_NAMES.ENEMY_PREFIX}${enemyId}`,
  );
  if (!(playerObject instanceof Player) || !(enemyObject instanceof Phaser.Physics.Arcade.Sprite)) {
    throw new Error(`Cannot teleport because enemy ${enemyId} or the player is unavailable.`);
  }
  const homeRoom = enemyObject.getData("homeRoom") as unknown;
  if (!isHomeRoomData(homeRoom)) {
    throw new Error(`Cannot teleport because enemy ${enemyId} has no valid home-room metadata.`);
  }
  const roomCenter = {
    x: (homeRoom.x + homeRoom.width / 2) * homeRoom.tileSize,
    y: (homeRoom.y + homeRoom.height / 2) * homeRoom.tileSize,
  };
  const towardCenter = new Phaser.Math.Vector2(
    roomCenter.x - enemyObject.x,
    roomCenter.y - enemyObject.y,
  );
  if (towardCenter.lengthSq() === 0) towardCenter.set(1, 0);
  towardCenter.normalize();
  const x = enemyObject.x + towardCenter.x * distance;
  const y = enemyObject.y + towardCenter.y * distance;
  const body = playerObject.body as Phaser.Physics.Arcade.Body;
  body.reset(x, y);
  playerObject.setVelocity(0, 0);
  playerObject.setFacing({ x: enemyObject.x - x, y: enemyObject.y - y });
}

interface HomeRoomData {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
}

function isHomeRoomData(value: unknown): value is HomeRoomData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<HomeRoomData>;
  return [candidate.x, candidate.y, candidate.width, candidate.height, candidate.tileSize].every(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  );
}
