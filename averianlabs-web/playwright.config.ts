import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
  // Vitest unit tests live under tests/unit/ and would crash Playwright's
  // runner; exclude them.
  testIgnore: ["**/tests/unit/**", "**/*.unit.test.ts"],
  fullyParallel: true,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 2 : 0,
  workers: process.env.CI === "true" ? 2 : undefined,
  reporter: process.env.CI === "true" ? [["github"], ["list"]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      // Force English for test runs unless overridden.
      "accept-language": "en",
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm start",
    url: `${BASE_URL}/en`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      // Tests must not require a real DB — we filter routes that need one at runtime.
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },

  expect: {
    timeout: 10_000,
  },
  timeout: 60_000,
})
