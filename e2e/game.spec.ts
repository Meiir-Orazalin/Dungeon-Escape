import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { COMBAT_CONFIG } from "../src/game/combat/config";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_BODY_SIZE } from "../src/game/constants";
import { generateDungeon } from "../src/game/dungeon/generateDungeon";
import type { DungeonLayout } from "../src/game/dungeon/types";

interface Position {
  readonly x: number;
  readonly y: number;
}

type EnemyArchetype = "bone-stalker" | "ash-wisp" | "stone-warden";

interface EnemySummary {
  readonly id: string;
  readonly archetype: EnemyArchetype;
  readonly roomId: number;
  readonly position: Position;
  readonly spawnPosition: Position;
  readonly currentHealth: number;
  readonly maximumHealth: number;
  readonly alive: boolean;
  readonly state: string;
}

interface ChestSummary {
  readonly id: string;
  readonly roomId: number;
  readonly position: Position;
  readonly opened: boolean;
  readonly shardAmount: number;
  readonly containsFlask: boolean;
}

interface PickupSummary {
  readonly id: string;
  readonly type: "shard" | "flask";
  readonly amount: number;
  readonly position: Position;
  readonly active: boolean;
  readonly sourceId: string;
}

interface EnemyRewardSummary {
  readonly enemyId: string;
  readonly shardAmount: number;
  readonly containsFlask: boolean;
}

interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: Position | null;
  readonly spawnPosition: Position | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly objectiveFingerprint: string | null;
  readonly encounterFingerprint: string | null;
  readonly lootFingerprint: string | null;
  readonly roomCount: number | null;
  readonly spawnRoomId: number | null;
  readonly destinationRoomId: number | null;
  readonly keyRoomId: number | null;
  readonly gateRoomId: number | null;
  readonly keyPosition: Position | null;
  readonly gatePosition: Position | null;
  readonly worldSize: { readonly width: number; readonly height: number } | null;
  readonly discoveredRoomCount: number | null;
  readonly currentRoomId: number | null;
  readonly playerOnWalkableTile: boolean | null;
  readonly objectiveStatus: "seeking-key" | "key-collected" | "completed" | null;
  readonly keyCollected: boolean | null;
  readonly keyObjectActive: boolean | null;
  readonly gateReady: boolean | null;
  readonly floorComplete: boolean | null;
  readonly movementEnabled: boolean | null;
  readonly interactionPrompt: string | null;
  readonly elapsedTimeMs: number | null;
  readonly totalEnemyCount: number | null;
  readonly aliveEnemyCount: number | null;
  readonly defeatedEnemyCount: number | null;
  readonly playerHealth: number | null;
  readonly playerMaximumHealth: number | null;
  readonly playerFacing: Position | null;
  readonly playerVitalityStatus: "alive" | "defeated" | null;
  readonly playerInvulnerable: boolean | null;
  readonly playerHitStunned: boolean | null;
  readonly playerAttackState: string | null;
  readonly playerDashState: string | null;
  readonly dashReady: boolean | null;
  readonly runOutcome: "active" | "escaped" | "defeated" | null;
  readonly activeEnemyProjectileCount: number | null;
  readonly defeatOverlayVisible: boolean | null;
  readonly completionOverlayVisible: boolean | null;
  readonly threatRoomCount: number | null;
  readonly enemies: readonly EnemySummary[];
  readonly forgeRoomId: number | null;
  readonly forgePosition: Position | null;
  readonly forgeState: string | null;
  readonly availableShardCount: number | null;
  readonly totalCollectedShardCount: number | null;
  readonly currentForgeCost: number | null;
  readonly forgeUpgradesCompleted: number | null;
  readonly forgeExhausted: boolean | null;
  readonly upgradeOverlayVisible: boolean | null;
  readonly currentUpgradeOfferIds: readonly string[];
  readonly currentUpgradeOfferFingerprint: string | null;
  readonly selectedUpgradeIds: readonly string[];
  readonly effectiveMeleeDamage: number | null;
  readonly effectiveMeleeRange: number | null;
  readonly effectiveAttackRecovery: number | null;
  readonly effectiveAttackCooldown: number | null;
  readonly effectiveDashCooldown: number | null;
  readonly effectiveMaximumHealth: number | null;
  readonly effectivePostHitInvulnerability: number | null;
  readonly totalChestCount: number | null;
  readonly openedChestCount: number | null;
  readonly chests: readonly ChestSummary[];
  readonly pickups: readonly PickupSummary[];
  readonly flaskConsumptionCount: number | null;
  readonly enemyRewards: readonly EnemyRewardSummary[];
  readonly runActivity: "playing" | "choosing-upgrade" | null;
}

interface TestWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => E2ESnapshot;
    teleportToTarget: (target: "spawn" | "key" | "gate") => void;
    teleportNearEnemy: (enemyId: string) => void;
    teleportOntoEnemy: (enemyId: string) => void;
    teleportToChest: (chestId: string) => void;
    teleportToForge: () => void;
    teleportToPickup: (pickupId: string) => void;
  };
}

interface WallApproach {
  readonly key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
  readonly axis: "x" | "y";
  readonly expectedPosition: number;
}

const FIXED_SEED = "e2e-runic-gate";

async function getSnapshot(page: Page): Promise<E2ESnapshot> {
  return page.evaluate(() => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    return bridge.snapshot();
  });
}

async function teleportToTarget(page: Page, target: "spawn" | "key" | "gate"): Promise<void> {
  await page.evaluate((requestedTarget) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportToTarget(requestedTarget);
  }, target);
}

async function teleportNearEnemy(page: Page, enemyId: string): Promise<void> {
  await page.evaluate((id) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportNearEnemy(id);
  }, enemyId);
}

async function teleportOntoEnemy(page: Page, enemyId: string): Promise<void> {
  await page.evaluate((id) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportOntoEnemy(id);
  }, enemyId);
}

async function teleportToChest(page: Page, chestId: string): Promise<void> {
  await page.evaluate((id) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportToChest(id);
  }, chestId);
}

async function teleportToForge(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportToForge();
  });
}

async function teleportToPickup(page: Page, pickupId: string): Promise<void> {
  await page.evaluate((id) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportToPickup(id);
  }, pickupId);
}

async function openChest(page: Page, chestId: string): Promise<void> {
  await teleportToChest(page, chestId);
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  OPEN TREASURE CHEST");
  await page.keyboard.press("e");
  await expect
    .poll(
      async () => (await getSnapshot(page)).chests.find((chest) => chest.id === chestId)?.opened,
    )
    .toBe(true);
}

async function collectPickup(page: Page, pickupId: string): Promise<void> {
  await teleportToTarget(page, "spawn");
  await page.waitForTimeout(50);
  await teleportToPickup(page, pickupId);
  await expect
    .poll(async () => (await getSnapshot(page)).pickups.some((pickup) => pickup.id === pickupId))
    .toBe(false);
}

