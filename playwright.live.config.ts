import { defineConfig, devices } from "@playwright/test";

const configuredBaseUrl = process.env.LIVE_BASE_URL;

if (!configuredBaseUrl) {
  throw new Error("LIVE_BASE_URL is required for production smoke tests; localhost is never used.");
}

const liveBaseUrl = new URL(configuredBaseUrl);
if (liveBaseUrl.protocol !== "https:") {
  throw new Error(`LIVE_BASE_URL must use HTTPS; received ${liveBaseUrl.protocol}`);
}

export default defineConfig({
  testDir: "./e2e-live",
  outputDir: "test-results/live",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 2,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  use: {
    baseURL: liveBaseUrl.href,
    ...devices["Desktop Chrome"],
    headless: true,
    ignoreHTTPSErrors: false,
    trace: "retain-on-failure",
  },
});
