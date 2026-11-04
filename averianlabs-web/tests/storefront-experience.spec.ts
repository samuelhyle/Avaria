import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"

/**
 * The storefront's voice and its theatre.
 *
 * The shop stopped hedging and started stating: the hero says what is open,
 * the announcement strip says what is true, and the buy box puts the lot and
 * its certificate beside the price instead of at the bottom of the page.
 * The cart names the batch the customer is buying, so the promise made on
 * the product page travels with the order.
 */

const messages = Object.fromEntries(
  ["en", "fi"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)

for (const locale of ["en", "fi"]) {
  const copy = messages[locale]

  test(`${locale}: the hero states what is open and the strip says what is true`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}`)

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.home.heroTitle)
    await expect(page.getByText(copy.home.heroEyebrow)).toBeVisible()
    await expect(page.getByText(copy.store.announce.batchTested)).toBeVisible()
    // The catalogue's promise is one click away and says what it does.
    await expect(page.getByRole("link", { name: copy.home.ctaShop }).first()).toBeVisible()
  })

  test(`${locale}: the buy box puts the lot and its certificate beside the price`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/shop/bpc-157`)

    const price = page.getByRole("region", { name: copy.product.priceAvailability })
    await expect(price).toBeVisible()

    // The lot code, the measured purity and the certificate, in one row.
    const lot = price.getByText(copy.research.lot)
    await expect(lot).toBeVisible()
    const code = (await price.getByTestId("lot-code").innerText()).trim()
    expect(code.length).toBeGreaterThan(4)
    await expect(price.getByRole("link", { name: copy.research.viewDocuments })).toBeVisible()

    // And the dispatch promise sits next to the button.
    await expect(page.getByText(copy.product.dispatchNote)).toBeVisible()
  })

  test(`${locale}: the cart names the lot behind the line`, async ({ cleanPage: page }) => {
    await page.goto(`/${locale}/shop/bpc-157`)
    const price = page.getByRole("region", { name: copy.product.priceAvailability })
    const code = (await price.getByTestId("lot-code").innerText()).trim()

    await page.getByRole("button", { name: copy.product.addToCart }).first().click()
    // Adding a vial opens the cart drawer, so the lot is on screen without
    // another click.
    const drawer = page.getByRole("dialog", { name: copy.cart.drawerTitle })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText(copy.cart.lot.replace("{code}", code))).toBeVisible()
  })

  test(`${locale}: the ledger counts the lots it has published`, async ({ cleanPage: page }) => {
    await page.goto(`/${locale}`)
    const ledger = page.locator("section").filter({ hasText: copy.home.ledgerTitle }).first()
    await ledger.scrollIntoViewIfNeeded()
    await expect(ledger.getByText(copy.home.ledgerCount)).toBeVisible()
  })

  test(`${locale}: the page that is not there says so with a straight face`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/this-page-was-never-here`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.notFound.title)
    await expect(page.getByText(copy.notFound.body)).toBeVisible()
    await expect(
      page.getByRole("link", { name: copy.notFound.browseCatalog }).first(),
    ).toBeVisible()
  })
}