async function defeatEnemyWithSword(page: Page, enemyId: string): Promise<void> {
  let summary = enemyById(await getSnapshot(page), enemyId);
  while (summary.alive) {
    const previousHealth = summary.currentHealth;
    await expect.poll(async () => (await getSnapshot(page)).playerAttackState).toBe("ready");
    await teleportNearEnemy(page, enemyId);
    await page.keyboard.press("Space");
    await expect
      .poll(async () => enemyById(await getSnapshot(page), enemyId).currentHealth, {
        timeout: 3_000,
      })
      .toBeLessThan(previousHealth);
    summary = enemyById(await getSnapshot(page), enemyId);
  }
}

async function collectAllChestShards(page: Page): Promise<E2ESnapshot> {
  const chests = (await getSnapshot(page)).chests;
  for (const chest of chests) {
    await openChest(page, chest.id);
    const shard = (await getSnapshot(page)).pickups.find(
      (pickup) => pickup.sourceId === chest.id && pickup.type === "shard",
    );
    if (!shard) throw new Error(`Chest ${chest.id} did not create its shard pickup.`);
    await collectPickup(page, shard.id);
  }
  return getSnapshot(page);
}

async function collectEnemyShard(page: Page, enemyId: string): Promise<E2ESnapshot> {
  await defeatEnemyWithSword(page, enemyId);
  const shard = (await getSnapshot(page)).pickups.find(
    (pickup) => pickup.sourceId === enemyId && pickup.type === "shard",
  );
  if (!shard) throw new Error(`Enemy ${enemyId} did not create its planned shard pickup.`);
  await collectPickup(page, shard.id);
  return getSnapshot(page);
}

function enemyById(snapshot: E2ESnapshot, enemyId: string): EnemySummary {
  const enemy = snapshot.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) throw new Error(`Missing E2E enemy ${enemyId}.`);
  return enemy;
}

function enemyByArchetype(snapshot: E2ESnapshot, archetype: EnemyArchetype): EnemySummary {
  const enemy = snapshot.enemies.find((candidate) => candidate.archetype === archetype);
  if (!enemy) throw new Error(`Missing E2E ${archetype}.`);
  return enemy;
}

async function defeatPlayer(page: Page, enemyId: string): Promise<E2ESnapshot> {
  for (let expectedHealth = 4; expectedHealth >= 0; expectedHealth -= 1) {
    await teleportOntoEnemy(page, enemyId);
    await expect.poll(async () => (await getSnapshot(page)).playerHealth).toBe(expectedHealth);
    if (expectedHealth > 0) {
      await teleportToTarget(page, "spawn");
      await expect.poll(async () => (await getSnapshot(page)).playerInvulnerable).toBe(false);
    }
  }
  await expect.poll(async () => (await getSnapshot(page)).runOutcome).toBe("defeated");
  await expect.poll(async () => (await getSnapshot(page)).defeatOverlayVisible).toBe(true);
  return getSnapshot(page);
}

async function waitForScene(page: Page, sceneKey: string): Promise<void> {
  await expect.poll(async () => (await getSnapshot(page)).activeScene).toBe(sceneKey);
}

async function openMenu(page: Page, seed = FIXED_SEED): Promise<void> {
  await page.goto(`/?seed=${encodeURIComponent(seed)}`);
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");
}

async function clickCanvasPoint(page: Page, logicalX: number, logicalY: number): Promise<void> {
  const canvas = page.locator("#game-container canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("The game canvas has no visible bounds.");
  await page.mouse.click(
    bounds.x + (logicalX / GAME_WIDTH) * bounds.width,
    bounds.y + (logicalY / GAME_HEIGHT) * bounds.height,
  );
}

async function startWithPointer(page: Page): Promise<void> {
  await clickCanvasPoint(page, GAME_WIDTH / 2, 318);
  await waitForScene(page, "GameScene");
}

async function startWithKey(page: Page, key: "Enter" | "Space" = "Enter"): Promise<void> {
  await page.keyboard.press(key);
  await waitForScene(page, "GameScene");
}

async function collectKey(page: Page): Promise<void> {
  await teleportToTarget(page, "key");
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  TAKE RUNIC KEY");
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).objectiveStatus).toBe("key-collected");
}

async function completeFloor(page: Page): Promise<E2ESnapshot> {
  await collectKey(page);
  await teleportToTarget(page, "gate");
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  OPEN ANCIENT GATE");
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).floorComplete).toBe(true);
  return getSnapshot(page);
}

async function waitForCompletionOverlay(page: Page): Promise<void> {
  await expect
    .poll(async () => (await getSnapshot(page)).completionOverlayVisible, { timeout: 5_000 })
    .toBe(true);
}

async function waitForDashActive(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as TestWindow).__DUNGEON_ESCAPE_E2E__?.snapshot().playerDashState === "active",
    undefined,
    { polling: "raf", timeout: 2_000 },
  );
}

function findNearestWallApproach(layout: DungeonLayout): WallApproach {
  const directions = [
    { key: "ArrowUp" as const, axis: "y" as const, dx: 0, dy: -1 },
    { key: "ArrowDown" as const, axis: "y" as const, dx: 0, dy: 1 },
    { key: "ArrowLeft" as const, axis: "x" as const, dx: -1, dy: 0 },
    { key: "ArrowRight" as const, axis: "x" as const, dx: 1, dy: 0 },
  ];

  return directions
    .map((direction) => {
      let tileX = layout.spawn.tileX;
      let tileY = layout.spawn.tileY;
      while (layout.floorMask[tileY * layout.mapWidth + tileX] === true) {
        tileX += direction.dx;
        tileY += direction.dy;
      }
      const wallEdge =
        direction.axis === "x"
          ? direction.dx > 0
            ? tileX * layout.tileSize
            : (tileX + 1) * layout.tileSize
          : direction.dy > 0
            ? tileY * layout.tileSize
            : (tileY + 1) * layout.tileSize;
      const expectedPosition =
        wallEdge +
        (direction.dx < 0 || direction.dy < 0 ? PLAYER_BODY_SIZE / 2 : -PLAYER_BODY_SIZE / 2);
      const spawnAxis = direction.axis === "x" ? layout.spawn.x : layout.spawn.y;
      return {
        key: direction.key,
        axis: direction.axis,
        expectedPosition,
        travelDistance: Math.abs(expectedPosition - spawnAxis),
      };
    })
    .sort((left, right) => left.travelDistance - right.travelDistance)[0] as WallApproach;
}

