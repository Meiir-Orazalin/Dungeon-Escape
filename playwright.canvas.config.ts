import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-canvas",
  outputDir: "test-results/canvas",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "VITE_E2E_RENDERER=canvas pnpm exec vite --mode e2e --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
