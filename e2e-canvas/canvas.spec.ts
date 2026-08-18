import { expect, test, type Page } from "@playwright/test";

interface Snapshot {
  activeScene: string | null;
  currentFloorNumber: number | null;
  objectiveStatus: string | null;
  floorClearedOverlayVisible: boolean | null;
  playerPosition: { x: number; y: number } | null;
  playerFacing: { x: number; y: number } | null;
  presentationModalKind: string | null;
  interactionPrompt: string | null;
  lifecycle: { rendererType: string };
}
interface BW extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => Snapshot;
    teleportToTarget: (value: "key" | "gate") => void;
  };
}
async function boot(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("dungeon-escape.onboarding.v1", "complete"));
  await page.goto("/?seed=v1-canvas-fallback");
  await page.waitForFunction(() => Boolean((window as BW).__DUNGEON_ESCAPE_E2E__));
}
async function snap(page: Page): Promise<Snapshot> {
  return page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.snapshot());
}
async function start(page: Page): Promise<void> {
  await boot(page);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).activeScene).toBe("GameScene");
}

test("selects Canvas", async ({ page }) => {
  await boot(page);
  expect((await snap(page)).lifecycle.rendererType).toBe("canvas");
});
test("loads the menu", async ({ page }) => {
  await boot(page);
  expect((await snap(page)).activeScene).toBe("MenuScene");
});
test("starts a run", async ({ page }) => {
  await start(page);
  expect((await snap(page)).currentFloorNumber).toBe(1);
});
test("moves", async ({ page }) => {
  await start(page);
  const before = await snap(page);
  let moved = false;
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(130);
    await page.keyboard.up(key);
    const current = await snap(page);
    moved ||=
      current.playerPosition?.x !== before.playerPosition?.x ||
      current.playerPosition?.y !== before.playerPosition?.y;
  }
  expect(moved).toBe(true);
});
test("maps pointer attacks", async ({ page }) => {
  await start(page);
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("no canvas");
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
  await expect.poll(async () => (await snap(page)).playerFacing!.x).toBeGreaterThan(0);
});
test("pauses and resumes", async ({ page }) => {
  await start(page);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("pause");
  await page.waitForTimeout(50);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("none");
});
test("opens settings", async ({ page }) => {
  await start(page);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("pause");
  await page.waitForTimeout(50);
  await page.keyboard.press("s");
  await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("settings");
});
test("collects the key", async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToTarget("key"));
  await expect.poll(async () => (await snap(page)).interactionPrompt).toContain("TAKE RUNIC KEY");
  await page.keyboard.press("e");
  await expect.poll(async () => (await snap(page)).objectiveStatus).toBe("key-collected");
});
test("handles the gate", async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToTarget("gate"));
  await page.keyboard.press("e");
  expect((await snap(page)).objectiveStatus).toBe("seeking-key");
});
test("transitions floors", async ({ page }) => {
  await start(page);
  for (const target of ["key", "gate"] as const) {
    await page.evaluate(
      (value) => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToTarget(value),
      target,
    );
    await expect
      .poll(async () => (await snap(page)).interactionPrompt)
      .toContain(target === "key" ? "TAKE RUNIC KEY" : "OPEN ANCIENT GATE");
    await page.keyboard.press("e");
  }
  await expect.poll(async () => (await snap(page)).floorClearedOverlayVisible).toBe(true);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).currentFloorNumber).toBe(2);
});
test("resizes without overflow", async ({ page }) => {
  await start(page);
  await page.setViewportSize({ width: 720, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("has no page error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  expect(errors).toEqual([]);
});