test("generated objective preserves movement, collision, minimap start, timer, and resize", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  await openMenu(page);
  const canvas = page.locator("#game-container canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator("#game-state")).toContainText("Main menu");
  await startWithPointer(page);

  const initial = await getSnapshot(page);
  expect(initial.seed).toBe(FIXED_SEED);
  expect(initial.layoutFingerprint).toMatch(/^dg-[0-9a-f]{8}$/);
  expect(initial.objectiveFingerprint).toMatch(/^eo-[0-9a-f]{8}$/);
  expect(initial.encounterFingerprint).toMatch(/^ec-[0-9a-f]{8}$/);
  expect(initial.roomCount).toBeGreaterThanOrEqual(10);
  expect(initial.totalEnemyCount).toBe((initial.roomCount ?? 0) - 1);
  expect(initial.aliveEnemyCount).toBe(initial.totalEnemyCount);
  expect(initial.defeatedEnemyCount).toBe(0);
  expect(initial.playerHealth).toBe(5);
  expect(initial.playerMaximumHealth).toBe(5);
  expect(initial.dashReady).toBe(true);
  expect(initial.activeEnemyProjectileCount).toBe(0);
  expect(new Set(initial.enemies.map((enemy) => enemy.archetype))).toEqual(
    new Set(["bone-stalker", "ash-wisp", "stone-warden"]),
  );
  expect(initial.enemies.find((enemy) => enemy.roomId === initial.spawnRoomId)).toBeUndefined();
  expect(initial.enemies.find((enemy) => enemy.roomId === initial.keyRoomId)?.archetype).toBe(
    "ash-wisp",
  );
  expect(initial.enemies.find((enemy) => enemy.roomId === initial.gateRoomId)?.archetype).toBe(
    "stone-warden",
  );
  expect(initial.worldSize).toEqual({ width: 2304, height: 1408 });
  expect(initial.playerPosition).toEqual(initial.spawnPosition);
  expect(new Set([initial.spawnRoomId, initial.keyRoomId, initial.gateRoomId]).size).toBe(3);
  expect(initial.objectiveStatus).toBe("seeking-key");
  expect(initial.keyObjectActive).toBe(true);
  expect(initial.gateReady).toBe(false);
  expect(initial.discoveredRoomCount).toBe(1);
  expect(initial.currentRoomId).toBe(initial.spawnRoomId);
  expect(initial.playerOnWalkableTile).toBe(true);
  await expect(page.locator("#game-state")).toContainText("Find the Runic Key");
  await expect.poll(async () => (await getSnapshot(page)).elapsedTimeMs ?? 0).toBeGreaterThan(100);

  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition?.x ?? 0)
    .toBeGreaterThan((initial.spawnPosition?.x ?? 0) + 20);
  await page.keyboard.up("ArrowRight");

  await teleportToTarget(page, "spawn");
  const approach = findNearestWallApproach(generateDungeon(FIXED_SEED));
  await page.keyboard.down(approach.key);
  await expect
    .poll(async () => {
      const position = (await getSnapshot(page)).playerPosition;
      return position ? position[approach.axis] : Number.NaN;
    })
    .toBeCloseTo(approach.expectedPosition, 0);
  await page.waitForTimeout(150);
  await page.keyboard.up(approach.key);
  const blocked = await getSnapshot(page);
  expect(blocked.playerPosition?.[approach.axis]).toBeCloseTo(approach.expectedPosition, 0);
  expect(blocked.playerOnWalkableTile).toBe(true);

  await page.setViewportSize({ width: 720, height: 700 });
  await expect(canvas).toBeVisible();
  const resizedBounds = await canvas.boundingBox();
  expect(resizedBounds?.width).toBeGreaterThan(500);
  expect((resizedBounds?.width ?? 0) / (resizedBounds?.height ?? 1)).toBeCloseTo(16 / 9, 1);
  expect((await getSnapshot(page)).activeScene).toBe("GameScene");
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("a fixed URL seed reproduces the dungeon and complete objective plan after reload", async ({
  page,
}) => {
  await openMenu(page, "Stable_Objective-42");
  await startWithKey(page, "Enter");
  const first = await getSnapshot(page);
  expect(first.seed).toBe("stable_objective-42");
  expect(new URL(page.url()).searchParams.get("seed")).toBe("stable_objective-42");

  await page.reload();
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");
  await startWithKey(page, "Enter");
  const second = await getSnapshot(page);
  expect(second.layoutFingerprint).toBe(first.layoutFingerprint);
  expect(second.objectiveFingerprint).toBe(first.objectiveFingerprint);
  expect(second.encounterFingerprint).toBe(first.encounterFingerprint);
  expect(second.spawnPosition).toEqual(first.spawnPosition);
  expect(second.keyRoomId).toBe(first.keyRoomId);
  expect(second.keyPosition).toEqual(first.keyPosition);
  expect(second.gateRoomId).toBe(first.gateRoomId);
  expect(second.gatePosition).toEqual(first.gatePosition);
  expect(
    second.enemies.map(({ id, archetype, roomId, spawnPosition }) => ({
      id,
      archetype,
      roomId,
      spawnPosition,
    })),
  ).toEqual(
    first.enemies.map(({ id, archetype, roomId, spawnPosition }) => ({
      id,
      archetype,
      roomId,
      spawnPosition,
    })),
  );
});

test("the gate blocks before the key, then the real E path completes and R replays cleanly", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMenu(page, "sealed-gate-loop");
  await startWithKey(page);
  const initial = await getSnapshot(page);

  await teleportToTarget(page, "gate");
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  INSPECT SEALED GATE");
  await page.keyboard.press("e");
  const sealed = await getSnapshot(page);
  expect(sealed.floorComplete).toBe(false);
  expect(sealed.gateReady).toBe(false);
  expect(sealed.objectiveStatus).toBe("seeking-key");
  await expect(page.locator("#game-state")).toContainText("sealed");

  await collectKey(page);
  const collected = await getSnapshot(page);
  expect(collected.keyCollected).toBe(true);
  expect(collected.keyObjectActive).toBe(false);
  expect(collected.gateReady).toBe(true);
  expect(collected.objectiveStatus).toBe("key-collected");
  await expect(page.locator("#game-state")).toContainText("Runic Key collected");

  await teleportToTarget(page, "gate");
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).floorComplete).toBe(true);
  const completed = await getSnapshot(page);
  expect(completed.movementEnabled).toBe(false);
  expect(completed.interactionPrompt).toBeNull();
  const frozenTime = completed.elapsedTimeMs;
  const frozenPosition = completed.playerPosition;
  await page.waitForTimeout(450);
  expect((await getSnapshot(page)).elapsedTimeMs).toBe(frozenTime);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(180);
  await page.keyboard.up("ArrowRight");
  expect((await getSnapshot(page)).playerPosition).toEqual(frozenPosition);

  await page.keyboard.press("r");
  await expect.poll(async () => (await getSnapshot(page)).objectiveStatus).toBe("seeking-key");
  const replayed = await getSnapshot(page);
  expect(replayed.seed).toBe(initial.seed);
  expect(replayed.layoutFingerprint).toBe(initial.layoutFingerprint);
  expect(replayed.objectiveFingerprint).toBe(initial.objectiveFingerprint);
  expect(replayed.encounterFingerprint).toBe(initial.encounterFingerprint);
  expect(replayed.playerPosition).toEqual(replayed.spawnPosition);
  expect(replayed.keyObjectActive).toBe(true);
  expect(replayed.keyCollected).toBe(false);
  expect(replayed.gateReady).toBe(false);
  expect(replayed.discoveredRoomCount).toBe(1);
  expect(replayed.elapsedTimeMs).toBeLessThan(1_000);
  expect(replayed.playerHealth).toBe(replayed.playerMaximumHealth);
  expect(replayed.aliveEnemyCount).toBe(replayed.totalEnemyCount);
  expect(replayed.activeEnemyProjectileCount).toBe(0);
  expect(pageErrors).toEqual([]);
});

