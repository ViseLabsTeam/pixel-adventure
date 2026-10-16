import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: process.env.DEMO_URL ?? "http://localhost:8088",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results",
});
