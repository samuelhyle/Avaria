import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  testMatch: "crypto-checkout-complete.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: { timeout: 15000 },
})