test("R during active play resets the full floor while preserving both fingerprints", async ({
  page,
}) => {
  await openMenu(page, "active-floor-restart");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  await collectKey(page);
  await expect.poll(async () => (await getSnapshot(page)).elapsedTimeMs ?? 0).toBeGreaterThan(350);
  const progressed = await getSnapshot(page);
  await page.keyboard.press("r");
  await expect.poll(async () => (await getSnapshot(page)).objectiveStatus).toBe("seeking-key");
  const restarted = await getSnapshot(page);
  expect(restarted.seed).toBe(initial.seed);
  expect(restarted.layoutFingerprint).toBe(initial.layoutFingerprint);
  expect(restarted.objectiveFingerprint).toBe(initial.objectiveFingerprint);
  expect(restarted.encounterFingerprint).toBe(initial.encounterFingerprint);
  expect(restarted.playerPosition).toEqual(restarted.spawnPosition);
  expect(restarted.keyObjectActive).toBe(true);
  expect(restarted.gateReady).toBe(false);
  expect(restarted.discoveredRoomCount).toBe(1);
  expect(restarted.elapsedTimeMs).toBeLessThan(progressed.elapsedTimeMs ?? 0);
  expect(restarted.playerHealth).toBe(restarted.playerMaximumHealth);
  expect(restarted.aliveEnemyCount).toBe(restarted.totalEnemyCount);
});

test("N repeatedly creates fresh playable objective plans without listener errors", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMenu(page, "objective-regeneration-sequence");
  await startWithKey(page);

  let previous = await getSnapshot(page);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    await page.keyboard.press("n");
    await expect
      .poll(async () => (await getSnapshot(page)).objectiveFingerprint)
      .not.toBe(previous.objectiveFingerprint);
    const next = await getSnapshot(page);
    expect(next.seed).not.toBe(previous.seed);
    expect(next.layoutFingerprint).not.toBe(previous.layoutFingerprint);
    expect(next.encounterFingerprint).not.toBe(previous.encounterFingerprint);
    expect(next.objectiveStatus).toBe("seeking-key");
    expect(next.keyObjectActive).toBe(true);
    expect(next.gateReady).toBe(false);
    expect(next.playerPosition).toEqual(next.spawnPosition);
    expect(next.discoveredRoomCount).toBe(1);
    expect(new URL(page.url()).searchParams.get("seed")).toBe(next.seed);
    previous = next;
  }
  expect(pageErrors).toEqual([]);
});

test("completion overlay Replay This Seed pointer control restores the same objective", async ({
  page,
}) => {
  await openMenu(page, "pointer-replay-objective");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  await completeFloor(page);
  await waitForCompletionOverlay(page);
  await clickCanvasPoint(page, 358, 374);
  await expect.poll(async () => (await getSnapshot(page)).objectiveStatus).toBe("seeking-key");
  const replayed = await getSnapshot(page);
  expect(replayed.seed).toBe(initial.seed);
  expect(replayed.layoutFingerprint).toBe(initial.layoutFingerprint);
  expect(replayed.objectiveFingerprint).toBe(initial.objectiveFingerprint);
  expect(replayed.keyObjectActive).toBe(true);
});

test("completion overlay New Dungeon pointer control creates a new deterministic objective", async ({
  page,
}) => {
  await openMenu(page, "pointer-new-objective");
  await startWithKey(page);
  const completed = await completeFloor(page);
  await waitForCompletionOverlay(page);
  await clickCanvasPoint(page, 602, 374);
  await expect
    .poll(async () => (await getSnapshot(page)).objectiveFingerprint)
    .not.toBe(completed.objectiveFingerprint);
  const next = await getSnapshot(page);
  expect(next.seed).not.toBe(completed.seed);
  expect(next.objectiveStatus).toBe("seeking-key");
});

test("Enter and Space each create a new dungeon from completion", async ({ page }) => {
  await openMenu(page, "completion-keyboard-objective");
  await startWithKey(page);
  const firstCompleted = await completeFloor(page);
  await waitForCompletionOverlay(page);
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await getSnapshot(page)).objectiveFingerprint)
    .not.toBe(firstCompleted.objectiveFingerprint);

  const secondCompleted = await completeFloor(page);
  await waitForCompletionOverlay(page);
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await getSnapshot(page)).objectiveFingerprint)
    .not.toBe(secondCompleted.objectiveFingerprint);
});

test("Space preserves the menu start control", async ({ page }) => {
  await openMenu(page, "space-start-objective");
  await startWithKey(page, "Space");
  expect((await getSnapshot(page)).objectiveStatus).toBe("seeking-key");
  expect((await getSnapshot(page)).playerAttackState).toBe("ready");
});

test("dormant threats awaken on discovery and real Space and J attacks defeat a Stalker", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMenu(page, "combat-melee-regression");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  const stalker = enemyByArchetype(initial, "bone-stalker");
  const dormantPosition = stalker.position;
  await page.waitForTimeout(250);
  const stillDormant = enemyById(await getSnapshot(page), stalker.id);
  expect(stillDormant.state).toBe("dormant");
  expect(stillDormant.position).toEqual(dormantPosition);
  expect((await getSnapshot(page)).threatRoomCount).toBe(0);

  await teleportNearEnemy(page, stalker.id);
  await expect.poll(async () => (await getSnapshot(page)).currentRoomId).toBe(stalker.roomId);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), stalker.id).state)
    .not.toBe("dormant");
  expect((await getSnapshot(page)).threatRoomCount).toBe(1);

  await page.keyboard.down("Space");
  await expect
    .poll(async () => enemyById(await getSnapshot(page), stalker.id).currentHealth)
    .toBe(stalker.maximumHealth - 1);
  await page.waitForTimeout(450);
  expect(enemyById(await getSnapshot(page), stalker.id).currentHealth).toBe(
    stalker.maximumHealth - 1,
  );
  await page.keyboard.up("Space");

  await teleportNearEnemy(page, stalker.id);
  await page.keyboard.press("j");
  await expect.poll(async () => enemyById(await getSnapshot(page), stalker.id).alive).toBe(false);
  const defeated = await getSnapshot(page);
  expect(defeated.defeatedEnemyCount).toBe(1);
  expect(defeated.aliveEnemyCount).toBe((defeated.totalEnemyCount ?? 0) - 1);
  expect(defeated.threatRoomCount).toBe(0);
  expect(pageErrors).toEqual([]);
});

