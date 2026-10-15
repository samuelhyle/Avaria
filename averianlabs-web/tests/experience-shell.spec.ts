import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
const messages = Object.fromEntries(
  ["en", "fi"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)
for (const locale of ["en", "fi"]) {
  test(`${locale}: persisted cart snapshots hydrate consistently across full navigations`, async ({
    cleanPage: page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript(() =>
      localStorage.setItem(
        "averianlabs-cart",
        JSON.stringify({
          version: 2,
          state: {
            items: [
              {
                productSlug: "qa-peptide",
                sku: "QA-PEPTIDE-5",
                name: "QA peptide — test fixture",
                mg: 5,
                sizeValue: 5,
                sizeUnit: "mg",
                qty: 2,
                unitPriceCents: 4000,
                purchaseMode: "direct",
              },
            ],
          },
        }),
      ),
    )
    for (const path of ["", "/shop", "/checkout/cart", "/peptide-calculator", "/checkout/cart"]) {
      await page.goto(`/${locale}${path}`)
      await expect(
        page
          .locator("header")
          .first()
          .getByRole("button", { name: messages[locale].nav.cart, exact: true }),
      ).toContainText("2")
      await page.waitForTimeout(150)
    }
    expect(errors).toEqual([])
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("averianlabs-cart") ?? "{}").state.items[0].qty,
      ),
    ).toBe(2)
  })
  test(`${locale}: mobile menu fills the viewport and reaches the current document library`, async ({
    cleanPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${locale}`)
    await page.getByRole("button", { name: messages[locale].nav.openMenu, exact: true }).click()
    const menu = page.getByRole("dialog", { name: messages[locale].nav.openMenu, exact: true })
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box?.height).toBeGreaterThan(700)
    expect(box?.width).toBeLessThanOrEqual(390)
    await menu
      .getByRole("link", { name: messages[locale].experience.documents, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`/${locale}/documents$`))
    await page.getByRole("button", { name: messages[locale].nav.openMenu, exact: true }).click()
    await expect(
      page
        .getByRole("dialog", { name: messages[locale].nav.openMenu, exact: true })
        .getByRole("link", { name: messages[locale].experience.documents, exact: true }),
    ).toHaveAttribute("aria-current", "page")
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
  })
  test(`${locale}: immediate mobile filters expose checked state and retain view and hash`, async ({
    cleanPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${locale}/shop?view=list#catalogue`)
    await page.getByRole("button", { name: messages[locale].shop.filters, exact: true }).click()
    const dialog = page.getByRole("dialog", { name: messages[locale].shop.filters, exact: true })
    const category = dialog.getByRole("checkbox", {
      name: new RegExp(messages[locale].research.categories.recovery),
    })
    await category.check()
    await expect(category).toBeChecked()
    await expect(page).toHaveURL(/view=list.*category=recovery#catalogue$/)
    await dialog
      .getByRole("button", { name: messages[locale].experience.showResults, exact: true })
      .click()
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole("link", { name: messages[locale].research.compare, exact: true }).first(),
    ).toBeVisible()
  })
}
test("search remains usable when localStorage is unavailable", async ({ cleanPage: page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError")
      },
    }),
  )
  await page.goto("/en")
  await page
    .locator("header")
    .first()
    .getByRole("button", { name: messages.en.nav.search, exact: true })
    .click()
  await page.getByPlaceholder(messages.en.research.searchPlaceholder).fill("QA-PEPTIDE-5")
  await page.getByRole("option", { name: /QA peptide/i }).click()
  await expect(page).toHaveURL(/\/en\/shop\/qa-peptide/)
  expect(errors).toEqual([])
})
test("first visit completes eligibility before showing readable cookie choices", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto("/fi")
  const age = page.getByRole("dialog", { name: messages.fi.ageGate.title, exact: true })
  await expect(age).toBeVisible()
  await expect(
    page.getByRole("dialog", { name: messages.fi.cookie.title, exact: true }),
  ).toHaveCount(0)
  await age.getByRole("button", { name: messages.fi.ageGate.yes, exact: true }).focus()
  await page.keyboard.press("Shift+Tab")
  await expect(age.getByRole("button", { name: messages.fi.ageGate.no, exact: true })).toBeFocused()
  await age.getByRole("button", { name: messages.fi.ageGate.yes, exact: true }).click()
  const cookies = page.getByRole("dialog", { name: messages.fi.cookie.title, exact: true })
  await expect(
    cookies.getByRole("button", { name: messages.fi.cookie.reject, exact: true }),
  ).toBeVisible()
  await cookies.getByRole("button", { name: messages.fi.cookie.reject, exact: true }).click()
  await expect(cookies).toBeHidden()
  await context.close()
})
