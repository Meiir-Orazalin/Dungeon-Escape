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

interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: Position | null;
  readonly spawnPosition: Position | null;
  readonly seed: string | null;
  readonly layoutFingerprint: string | null;
  readonly objectiveFingerprint: string | null;
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
}

interface TestWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => E2ESnapshot;
    teleportToTarget: (target: "spawn" | "key" | "gate") => void;
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
  expect(initial.roomCount).toBeGreaterThanOrEqual(10);
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
  expect(second.spawnPosition).toEqual(first.spawnPosition);
  expect(second.keyRoomId).toBe(first.keyRoomId);
  expect(second.keyPosition).toEqual(first.keyPosition);
  expect(second.gateRoomId).toBe(first.gateRoomId);
  expect(second.gatePosition).toEqual(first.gatePosition);
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
  expect(replayed.playerPosition).toEqual(replayed.spawnPosition);
  expect(replayed.keyObjectActive).toBe(true);
  expect(replayed.keyCollected).toBe(false);
  expect(replayed.gateReady).toBe(false);
  expect(replayed.discoveredRoomCount).toBe(1);
  expect(replayed.elapsedTimeMs).toBeLessThan(1_000);
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
  expect(restarted.playerPosition).toEqual(restarted.spawnPosition);
  expect(restarted.keyObjectActive).toBe(true);
  expect(restarted.gateReady).toBe(false);
  expect(restarted.discoveredRoomCount).toBe(1);
  expect(restarted.elapsedTimeMs).toBeLessThan(progressed.elapsedTimeMs ?? 0);
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
});