test("pointer attacks aim toward the world pointer and damage through the real melee path", async ({
  page,
}) => {
  await openMenu(page, "pointer-combat-aim");
  await startWithKey(page);
  const wisp = enemyByArchetype(await getSnapshot(page), "ash-wisp");
  await teleportNearEnemy(page, wisp.id);
  await expect.poll(async () => (await getSnapshot(page)).currentRoomId).toBe(wisp.roomId);
  await page.waitForTimeout(120);
  const facing = (await getSnapshot(page)).playerFacing ?? { x: 1, y: 0 };
  await clickCanvasPoint(page, GAME_WIDTH / 2 + facing.x * 340, GAME_HEIGHT / 2 + facing.y * 210);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), wisp.id).currentHealth)
    .toBe(wisp.maximumHealth - 1);
  const finalFacing = (await getSnapshot(page)).playerFacing ?? { x: 0, y: 0 };
  const meleeArcBoundary = Math.cos((COMBAT_CONFIG.attackArcDegrees * Math.PI) / 360);
  expect(finalFacing.x * facing.x + finalFacing.y * facing.y).toBeGreaterThan(meleeArcBoundary);
});

test("contact damage uses invulnerability and dash movement grants contact immunity", async ({
  page,
}) => {
  await openMenu(page, "contact-dash-contract");
  await startWithKey(page);
  const stalker = enemyByArchetype(await getSnapshot(page), "bone-stalker");
  await teleportOntoEnemy(page, stalker.id);
  await expect.poll(async () => (await getSnapshot(page)).playerHealth).toBe(4);
  expect((await getSnapshot(page)).playerInvulnerable).toBe(true);
  await teleportOntoEnemy(page, stalker.id);
  await page.waitForTimeout(100);
  expect((await getSnapshot(page)).playerHealth).toBe(4);
  await teleportToTarget(page, "spawn");
  await expect.poll(async () => (await getSnapshot(page)).playerInvulnerable).toBe(false);

  const beforeDash = await getSnapshot(page);
  await page.keyboard.down("Shift");
  await waitForDashActive(page);
  const duringDash = await page.evaluate(async (enemyId) => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    bridge.teleportOntoEnemy(enemyId);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const snapshot = bridge.snapshot();
    bridge.teleportToTarget("spawn");
    return snapshot;
  }, stalker.id);
  await page.keyboard.up("Shift");
  expect(duringDash.playerHealth).toBe(beforeDash.playerHealth);
  expect(["active", "cooldown"]).toContain(duringDash.playerDashState);
  await expect.poll(async () => (await getSnapshot(page)).dashReady).toBe(true);
});

test("dash remains blocked by generated wall collision", async ({ page }) => {
  await openMenu(page, "dash-wall-regression");
  await startWithKey(page);
  const layout = generateDungeon("dash-wall-regression");
  const approach = findNearestWallApproach(layout);
  await page.keyboard.down(approach.key);
  await expect
    .poll(async () => {
      const position = (await getSnapshot(page)).playerPosition;
      return position ? position[approach.axis] : Number.NaN;
    })
    .toBeCloseTo(approach.expectedPosition, 0);
  await page.keyboard.up(approach.key);
  await page.keyboard.press("Shift");
  await page.waitForTimeout(180);
  const blocked = await getSnapshot(page);
  expect(blocked.playerPosition?.[approach.axis]).toBeCloseTo(approach.expectedPosition, 0);
  expect(blocked.playerOnWalkableTile).toBe(true);
});

test("Ash Wisp telegraph creates bounded projectiles that damage and expire", async ({ page }) => {
  await openMenu(page, "ash-projectile-contract");
  await startWithKey(page);
  const wisp = enemyByArchetype(await getSnapshot(page), "ash-wisp");
  const startingHealth = (await getSnapshot(page)).playerHealth ?? 0;
  await teleportNearEnemy(page, wisp.id);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), wisp.id).state)
    .toBe("telegraph");
  await expect
    .poll(async () => (await getSnapshot(page)).activeEnemyProjectileCount)
    .toBeGreaterThan(0);
  expect((await getSnapshot(page)).activeEnemyProjectileCount).toBeLessThanOrEqual(2);
  await expect
    .poll(async () => (await getSnapshot(page)).playerHealth)
    .toBeLessThan(startingHealth);
  await expect.poll(async () => (await getSnapshot(page)).activeEnemyProjectileCount).toBe(0);
});

test("a dodged Ash projectile is destroyed by room geometry before unbounded accumulation", async ({
  page,
}) => {
  await openMenu(page, "ash-wall-projectile");
  await startWithKey(page);
  const wisp = enemyByArchetype(await getSnapshot(page), "ash-wisp");
  await teleportNearEnemy(page, wisp.id);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), wisp.id).state)
    .toBe("telegraph");
  await page.keyboard.down("ArrowDown");
  await expect
    .poll(async () => (await getSnapshot(page)).activeEnemyProjectileCount)
    .toBeGreaterThan(0);
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowDown");
  await expect
    .poll(async () => (await getSnapshot(page)).activeEnemyProjectileCount, {
      timeout: 1_900,
      intervals: [20],
    })
    .toBe(0);
});

test("Stone Warden telegraphs, charges without steering, recovers, and is sword-interruptible", async ({
  page,
}) => {
  await openMenu(page, "warden-charge-contract");
  await startWithKey(page);
  const warden = enemyByArchetype(await getSnapshot(page), "stone-warden");
  await teleportNearEnemy(page, warden.id);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state)
    .toBe("wind-up");
  await page.keyboard.press("j");
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).currentHealth)
    .toBe(warden.maximumHealth - 1);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state)
    .toBe("recover");

  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, { timeout: 5_000 })
    .not.toBe("recover");
  await teleportNearEnemy(page, warden.id);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state)
    .toBe("wind-up");
  const windUpSnapshot = await getSnapshot(page);
  const windUpPosition = enemyById(windUpSnapshot, warden.id).position;
  const playerAtWindUp = windUpSnapshot.playerPosition ?? windUpPosition;
  const lockedDirection = {
    x: playerAtWindUp.x - windUpPosition.x,
    y: playerAtWindUp.y - windUpPosition.y,
  };
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, {
      timeout: 4_000,
      intervals: [20],
    })
    .toBe("charge");
  const chargeSnapshot = await getSnapshot(page);
  const chargeStart = enemyById(chargeSnapshot, warden.id).position;
  const steeringKey =
    Math.abs(lockedDirection.x) >= Math.abs(lockedDirection.y) ? "ArrowDown" : "ArrowRight";
  await page.keyboard.down(steeringKey);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, { timeout: 3_500 })
    .toBe("recover");
  await page.keyboard.up(steeringKey);
  const chargeEnd = enemyById(await getSnapshot(page), warden.id).position;
  const chargeDisplacement = {
    x: chargeEnd.x - chargeStart.x,
    y: chargeEnd.y - chargeStart.y,
  };
  const dot = lockedDirection.x * chargeDisplacement.x + lockedDirection.y * chargeDisplacement.y;
  const magnitudes =
    Math.hypot(lockedDirection.x, lockedDirection.y) *
    Math.hypot(chargeDisplacement.x, chargeDisplacement.y);
  expect(Math.hypot(chargeDisplacement.x, chargeDisplacement.y)).toBeGreaterThan(0.1);
  expect(dot / magnitudes).toBeGreaterThan(0.8);
});

