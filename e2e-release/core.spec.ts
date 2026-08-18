import { expect, test, type Page } from "@playwright/test";

interface Snapshot {
  readonly activeScene: string | null;
  readonly playerPosition: { readonly x: number; readonly y: number } | null;
  readonly playerFacing: { readonly x: number; readonly y: number } | null;
  readonly runFingerprint: string | null;
  readonly currentFloorNumber: number | null;
  readonly objectiveStatus: string | null;
  readonly floorClearedOverlayVisible: boolean | null;
  readonly presentationModalKind: string | null;
  readonly interactionPrompt: string | null;
  readonly physicsPaused: boolean | null;
  readonly releaseVersion: string;
  readonly lifecycle: { readonly rendererType: string; readonly activeSceneCount: number };
}

interface BridgeWindow extends Window {
  __DUNGEON_ESCAPE_E2E__?: {
    snapshot: () => Snapshot;
    teleportToTarget: (target: "spawn" | "key" | "gate") => void;
  };
}

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const bridge = (window as BridgeWindow).__DUNGEON_ESCAPE_E2E__;
    if (!bridge) throw new Error("E2E bridge unavailable");
    return bridge.snapshot();
  });
}

async function openAndStart(page: Page, seed = "v1-release-matrix"): Promise<void> {
  await page.addInitScript(() =>
    window.localStorage.setItem("dungeon-escape.onboarding.v1", "complete"),
  );
  await page.goto(`/?seed=${seed}`);
  await page.waitForFunction(() => Boolean((window as BridgeWindow).__DUNGEON_ESCAPE_E2E__));
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("MenuScene");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("GameScene");
}

async function teleport(page: Page, target: "key" | "gate"): Promise<void> {
  await page.evaluate((value) => {
    (window as BridgeWindow).__DUNGEON_ESCAPE_E2E__?.teleportToTarget(value);
  }, target);
}

test("boots, reports v1, starts without Space leakage, and preserves the fixed plan", async ({
  page,
}) => {
  await openAndStart(page);
  const first = await snapshot(page);
  expect(first.releaseVersion).toBe("1.0.0");
  expect(first.runFingerprint).toMatch(/^rn-[0-9a-f]{8}$/);
  expect(first.lifecycle.activeSceneCount).toBeGreaterThan(0);
  expect(first.playerPosition).toEqual(expect.any(Object));
  await page.reload();
  await page.waitForFunction(() => Boolean((window as BridgeWindow).__DUNGEON_ESCAPE_E2E__));
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("MenuScene");
  await page.keyboard.press("Space");
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("GameScene");
  expect((await snapshot(page)).runFingerprint).toBe(first.runFingerprint);
});

test("moves without page scroll and maps pointer attacks after resize", async ({ page }) => {
  await openAndStart(page, "v1-pointer-matrix");
  const before = await snapshot(page);
  let moved = false;
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(140);
    await page.keyboard.up(key);
    const current = await snapshot(page);
    moved ||=
      current.playerPosition?.x !== before.playerPosition?.x ||
      current.playerPosition?.y !== before.playerPosition?.y;
  }
  expect(moved).toBe(true);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
  await page.setViewportSize({ width: 720, height: 700 });
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounds unavailable");
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.5);
  await expect.poll(async () => (await snapshot(page)).playerFacing?.x ?? 0).toBeGreaterThan(0);
});

test("pauses exactly and resumes while settings remain usable", async ({ page }) => {
  await openAndStart(page, "v1-pause-matrix");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("pause");
  expect((await snapshot(page)).physicsPaused).toBe(true);
  await page.waitForTimeout(120);
  await page.keyboard.press("s");
  await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("settings");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("pause");
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("none");
});

test("survives denied storage, mute, fullscreen rejection, and focus loss", async ({ page }) => {
  await page.addInitScript(() => {
    for (const audioGlobal of ["Audio", "AudioContext", "webkitAudioContext"] as const)
      Object.defineProperty(window, audioGlobal, { configurable: true, value: undefined });
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => {
          throw new DOMException("denied", "SecurityError");
        },
      });
    }
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: () => Promise.reject(new DOMException("rejected", "NotAllowedError")),
    });
  });
  await page.goto("/?seed=v1-fallback-matrix");
  await page.waitForFunction(() => Boolean((window as BridgeWindow).__DUNGEON_ESCAPE_E2E__));
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("MenuScene");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page)).activeScene).toBe("GameScene");
  if ((await snapshot(page)).presentationModalKind === "manual") {
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("none");
  }
  await page.keyboard.press("m");
  await page.keyboard.press("f");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await snapshot(page)).presentationModalKind).toBe("pause");
});

test("completes a real objective and continues to the second floor", async ({ page }) => {
  await openAndStart(page, "v1-objective-matrix");
  await teleport(page, "gate");
  await page.waitForTimeout(100);
  await page.keyboard.press("e");
  expect((await snapshot(page)).objectiveStatus).toBe("seeking-key");
  await teleport(page, "key");
  await expect
    .poll(async () => (await snapshot(page)).interactionPrompt)
    .toContain("TAKE RUNIC KEY");
  await page.keyboard.press("e");
  await expect.poll(async () => (await snapshot(page)).objectiveStatus).toBe("key-collected");
  await teleport(page, "gate");
  await expect
    .poll(async () => (await snapshot(page)).interactionPrompt)
    .toContain("OPEN ANCIENT GATE");
  await page.keyboard.press("e");
  await expect.poll(async () => (await snapshot(page)).floorClearedOverlayVisible).toBe(true);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page)).currentFloorNumber).toBe(2);
});

test("keeps responsive layouts free of document overflow", async ({ page }) => {
  await openAndStart(page, "v1-responsive-matrix");
  for (const size of [
    { width: 720, height: 700 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    const overflow = await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    }));
    expect(overflow).toEqual({ horizontal: false, vertical: false });
  }
});

test("shows friendly fatal renderer guidance in the isolated boot mode", async ({ page }) => {
  await page.goto("/?seed=v1-fatal&__renderer_fatal=1");
  await expect(page.getByText("DUNGEON ESCAPE COULD NOT START")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload Game" })).toBeVisible();
  await expect(page.locator(".fatal-error__version")).toContainText("v1.0.0");
  await expect(page.locator("body")).not.toContainText("stack");
});
