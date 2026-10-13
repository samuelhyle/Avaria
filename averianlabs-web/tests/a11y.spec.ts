import { expect, test } from "@/tests/fixtures"
import AxeBuilder from "@axe-core/playwright"

/**
 * A11y smoke test — uses `@axe-core/playwright` to run axe-core 4.10 against
 * a few representative pages and fails the test on any `serious` or
 * `critical` violation. Lower-severity violations are logged but allowed.
 *
 * Routes covered:
 *   /en            (homepage)
 *   /en/shop       (catalogue)
 *   /en/quality    (one of the new primary-nav items)
 *   /en/about      (company)
 *
 * The plan §11 a11y budget says the storefront should hit axe 0 errors of
 * serious or critical severity on these pages. This test is the gate.
 */
const ROUTES = ["/en", "/en/shop", "/en/quality", "/en/about"]

for (const path of ROUTES) {
  test(`a11y: ${path} has no serious/critical axe-core violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" })
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze()

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    )
    if (serious.length > 0) {
      // Surface every offending node so the failure message is actionable.
      const lines = serious
        .map(
          (v) =>
            `  - [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes
              .map((n) => n.target.join(", "))
              .slice(0, 5)
              .join(" | ")}`,
        )
        .join("\n")
      throw new Error(
        `axe-core found ${serious.length} serious/critical issues on ${path}:\n${lines}`,
      )
    }
    expect(serious.length).toBe(0)
  })
}
