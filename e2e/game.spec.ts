import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { PLAYER_BODY_SIZE, PLAYER_SPEED } from "../src/game/constants";
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
  readonly roomCount: number | null;
  readonly spawnRoomId: number | null;
  readonly destinationRoomId: number | null;
  readonly worldSize: { readonly width: number; readonly height: number } | null;
  readonly discoveredRoomCount: number | null;
  readonly currentRoomId: number | null;
  readonly playerOnWalkableTile: boolean | null;
}

interface TestWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => E2ESnapshot;
  };
}

interface WallApproach {
  readonly key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
  readonly axis: "x" | "y";
  readonly expectedPosition: number;
  readonly travelDistance: number;
}

const FIXED_SEED = "e2e-stone-lantern";

async function getSnapshot(page: Page): Promise<E2ESnapshot> {
  return page.evaluate(() => {
    const bridge = (window as TestWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    return bridge.snapshot();
  });
}

async function waitForScene(page: Page, sceneKey: string): Promise<void> {
  await expect.poll(async () => (await getSnapshot(page)).activeScene).toBe(sceneKey);
}

async function openMenu(page: Page, seed = FIXED_SEED): Promise<void> {
  await page.goto(`/?seed=${encodeURIComponent(seed)}`);
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");
}

function findNearestWallApproach(layout: DungeonLayout): WallApproach {
  const directions = [
    { key: "ArrowUp" as const, axis: "y" as const, dx: 0, dy: -1 },
    { key: "ArrowDown" as const, axis: "y" as const, dx: 0, dy: 1 },
    { key: "ArrowLeft" as const, axis: "x" as const, dx: -1, dy: 0 },
    { key: "ArrowRight" as const, axis: "x" as const, dx: 1, dy: 0 },
  ];

  return directions
    .map((direction): WallApproach => {
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
      const bodyOffset = PLAYER_BODY_SIZE / 2;
      const expectedPosition =
        wallEdge + (direction.dx < 0 || direction.dy < 0 ? bodyOffset : -bodyOffset);
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

test("generated dungeon supports pointer start, movement, restart, collision, and resize", async ({
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

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("The game canvas has no visible bounds.");
  await page.mouse.click(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * (318 / 540));
  await waitForScene(page, "GameScene");

  const initial = await getSnapshot(page);
  expect(initial.seed).toBe(FIXED_SEED);
  expect(initial.layoutFingerprint).toMatch(/^dg-[0-9a-f]{8}$/);
  expect(initial.roomCount).toBeGreaterThanOrEqual(10);
  expect(initial.worldSize).toEqual({ width: 2304, height: 1408 });
  expect(initial.playerPosition).toEqual(initial.spawnPosition);
  expect(initial.spawnRoomId).not.toBe(initial.destinationRoomId);
  expect(initial.discoveredRoomCount).toBe(1);
  expect(initial.currentRoomId).toBe(initial.spawnRoomId);
  expect(initial.playerOnWalkableTile).toBe(true);

  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition?.x ?? 0)
    .toBeGreaterThan((initial.spawnPosition?.x ?? 0) + 20);
  await page.keyboard.up("ArrowRight");
  expect((await getSnapshot(page)).playerOnWalkableTile).toBe(true);

  await page.keyboard.press("r");
  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition)
    .toEqual(initial.spawnPosition);
  const restarted = await getSnapshot(page);
  expect(restarted.seed).toBe(initial.seed);
  expect(restarted.layoutFingerprint).toBe(initial.layoutFingerprint);

  const fixedLayout = generateDungeon(FIXED_SEED);
  const approach = findNearestWallApproach(fixedLayout);
  const holdDuration = Math.ceil((approach.travelDistance / PLAYER_SPEED + 0.45) * 1_000);
  await page.keyboard.down(approach.key);
  await expect
    .poll(async () => {
      const position = (await getSnapshot(page)).playerPosition;
      return position ? position[approach.axis] : Number.NaN;
    })
    .toBeCloseTo(approach.expectedPosition, 0);
  await page.waitForTimeout(Math.min(200, holdDuration));
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

test("a URL seed reproduces its layout, fingerprint, and spawn after reload", async ({ page }) => {
  await openMenu(page, "Stable_Seed-42");
  await page.keyboard.press("Enter");
  await waitForScene(page, "GameScene");
  const first = await getSnapshot(page);
  expect(first.seed).toBe("stable_seed-42");
  expect(new URL(page.url()).searchParams.get("seed")).toBe("stable_seed-42");

  await page.reload();
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");
  await page.keyboard.press("Enter");
  await waitForScene(page, "GameScene");
  const second = await getSnapshot(page);

  expect(second.seed).toBe(first.seed);
  expect(second.layoutFingerprint).toBe(first.layoutFingerprint);
  expect(second.spawnPosition).toEqual(first.spawnPosition);
});

test("N repeatedly generates distinct playable dungeons without duplicate handlers", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMenu(page, "regeneration-sequence");
  await page.keyboard.press("Enter");
  await waitForScene(page, "GameScene");

  let previous = await getSnapshot(page);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    await page.keyboard.press("n");
    await expect
      .poll(async () => (await getSnapshot(page)).layoutFingerprint)
      .not.toBe(previous.layoutFingerprint);
    const next = await getSnapshot(page);
    expect(next.seed).not.toBe(previous.seed);
    expect(next.roomCount).toBeGreaterThanOrEqual(10);
    expect(next.playerPosition).toEqual(next.spawnPosition);
    expect(next.discoveredRoomCount).toBe(1);
    expect(next.playerOnWalkableTile).toBe(true);
    expect(new URL(page.url()).searchParams.get("seed")).toBe(next.seed);
    previous = next;
  }

  await page.keyboard.down("d");
  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition?.x)
    .not.toBe(previous.spawnPosition?.x);
  await page.keyboard.up("d");
  expect((await getSnapshot(page)).playerOnWalkableTile).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Space preserves the Phase 1 keyboard start control", async ({ page }) => {
  await openMenu(page, "space-start");
  await page.keyboard.press("Space");
  await waitForScene(page, "GameScene");
  expect((await getSnapshot(page)).playerPosition).not.toBeNull();
});

test("production assets exclude the E2E bridge", async () => {
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
});
