import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"

/**
 * What the storefront says when a product cannot be ordered.
 *
 * Every product in the catalogue used to read "currently unavailable" with
 * no reason and no way forward, and the stock badge claimed the lot was sold
 * out even when no lot had ever been released. The storefront now names the
 * step of the release pipeline that is still open and offers the one action
 * that state deserves: a request when the team has to confirm something, a
 * notification when only time is missing.
 */

const messages = Object.fromEntries(
  ["en", "fi"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)

for (const locale of ["en", "fi"]) {
  const copy = messages[locale]

  test(`${locale}: a product sold on request says so and takes a request`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/shop/aod-9604`)

    const panel = page.getByTestId("product-availability")
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute("data-blocker", "quotation")
    await expect(panel).toHaveAttribute("data-action", "requestLot")
    await expect(panel).toContainText(copy.product.availability.quotation.title)

    // The request says what is being asked about.
    await expect(panel).toContainText("AOD-9604")
    await expect(panel).toContainText("AOD-5")

    await expect(page.getByTestId("quote-submit")).toBeVisible()
  })

  test(`${locale}: a product in stock offers the cart and no apology`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/shop/bpc-157`)

    await expect(page.getByTestId("product-availability")).toHaveCount(0)
    await expect(page.getByRole("button", { name: copy.product.addToCart }).first()).toBeVisible()
  })

  test(`${locale}: the catalogue does not claim an unreleased lot is sold out`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/shop`)

    const card = page.locator("article").filter({ hasText: "AOD-9604" }).first()
    await expect(card).toBeVisible()
    // "Sold out" would be false: no lot has been released for this product.
    await expect(card.getByText(copy.shop.outOfStockBadge)).toHaveCount(0)
    // The price is on request, and it says so once.
    await expect(card.getByText(copy.shop.pricingOnRequest)).toHaveCount(1)
  })
}
