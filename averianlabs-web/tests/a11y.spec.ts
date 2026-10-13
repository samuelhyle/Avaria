import { readFileSync } from "node:fs"
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
const ROUTES = ["en", "fi"].flatMap((locale) =>
  [
    "",
    "/shop",
    "/shop/qa-water",
    "/quality",
    "/about",
    "/checkout/cart",
    "/peptide-calculator",
    "/documents",
    "/contact",
  ].map((path) => `/${locale}${path}`),
)

for (const path of ROUTES) {
  test(`a11y: ${path} has no serious/critical axe-core violations`, async ({ cleanPage: page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" })
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
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

for (const locale of ["en", "fi"]) {
  test(`a11y: ${locale} populated checkout email/address/shipping/payment has no blocking violations`, async ({
    cleanPage: page,
  }) => {
    const m = JSON.parse(
      readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
    )
    const scan = async () => {
      await expect(page).toHaveTitle(new RegExp(m.checkout.title))
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(
        result.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([])
    }
    await page.goto(`/${locale}/shop/qa-water`)
    await page
      .locator("main")
      .getByRole("button", { name: /add to cart|lisää ostoskoriin/i })
      .first()
      .click()
    await page.keyboard.press("Escape")
    await page.goto(`/${locale}/checkout/email`)
    await page
      .locator("main")
      .getByRole("textbox", { name: m.checkout.email, exact: true })
      .fill("browser-qa-checkout@example.invalid")
    await scan()
    await page.locator("main").getByRole("button", { name: m.checkout.guest, exact: true }).click()
    await page.waitForURL(`**/${locale}/checkout/address`)
    for (const [name, value] of [
      [m.checkout.firstName, "Test"],
      [m.checkout.lastName, "User"],
      [m.checkout.street, "Test street 1"],
      [m.checkout.postal, "00100"],
      [m.checkout.city, "Helsinki"],
    ])
      await page.getByRole("textbox", { name, exact: true }).fill(value)
    await scan()
    await page.getByRole("button", { name: m.checkout.continueToShipping, exact: true }).click()
    await page.waitForURL(`**/${locale}/checkout/shipping`)
    await page.getByRole("radio").last().check()
    const next = page.getByRole("button", { name: m.research.continuePayment, exact: true })
    await expect(next).toBeEnabled()
    await scan()
    await next.click()
    await page.waitForURL(`**/${locale}/checkout/payment`)
    await expect(page.locator("main")).toContainText(locale === "fi" ? "25,5 %" : "25.5%")
    await scan()
  })
}
