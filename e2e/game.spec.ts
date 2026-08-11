import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

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

interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: Position | null;
  readonly spawnPosition: Position | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly objectiveFingerprint: string | null;
  readonly encounterFingerprint: string | null;
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
}

interface TestWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => E2ESnapshot;
    teleportToTarget: (target: "spawn" | "key" | "gate") => void;
    teleportNearEnemy: (enemyId: string) => void;
    teleportOntoEnemy: (enemyId: string) => void;
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
  await page.waitForTimeout(450);
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
  await page.waitForTimeout(450);
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
  await page.waitForTimeout(450);
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await getSnapshot(page)).objectiveFingerprint)
    .not.toBe(firstCompleted.objectiveFingerprint);

  const secondCompleted = await completeFloor(page);
  await page.waitForTimeout(450);
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
  expect(finalFacing.x * facing.x + finalFacing.y * facing.y).toBeGreaterThan(0.8);
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
  await expect.poll(async () => (await getSnapshot(page)).playerInvulnerable).toBe(false);

  await teleportNearEnemy(page, stalker.id);
  const beforeDash = await getSnapshot(page);
  await page.keyboard.down("Shift");
  await teleportOntoEnemy(page, stalker.id);
  await page.waitForTimeout(45);
  const duringDash = await getSnapshot(page);
  await page.keyboard.up("Shift");
  expect(duringDash.playerHealth).toBe(beforeDash.playerHealth);
  expect(duringDash.playerPosition?.x).not.toBe(beforeDash.playerPosition?.x);
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
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, { timeout: 2_000 })
    .not.toBe("recover");
  await teleportNearEnemy(page, warden.id);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state)
    .toBe("wind-up");
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, {
      timeout: 1_200,
      intervals: [20],
    })
    .toBe("charge");
  const chargeStart = enemyById(await getSnapshot(page), warden.id).position;
  await page.waitForTimeout(18);
  const chargeMiddle = enemyById(await getSnapshot(page), warden.id).position;
  const firstVector = {
    x: chargeMiddle.x - chargeStart.x,
    y: chargeMiddle.y - chargeStart.y,
  };
  const steeringKey =
    Math.abs(firstVector.x) >= Math.abs(firstVector.y) ? "ArrowDown" : "ArrowRight";
  await page.keyboard.down(steeringKey);
  await page.waitForTimeout(18);
  await page.keyboard.up(steeringKey);
  const chargeLater = enemyById(await getSnapshot(page), warden.id).position;
  const secondVector = {
    x: chargeLater.x - chargeMiddle.x,
    y: chargeLater.y - chargeMiddle.y,
  };
  const dot = firstVector.x * secondVector.x + firstVector.y * secondVector.y;
  const magnitudes =
    Math.hypot(firstVector.x, firstVector.y) * Math.hypot(secondVector.x, secondVector.y);
  expect(dot / magnitudes).toBeGreaterThan(0.8);
  await expect
    .poll(async () => enemyById(await getSnapshot(page), warden.id).state, { timeout: 1_200 })
    .toBe("recover");
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
});