test("escape succeeds with living enemies and freezes the complete combat runtime", async ({
  page,
}) => {
  await openMenu(page, "living-enemies-escape");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  const completed = await completeFloor(page);
  expect(completed.runOutcome).toBe("escaped");
  expect(completed.aliveEnemyCount).toBe(completed.totalEnemyCount);
  expect(completed.activeEnemyProjectileCount).toBe(0);
  const frozenTime = completed.elapsedTimeMs;
  const frozenPlayer = completed.playerPosition;
  const frozenEnemies = completed.enemies.map((enemy) => enemy.position);
  await expect.poll(async () => (await getSnapshot(page)).completionOverlayVisible).toBe(true);
  await page.keyboard.press("j");
  await page.keyboard.press("Shift");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(450);
  await page.keyboard.up("ArrowRight");
  const frozen = await getSnapshot(page);
  expect(frozen.elapsedTimeMs).toBe(frozenTime);
  expect(frozen.playerPosition).toEqual(frozenPlayer);
  expect(frozen.enemies.map((enemy) => enemy.position)).toEqual(frozenEnemies);
  expect(frozen.encounterFingerprint).toBe(initial.encounterFingerprint);
  expect(frozen.completionOverlayVisible).toBe(true);
});

test("real repeated enemy contact produces one defeat and R fully replays the same combat plan", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMenu(page, "defeat-replay-contract");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  const warden = enemyByArchetype(initial, "stone-warden");
  const defeated = await defeatPlayer(page, warden.id);
  expect(defeated.playerVitalityStatus).toBe("defeated");
  expect(defeated.playerHealth).toBe(0);
  expect(defeated.objectiveStatus).toBe("seeking-key");
  expect(defeated.activeEnemyProjectileCount).toBe(0);
  const frozenTime = defeated.elapsedTimeMs;
  const frozenPosition = defeated.playerPosition;
  const frozenEnemies = defeated.enemies.map((enemy) => enemy.position);
  await page.keyboard.press("j");
  await page.keyboard.press("Shift");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowRight");
  const stillDefeated = await getSnapshot(page);
  expect(stillDefeated.elapsedTimeMs).toBe(frozenTime);
  expect(stillDefeated.playerPosition).toEqual(frozenPosition);
  expect(stillDefeated.enemies.map((enemy) => enemy.position)).toEqual(frozenEnemies);

  await page.keyboard.press("r");
  await expect.poll(async () => (await getSnapshot(page)).runOutcome).toBe("active");
  const replayed = await getSnapshot(page);
  expect(replayed.seed).toBe(initial.seed);
  expect(replayed.layoutFingerprint).toBe(initial.layoutFingerprint);
  expect(replayed.objectiveFingerprint).toBe(initial.objectiveFingerprint);
  expect(replayed.encounterFingerprint).toBe(initial.encounterFingerprint);
  expect(replayed.playerHealth).toBe(replayed.playerMaximumHealth);
  expect(replayed.aliveEnemyCount).toBe(replayed.totalEnemyCount);
  expect(replayed.enemies.every((enemy) => enemy.currentHealth === enemy.maximumHealth)).toBe(true);
  expect(replayed.activeEnemyProjectileCount).toBe(0);
  expect(replayed.keyObjectActive).toBe(true);
  expect(replayed.gateReady).toBe(false);
  expect(replayed.discoveredRoomCount).toBe(1);
  expect(replayed.playerPosition).toEqual(replayed.spawnPosition);
  expect(pageErrors).toEqual([]);
});

test("defeat keyboard new-dungeon controls use N, Enter, and Space without attacking", async ({
  page,
}) => {
  await openMenu(page, "defeat-keyboard-controls");
  await startWithKey(page);
  for (const key of ["n", "Enter", "Space"] as const) {
    const before = await getSnapshot(page);
    const warden = enemyByArchetype(before, "stone-warden");
    await defeatPlayer(page, warden.id);
    await page.keyboard.press(key);
    await expect
      .poll(async () => (await getSnapshot(page)).encounterFingerprint)
      .not.toBe(before.encounterFingerprint);
    const next = await getSnapshot(page);
    expect(next.seed).not.toBe(before.seed);
    expect(next.layoutFingerprint).not.toBe(before.layoutFingerprint);
    expect(next.objectiveFingerprint).not.toBe(before.objectiveFingerprint);
    expect(next.runOutcome).toBe("active");
    expect(next.playerAttackState).toBe("ready");
    expect(next.playerHealth).toBe(next.playerMaximumHealth);
  }
});

test("defeat overlay Replay This Seed pointer button restores full same-seed state", async ({
  page,
}) => {
  await openMenu(page, "defeat-pointer-replay");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  await defeatPlayer(page, enemyByArchetype(initial, "stone-warden").id);
  await clickCanvasPoint(page, 358, 374);
  await expect.poll(async () => (await getSnapshot(page)).runOutcome).toBe("active");
  const replayed = await getSnapshot(page);
  expect(replayed.encounterFingerprint).toBe(initial.encounterFingerprint);
  expect(replayed.playerHealth).toBe(replayed.playerMaximumHealth);
  expect(replayed.aliveEnemyCount).toBe(replayed.totalEnemyCount);
});

test("defeat overlay New Dungeon pointer button creates a fresh complete run", async ({ page }) => {
  await openMenu(page, "defeat-pointer-new");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  await defeatPlayer(page, enemyByArchetype(initial, "stone-warden").id);
  await clickCanvasPoint(page, 602, 374);
  await expect
    .poll(async () => (await getSnapshot(page)).encounterFingerprint)
    .not.toBe(initial.encounterFingerprint);
  const next = await getSnapshot(page);
  expect(next.seed).not.toBe(initial.seed);
  expect(next.runOutcome).toBe("active");
  expect(next.playerHealth).toBe(next.playerMaximumHealth);
});

