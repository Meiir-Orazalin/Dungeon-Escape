import base from "./playwright.live.config";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  ...base,
  outputDir: "test-results/live-matrix",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
