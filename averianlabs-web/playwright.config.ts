import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, devices } from "@playwright/test"

/**
 * Load `.env.local` so `pnpm test:e2e` works from a clean checkout.
 *
 * The browser suites mutate the database, and `tests/helpers/test-database.ts`
 * refuses to run unless `DATABASE_URL` and `TEST_DATABASE_URL` point at the same
 * isolated database. Neither Playwright nor Node loads `.env.local` on its own,
 * so without this every browser test died with "Browser mutations require matching
 * isolated DATABASE_URL and TEST_DATABASE_URL" — twelve of the suite's failures
 * were one missing environment variable.
 */
function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator < 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)
    // An explicit environment variable always wins over the file.
    if (key && !process.env[key]) process.env[key] = value
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), ".env"))

const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`

// Publish the resolved origin. Tests that build a URL themselves read
// `process.env.BASE_URL`, and without this they fall back to port 3000 while
// the suite is running against a different port — which looks like a broken
// page rather than a misconfigured run.
process.env.BASE_URL = BASE_URL

/**
 * Fail loudly before a single test runs.
 *
 * Without this the missing variable surfaces as fifteen unrelated assertion
 * failures that look like product bugs.
 */
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set.\n" +
      "The browser suites mutate the database and require an isolated one.\n" +
      "Add this line to .env.local, pointing at the same database as DATABASE_URL:\n" +
      '  TEST_DATABASE_URL="postgres://…/build"\n' +
      "The database name must be averian_reliability or build. See .env.example.",
  )
}
if (process.env.TEST_DATABASE_URL !== process.env.DATABASE_URL) {
  throw new Error(
    [
      "TEST_DATABASE_URL and DATABASE_URL must be identical for the browser suites:",
      `TEST_DATABASE_URL=${process.env.TEST_DATABASE_URL}`,
      `DATABASE_URL=${process.env.DATABASE_URL}`,
    ].join(" "),
  )
}

export default defineConfig({
  testDir: "./tests",
  // Vitest unit tests live under tests/unit/ and would crash Playwright's
  // runner; exclude them.
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/tests/unit/**", "**/tests/integration/**", "**/*.unit.test.ts"],
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
    // CI starts the server itself so the checks that run after the browser
    // suite (accessibility, narrow-viewport, runtime audit) have something to
    // talk to. `E2E_REUSE_SERVER` opts into reusing it.
    reuseExistingServer: !process.env.CI || process.env.E2E_REUSE_SERVER === "true" || undefined,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      // Reliability journeys require an explicitly isolated, migrated and seeded DB.
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      // The rate limiter must not throttle parallel browser workers.
      RATE_LIMIT_DISABLED: "true",
      // The server has to serve the build the suite is testing. Without this
      // the server looks for `.next` while the build went somewhere else,
      // and every test fails on "Could not find a production build".
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next",
    },
  },

  expect: {
    timeout: 10_000,
  },
  timeout: 60_000,
})