test("fixed seed reproduces the complete deterministic loot plan and starts empty", async ({
  page,
}) => {
  await openMenu(page, "phase5-loot-plan");
  await startWithKey(page);
  const first = await getSnapshot(page);
  expect(first.lootFingerprint).toMatch(/^lt-[0-9a-f]{8}$/);
  expect(first.totalChestCount).toBe(3);
  expect(first.chests).toHaveLength(3);
  expect(new Set(first.chests.map((chest) => chest.roomId)).size).toBe(3);
  expect(
    first.chests.every(
      (chest) => ![first.spawnRoomId, first.keyRoomId, first.gateRoomId].includes(chest.roomId),
    ),
  ).toBe(true);
  expect(first.forgeRoomId).toBe(first.spawnRoomId);
  expect(first.availableShardCount).toBe(0);
  expect(first.totalCollectedShardCount).toBe(0);
  expect(first.selectedUpgradeIds).toEqual([]);
  expect(first.openedChestCount).toBe(0);
  expect(first.pickups).toEqual([]);
  expect(first.effectiveMeleeDamage).toBe(1);
  expect(first.effectiveMeleeRange).toBe(58);
  expect(first.effectiveDashCooldown).toBe(900);
  expect(first.effectiveMaximumHealth).toBe(5);

  await page.reload();
  await waitForScene(page, "MenuScene");
  await startWithKey(page);
  const second = await getSnapshot(page);
  expect({
    layout: second.layoutFingerprint,
    objective: second.objectiveFingerprint,
    encounter: second.encounterFingerprint,
    loot: second.lootFingerprint,
    forge: second.forgePosition,
    chests: second.chests,
    rewards: second.enemyRewards,
  }).toEqual({
    layout: first.layoutFingerprint,
    objective: first.objectiveFingerprint,
    encounter: first.encounterFingerprint,
    loot: first.lootFingerprint,
    forge: first.forgePosition,
    chests: first.chests,
    rewards: first.enemyRewards,
  });
});

test("real chest interaction creates one reward and real proximity collects its shard", async ({
  page,
}) => {
  await openMenu(page, "phase5-chest-pickup");
  await startWithKey(page);
  const chest = (await getSnapshot(page)).chests[0]!;
  await openChest(page, chest.id);
  const opened = await getSnapshot(page);
  const sourcePickups = opened.pickups.filter((pickup) => pickup.sourceId === chest.id);
  expect(
    sourcePickups.some((pickup) => pickup.type === "shard" && pickup.amount === chest.shardAmount),
  ).toBe(true);
  expect(sourcePickups.some((pickup) => pickup.type === "flask")).toBe(chest.containsFlask);
  const pickupCount = opened.pickups.length;
  await page.keyboard.down("e");
  await page.waitForTimeout(300);
  await page.keyboard.up("e");
  expect((await getSnapshot(page)).pickups).toHaveLength(pickupCount);
  expect((await getSnapshot(page)).interactionPrompt).not.toBe("E  ·  OPEN TREASURE CHEST");

  const shard = sourcePickups.find((pickup) => pickup.type === "shard")!;
  await collectPickup(page, shard.id);
  const collected = await getSnapshot(page);
  expect(collected.availableShardCount).toBe(chest.shardAmount);
  expect(collected.totalCollectedShardCount).toBe(chest.shardAmount);
  expect(collected.pickups.some((pickup) => pickup.id === shard.id)).toBe(false);
});

test("full-health flasks remain, then real damage permits clamped healing", async ({ page }) => {
  await openMenu(page, "phase5-vitality-flask");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  const flaskChest = initial.chests.find((chest) => chest.containsFlask)!;
  await openChest(page, flaskChest.id);
  const flask = (await getSnapshot(page)).pickups.find(
    (pickup) => pickup.sourceId === flaskChest.id && pickup.type === "flask",
  )!;
  await teleportToPickup(page, flask.id);
  await page.waitForTimeout(350);
  expect((await getSnapshot(page)).pickups.some((pickup) => pickup.id === flask.id)).toBe(true);
  expect((await getSnapshot(page)).flaskConsumptionCount).toBe(0);

  const enemy = enemyByArchetype(await getSnapshot(page), "bone-stalker");
  await teleportOntoEnemy(page, enemy.id);
  await expect.poll(async () => (await getSnapshot(page)).playerHealth).toBe(4);
  await teleportToPickup(page, flask.id);
  await expect.poll(async () => (await getSnapshot(page)).playerHealth).toBe(5);
  const healed = await getSnapshot(page);
  expect(healed.flaskConsumptionCount).toBe(1);
  expect(healed.pickups.some((pickup) => pickup.id === flask.id)).toBe(false);
});

test("real enemy combat emits its planned reward only once", async ({ page }) => {
  await openMenu(page, "phase5-enemy-reward");
  await startWithKey(page);
  const enemy = enemyByArchetype(await getSnapshot(page), "bone-stalker");
  const reward = (await getSnapshot(page)).enemyRewards.find(
    (candidate) => candidate.enemyId === enemy.id,
  )!;
  await defeatEnemyWithSword(page, enemy.id);
  const afterDeath = await getSnapshot(page);
  const drops = afterDeath.pickups.filter((pickup) => pickup.sourceId === enemy.id);
  expect(drops.filter((pickup) => pickup.type === "shard")).toHaveLength(1);
  expect(drops.find((pickup) => pickup.type === "shard")?.amount).toBe(reward.shardAmount);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  const afterRepeatedAttack = (await getSnapshot(page)).pickups.filter(
    (pickup) => pickup.sourceId === enemy.id,
  );
  expect(
    afterRepeatedAttack.map(({ id, type, amount, sourceId }) => ({ id, type, amount, sourceId })),
  ).toEqual(drops.map(({ id, type, amount, sourceId }) => ({ id, type, amount, sourceId })));
});

test("Runeforge inspection, deterministic overlay suspension, Escape, and selection work", async ({
  page,
}) => {
  await openMenu(page, "phase5-forge-flow");
  await startWithKey(page);
  await teleportToForge(page);
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  INSPECT RUNEFORGE");
  await page.keyboard.press("e");
  expect((await getSnapshot(page)).upgradeOverlayVisible).toBe(false);

  const funded = await collectAllChestShards(page);
  expect(funded.availableShardCount).toBeGreaterThanOrEqual(6);
  await teleportToForge(page);
  await expect
    .poll(async () => (await getSnapshot(page)).interactionPrompt)
    .toBe("E  ·  AWAKEN RUNEFORGE");
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(true);
  const choosing = await getSnapshot(page);
  expect(choosing.currentUpgradeOfferIds).toHaveLength(3);
  expect(new Set(choosing.currentUpgradeOfferIds).size).toBe(3);
  expect(choosing.currentUpgradeOfferFingerprint).toMatch(/^uo-[0-9a-f]{8}$/);
  expect(choosing.runActivity).toBe("choosing-upgrade");
  const frozenPosition = choosing.playerPosition;
  const frozenTime = choosing.elapsedTimeMs;
  const frozenSeed = choosing.seed;
  await page.keyboard.press("Space");
  await page.keyboard.press("j");
  await page.keyboard.press("Shift");
  await page.keyboard.press("e");
  await page.keyboard.press("r");
  await page.keyboard.press("n");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");
  const frozen = await getSnapshot(page);
  expect(frozen.playerPosition).toEqual(frozenPosition);
  expect(frozen.elapsedTimeMs).toBe(frozenTime);
  expect(frozen.seed).toBe(frozenSeed);
  expect(frozen.playerAttackState).toBe("ready");
  expect(frozen.playerDashState).toBe("ready");

  await page.keyboard.press("Escape");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(false);
  const closed = await getSnapshot(page);
  expect(closed.availableShardCount).toBe(funded.availableShardCount);
  expect(closed.selectedUpgradeIds).toEqual([]);
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(true);
  expect((await getSnapshot(page)).currentUpgradeOfferFingerprint).toBe(
    choosing.currentUpgradeOfferFingerprint,
  );
  const selectedId = (await getSnapshot(page)).currentUpgradeOfferIds[0]!;
  await page.keyboard.press("1");
  await expect.poll(async () => (await getSnapshot(page)).selectedUpgradeIds).toContain(selectedId);
  const selected = await getSnapshot(page);
  expect(selected.availableShardCount).toBe((funded.availableShardCount ?? 0) - 6);
  expect(selected.currentForgeCost).toBe(8);
  expect(selected.runActivity).toBe("playing");
  const effectByUpgrade: Readonly<Record<string, readonly [keyof E2ESnapshot, number]>> = {
    "tempered-edge": ["effectiveMeleeDamage", 2],
    "long-reach": ["effectiveMeleeRange", 76],
    "quickened-steel": ["effectiveAttackCooldown", 260],
    "fleet-sigil": ["effectiveDashCooldown", 650],
    "vital-rune": ["effectiveMaximumHealth", 6],
    "aegis-rune": ["effectivePostHitInvulnerability", 1_150],
  };
  const [effectField, effectValue] = effectByUpgrade[selectedId]!;
  expect(selected[effectField]).toBe(effectValue);
});

