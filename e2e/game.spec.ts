import { expect, test, type Page } from "@playwright/test";

interface Position {
  readonly x: number;
  readonly y: number;
}

interface E2ESnapshot {
  readonly activeScene: string | null;
  readonly playerPosition: Position | null;
  readonly spawnPosition: Position | null;
}

interface TestWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => E2ESnapshot;
  };
}

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

test("loads the menu and supports pointer start, movement, restart, and resize", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");

  const canvas = page.locator("#game-container canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator("#game-state")).toContainText("Main menu");

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("The game canvas has no visible bounds.");
  await page.mouse.click(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * (318 / 540));
  await waitForScene(page, "GameScene");

  const spawnSnapshot = await getSnapshot(page);
  expect(spawnSnapshot.playerPosition).toEqual(spawnSnapshot.spawnPosition);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(320);
  await page.keyboard.up("ArrowRight");

  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition?.x ?? 0)
    .toBeGreaterThan((spawnSnapshot.spawnPosition?.x ?? 0) + 20);

  await page.keyboard.press("r");
  await expect
    .poll(async () => (await getSnapshot(page)).playerPosition)
    .toEqual(spawnSnapshot.spawnPosition);

  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowLeft");
  const wallCollisionPosition = (await getSnapshot(page)).playerPosition;
  expect(wallCollisionPosition?.x).toBeGreaterThanOrEqual(59);
  expect(wallCollisionPosition?.x).toBeLessThan(66);

  await page.keyboard.press("r");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(780);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(800);
  await page.keyboard.up("ArrowUp");
  const obstacleCollisionPosition = (await getSnapshot(page)).playerPosition;
  expect(obstacleCollisionPosition?.y).toBeGreaterThanOrEqual(228);
  expect(obstacleCollisionPosition?.y).toBeLessThan(236);

  await page.setViewportSize({ width: 720, height: 700 });
  await expect(canvas).toBeVisible();
  const resizedBounds = await canvas.boundingBox();
  expect(resizedBounds?.width).toBeGreaterThan(500);
  expect((resizedBounds?.width ?? 0) / (resizedBounds?.height ?? 1)).toBeCloseTo(16 / 9, 1);
  expect((await getSnapshot(page)).activeScene).toBe("GameScene");
  expect(pageErrors).toEqual([]);
});

test("Enter starts the game once", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");

  await page.keyboard.press("Enter");
  await waitForScene(page, "GameScene");
  expect((await getSnapshot(page)).playerPosition).not.toBeNull();
});

test("Space starts the game", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as TestWindow).__DUNGEON_ESCAPE_E2E__));
  await waitForScene(page, "MenuScene");

  await page.keyboard.press("Space");
  await waitForScene(page, "GameScene");
});
