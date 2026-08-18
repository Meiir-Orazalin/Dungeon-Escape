import { expect, test, type Page } from "@playwright/test";

interface Snapshot {
  presentationModalKind: string | null;
  runFingerprint: string | null;
  activeScene: string | null;
  currentFloorNumber: number | null;
  objectiveStatus: string | null;
  floorClearedOverlayVisible: boolean | null;
  interactionPrompt: string | null;
  playerAttackState: string | null;
  enemies: readonly { id: string; currentHealth: number; alive: boolean; awakening: boolean }[];
  chests: readonly { id: string; opened: boolean }[];
  pickups: readonly { id: string; sourceId: string; type: string; active: boolean }[];
  upgradeOverlayVisible: boolean | null;
  activeAmbienceCount: number | null;
  activeEffectVoiceCount: number | null;
  activeTransientEffectCount: number | null;
  lifecycle: {
    activeSceneCount: number;
    gameObjectCount: number;
    dynamicBodyCount: number;
    colliderCount: number;
    overlayCount: number;
    rendererType: string;
  };
}
interface BW extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => Snapshot;
    teleportToTarget: (target: "spawn" | "key" | "gate") => void;
    teleportNearEnemy: (enemyId: string) => void;
    teleportToChest: (chestId: string) => void;
    teleportToPickup: (pickupId: string) => void;
    teleportToForge: () => void;
  };
}
const snap = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.snapshot());
const action = (
  page: Page,
  name: "teleportNearEnemy" | "teleportToChest" | "teleportToPickup",
  value: string,
): Promise<void> =>
  page.evaluate(
    ({ actionName, actionValue }) => {
      const bridge = (window as BW).__DUNGEON_ESCAPE_E2E__!;
      bridge[actionName](actionValue);
    },
    { actionName: name, actionValue: value },
  );

async function openChestAndCollect(page: Page, chestId: string): Promise<void> {
  await action(page, "teleportToChest", chestId);
  await expect.poll(async () => (await snap(page)).interactionPrompt).toContain("TREASURE CHEST");
  await page.keyboard.press("e");
  await expect
    .poll(async () => (await snap(page)).chests.find((chest) => chest.id === chestId)?.opened)
    .toBe(true);
  const pickup = (await snap(page)).pickups.find(
    (candidate) => candidate.sourceId === chestId && candidate.type === "shard",
  );
  if (!pickup) throw new Error(`Missing shard pickup for ${chestId}`);
  await page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToTarget("spawn"));
  await page.waitForTimeout(50);
  await action(page, "teleportToPickup", pickup.id);
  await expect
    .poll(async () => (await snap(page)).pickups.some((candidate) => candidate.id === pickup.id))
    .toBe(false);
}

test("bounded deterministic lifecycle soak", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem("dungeon-escape.onboarding.v1", "complete"));
  await page.goto("/?seed=v1-lifecycle-soak");
  await page.waitForFunction(() => Boolean((window as BW).__DUNGEON_ESCAPE_E2E__));
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).activeScene).toBe("GameScene");
  const fingerprint = (await snap(page)).runFingerprint;
  const baseline = (await snap(page)).lifecycle;

  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("pause");
    await page.waitForTimeout(40);
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("none");
  }
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("pause");
    await page.waitForTimeout(40);
    await page.keyboard.press("s");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("settings");
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("pause");
    await page.waitForTimeout(40);
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("none");
  }
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("h");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("manual");
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snap(page)).presentationModalKind).toBe("none");
  }
  for (let index = 0; index < 10; index += 1) await page.keyboard.press("m");
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press("f");
    await page.waitForTimeout(40);
    await page.keyboard.press("f");
    await page.waitForTimeout(40);
  }
  for (const size of [
    { width: 960, height: 540 },
    { width: 720, height: 700 },
    { width: 1024, height: 640 },
  ])
    await page.setViewportSize(size);

  const enemy = (await snap(page)).enemies[0];
  if (!enemy) throw new Error("Missing soak enemy");
  await action(page, "teleportNearEnemy", enemy.id);
  await expect
    .poll(async () => (await snap(page)).enemies.find((item) => item.id === enemy.id)?.awakening)
    .toBe(true);
  await expect
    .poll(async () => (await snap(page)).enemies.find((item) => item.id === enemy.id)?.awakening)
    .toBe(false);
  while ((await snap(page)).enemies.find((item) => item.id === enemy.id)?.alive) {
    const health = (await snap(page)).enemies.find((item) => item.id === enemy.id)?.currentHealth;
    await expect.poll(async () => (await snap(page)).playerAttackState).toBe("ready");
    await action(page, "teleportNearEnemy", enemy.id);
    await page.keyboard.press("Space");
    await expect
      .poll(
        async () => (await snap(page)).enemies.find((item) => item.id === enemy.id)?.currentHealth,
      )
      .toBeLessThan(health ?? 1);
  }

  for (const chest of (await snap(page)).chests) await openChestAndCollect(page, chest.id);
  await page.evaluate(() => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToForge());
  await expect.poll(async () => (await snap(page)).interactionPrompt).toContain("RUNEFORGE");
  await page.keyboard.press("e");
  await expect.poll(async () => (await snap(page)).upgradeOverlayVisible).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snap(page)).upgradeOverlayVisible).toBe(false);

  for (const target of ["key", "gate"] as const) {
    await page.evaluate(
      (value) => (window as BW).__DUNGEON_ESCAPE_E2E__!.teleportToTarget(value),
      target,
    );
    await expect.poll(async () => (await snap(page)).interactionPrompt).not.toBeNull();
    await page.keyboard.press("e");
    if (target === "key")
      await expect.poll(async () => (await snap(page)).objectiveStatus).toBe("key-collected");
  }
  await expect.poll(async () => (await snap(page)).floorClearedOverlayVisible).toBe(true);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).currentFloorNumber).toBe(2);

  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press("r");
    await expect.poll(async () => (await snap(page)).currentFloorNumber).toBe(2);
  }
  expect((await snap(page)).runFingerprint).toBe(fingerprint);
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press("n");
    await expect.poll(async () => (await snap(page)).currentFloorNumber).toBe(1);
  }
  const postNewRun = await snap(page);
  await page.keyboard.press("r");
  await expect.poll(async () => (await snap(page)).currentFloorNumber).toBe(1);
  const final = await snap(page);
  expect(final.runFingerprint).toMatch(/^rn-[0-9a-f]{8}$/);
  expect(final.lifecycle.activeSceneCount).toBeLessThanOrEqual(2);
  expect(final.lifecycle.overlayCount).toBe(0);
  expect(final.lifecycle.rendererType).toBe(baseline.rendererType);
  expect(final.lifecycle.gameObjectCount).toBeLessThanOrEqual(
    postNewRun.lifecycle.gameObjectCount + 2,
  );
  expect(final.lifecycle.dynamicBodyCount).toBeLessThanOrEqual(
    postNewRun.lifecycle.dynamicBodyCount + 1,
  );
  expect(final.lifecycle.colliderCount).toBeLessThanOrEqual(postNewRun.lifecycle.colliderCount + 1);
  expect(final.activeAmbienceCount ?? 0).toBeLessThanOrEqual(1);
  expect(final.activeEffectVoiceCount ?? 0).toBeLessThanOrEqual(10);
  expect(final.activeTransientEffectCount ?? 0).toBeLessThanOrEqual(96);
  expect(errors).toEqual([]);
});
