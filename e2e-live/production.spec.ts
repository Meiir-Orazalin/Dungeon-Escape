import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const CANONICAL_URL = "https://meiirorazalin.com/";
const DOCUMENT_TITLE = "Dungeon Escape — Deterministic Dark-Fantasy Action Game";
const DESCRIPTION =
  "Explore a shifting dungeon, fight deterministic enemies, recover the Runic Key, and escape through the Ancient Gate.";

interface Diagnostics {
  readonly pageErrors: string[];
  readonly consoleErrors: string[];
  readonly failedApplicationRequests: string[];
}

function observeDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    pageErrors: [],
    consoleErrors: [],
    failedApplicationRequests: [],
  };

  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "meiirorazalin.com" || url.hostname === "www.meiirorazalin.com") {
      diagnostics.failedApplicationRequests.push(
        `${request.url()}: ${request.failure()?.errorText}`,
      );
    }
  });

  return diagnostics;
}

function expectCleanDiagnostics(diagnostics: Diagnostics): void {
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.failedApplicationRequests).toEqual([]);
}

test("canonical document metadata and public assets are production-ready", async ({
  page,
  request,
}) => {
  const diagnostics = observeDiagnostics(page);
  const response = await page.goto("/", { waitUntil: "networkidle" });

  expect(response?.ok()).toBe(true);
  expect(response?.url()).toBe(CANONICAL_URL);
  const runtimeUrl = new URL(page.url());
  expect(runtimeUrl.protocol).toBe("https:");
  expect(runtimeUrl.hostname).toBe("meiirorazalin.com");
  expect(runtimeUrl.pathname).toBe("/");
  expect(runtimeUrl.searchParams.get("seed")).toMatch(/^[a-z0-9_-]{1,48}$/);
  await expect(page).toHaveTitle(DOCUMENT_TITLE);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL_URL);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", DESCRIPTION);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    DOCUMENT_TITLE,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    DESCRIPTION,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", CANONICAL_URL);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${CANONICAL_URL}social-preview.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    DOCUMENT_TITLE,
  );

  for (const asset of [
    "/favicon.svg",
    "/site.webmanifest",
    "/social-preview.png",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    const assetResponse = await request.get(asset);
    expect(assetResponse.ok(), asset).toBe(true);
  }

  expectCleanDiagnostics(diagnostics);
});

test("fixed-seed production startup remains playable without page scrolling", async ({ page }) => {
  const diagnostics = observeDiagnostics(page);
  const response = await page.goto("/?seed=production-smoke", { waitUntil: "networkidle" });

  expect(response?.ok()).toBe(true);
  const canvas = page.locator("#game-container canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
  await expect(page.locator("#game-state")).toContainText("Main menu");
  await page.keyboard.press("Enter");
  await expect(page.locator("#game-state")).toContainText("Generated dungeon ready");

  const currentUrl = new URL(page.url());
  expect(currentUrl.protocol).toBe("https:");
  expect(currentUrl.hostname).toBe("meiirorazalin.com");
  expect(currentUrl.searchParams.get("seed")).toBe("production-smoke");
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual({
    x: 0,
    y: 0,
  });
  expect(await page.evaluate(() => "__DUNGEON_ESCAPE_E2E__" in window)).toBe(false);
  expectCleanDiagnostics(diagnostics);
});

test("plain HTTP redirects to the canonical HTTPS root", async ({ request }) => {
  const redirect = await request.get("http://meiirorazalin.com/", { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(redirect.status());
  const location = redirect.headers().location;
  expect(location).toBeTruthy();
  expect(new URL(location ?? "", "http://meiirorazalin.com/").href).toBe(CANONICAL_URL);
  expect((await request.get(CANONICAL_URL)).ok()).toBe(true);
});

test("www redirects to apex HTTPS while preserving the seed query", async ({ page }) => {
  const diagnostics = observeDiagnostics(page);
  await page.goto("https://www.meiirorazalin.com/?seed=www-redirect-check", {
    waitUntil: "networkidle",
  });

  const finalUrl = new URL(page.url());
  expect(finalUrl.protocol).toBe("https:");
  expect(finalUrl.hostname).toBe("meiirorazalin.com");
  expect(finalUrl.searchParams.get("seed")).toBe("www-redirect-check");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  expectCleanDiagnostics(diagnostics);
});

test("production excludes test bridges, localhost resources, mixed content, and dev overlays", async ({
  page,
}) => {
  const diagnostics = observeDiagnostics(page);
  await page.goto("/?seed=isolation-check", { waitUntil: "networkidle" });

  const globals = await page.evaluate(() => ({
    bridge: "__DUNGEON_ESCAPE_E2E__" in window,
    target: "teleportToTarget" in window,
    nearEnemy: "teleportNearEnemy" in window,
    ontoEnemy: "teleportOntoEnemy" in window,
  }));
  expect(globals).toEqual({ bridge: false, target: false, nearEnemy: false, ontoEnemy: false });

  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(resources.some((url) => url.includes("localhost") || url.includes("127.0.0.1"))).toBe(
    false,
  );
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expectCleanDiagnostics(diagnostics);
});
