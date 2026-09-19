/**
 * Accessibility smoke test — runs axe-core (WCAG 2.0/2.1/2.2 A+AA) against
 * the key routes and fails on any critical or serious violation.
 *
 * Usage:
 *   pnpm start &            # or pnpm dev
 *   pnpm test:a11y
 *   BASE_URL=http://localhost:3000 pnpm test:a11y
 */

import { AxeBuilder } from "@axe-core/playwright"
import { chromium } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"

const LOCALES = ["en", "fi", "de", "sv", "nl"]

const ROUTES = [
  "/",
  "/shop",
  "/shop/bpc-157",
  "/community",
  "/glossary",
  "/lab-tests",
  "/peptide-calculator",
]

function buildRoutes() {
  return LOCALES.flatMap((locale) => ROUTES.map((r) => `/${locale}${r}`))
}

const ALL_ROUTES = buildRoutes()

const BLOCKING_IMPACTS = new Set(["critical", "serious"])

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
const context = await browser.newContext()
// Skip the age gate so it doesn't overlay the page during scans.
await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: BASE_URL }])

let failed = false

for (const route of ALL_ROUTES) {
  const page = await context.newPage()
  try {
    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    })
    // Routes that need a database are skipped when the environment has none
    // (e.g. CI without DATABASE_URL) instead of failing on the error page.
    if ((response?.status() ?? 500) >= 500) {
      console.log(`SKIP ${route} (HTTP ${response?.status()})`)
      continue
    }
    await page.waitForTimeout(1500)

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()

    const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ""))
    const summary = blocking
      .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
      .join("\n")

    if (blocking.length > 0) {
      failed = true
      console.log(`FAIL ${route}\n${summary}`)
    } else {
      console.log(`PASS ${route} (${results.violations.length} minor violations)`)
    }
  } catch (err) {
    failed = true
    console.log(`ERROR ${route}: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    await page.close()
  }
}

await browser.close()

if (failed) {
  console.error("\nAccessibility smoke failed: critical/serious axe violations found.")
  process.exit(1)
}
console.log("\nAccessibility smoke passed.")