test("two real forge choices exhaust the forge and same-seed R resets all rewards", async ({
  page,
}) => {
  await openMenu(page, "phase5-forge-ci-47");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  const chestFunded = await collectAllChestShards(page);
  expect(chestFunded.availableShardCount).toBe(12);
  const warden = enemyByArchetype(chestFunded, "stone-warden");
  const funded = await collectEnemyShard(page, warden.id);
  expect(funded.availableShardCount).toBe(14);
  await teleportToForge(page);
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(true);
  await page.keyboard.press("1");
  await expect.poll(async () => (await getSnapshot(page)).forgeUpgradesCompleted).toBe(1);
  await teleportToForge(page);
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(true);
  const secondOffer = await getSnapshot(page);
  expect(secondOffer.currentUpgradeOfferIds).toHaveLength(3);
  expect(
    secondOffer.currentUpgradeOfferIds.some((id) => secondOffer.selectedUpgradeIds.includes(id)),
  ).toBe(false);
  await clickCanvasPoint(page, 205, 285);
  await expect.poll(async () => (await getSnapshot(page)).forgeExhausted).toBe(true);
  const complete = await getSnapshot(page);
  expect(complete.forgeUpgradesCompleted).toBe(2);
  expect(complete.currentForgeCost).toBeNull();
  await teleportToTarget(page, "spawn");
  expect((await getSnapshot(page)).interactionPrompt).toBeNull();

  await page.keyboard.press("r");
  await expect.poll(async () => (await getSnapshot(page)).openedChestCount).toBe(0);
  const replayed = await getSnapshot(page);
  expect(replayed.lootFingerprint).toBe(initial.lootFingerprint);
  expect(replayed.chests.map((chest) => ({ ...chest, opened: false }))).toEqual(initial.chests);
  expect(replayed.availableShardCount).toBe(0);
  expect(replayed.totalCollectedShardCount).toBe(0);
  expect(replayed.selectedUpgradeIds).toEqual([]);
  expect(replayed.pickups).toEqual([]);
  expect(replayed.effectiveMeleeDamage).toBe(1);
  expect(replayed.effectiveMaximumHealth).toBe(5);
  expect(replayed.playerHealth).toBe(5);
});

test("Tempered Edge changes real melee damage on the documented fixed seed", async ({ page }) => {
  await openMenu(page, "phase5-upgrade-4");
  await startWithKey(page);
  const funded = await collectAllChestShards(page);
  expect(funded.availableShardCount).toBeGreaterThanOrEqual(6);
  await teleportToForge(page);
  await page.keyboard.press("e");
  await expect.poll(async () => (await getSnapshot(page)).upgradeOverlayVisible).toBe(true);
  expect((await getSnapshot(page)).currentUpgradeOfferIds).toEqual([
    "vital-rune",
    "aegis-rune",
    "tempered-edge",
  ]);
  await page.keyboard.press("3");
  await expect.poll(async () => (await getSnapshot(page)).effectiveMeleeDamage).toBe(2);
  const stalker = enemyByArchetype(await getSnapshot(page), "bone-stalker");
  expect(stalker.maximumHealth).toBe(2);
  await teleportNearEnemy(page, stalker.id);
  await page.keyboard.press("Space");
  await expect.poll(async () => enemyById(await getSnapshot(page), stalker.id).alive).toBe(false);
});

test("loot remains optional for escape and N creates a fresh loot plan", async ({ page }) => {
  await openMenu(page, "phase5-optional-escape");
  await startWithKey(page);
  const initial = await getSnapshot(page);
  await completeFloor(page);
  await waitForCompletionOverlay(page);
  const completed = await getSnapshot(page);
  expect(completed.openedChestCount).toBe(0);
  expect(completed.totalCollectedShardCount).toBe(0);
  expect(completed.selectedUpgradeIds).toEqual([]);
  await page.keyboard.press("r");
  await expect.poll(async () => (await getSnapshot(page)).runOutcome).toBe("active");
  expect((await getSnapshot(page)).lootFingerprint).toBe(initial.lootFingerprint);
  await page.keyboard.press("n");
  await expect
    .poll(async () => (await getSnapshot(page)).lootFingerprint)
    .not.toBe(initial.lootFingerprint);
  const fresh = await getSnapshot(page);
  expect(fresh.availableShardCount).toBe(0);
  expect(fresh.selectedUpgradeIds).toEqual([]);
  expect(fresh.openedChestCount).toBe(0);
});

test("production assets exclude all E2E bridge and teleport identifiers", async () => {
  const assetsDirectory = join(process.cwd(), "dist", "assets");
  const assetNames = await readdir(assetsDirectory);
  const productionText = (
    await Promise.all(
      assetNames
        .filter((name) => name.endsWith(".js"))
        .map((name) => readFile(join(assetsDirectory, name), "utf8")),
    )
  ).join("\n");

  expect(productionText).not.toContain("__DUNGEON_ESCAPE_E2E__");
  expect(productionText).not.toContain("installE2EBridge");
  expect(productionText).not.toContain("teleportToTarget");
  expect(productionText).not.toContain("teleportNearEnemy");
  expect(productionText).not.toContain("teleportOntoEnemy");
  expect(productionText).not.toContain("teleportToChest");
  expect(productionText).not.toContain("teleportToForge");
  expect(productionText).not.toContain("teleportToPickup");
});
