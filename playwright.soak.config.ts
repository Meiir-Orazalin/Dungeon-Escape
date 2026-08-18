import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-soak",
  outputDir: "test-results/soak",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4176",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --mode e2e --host 127.0.0.1 --port 4176",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
