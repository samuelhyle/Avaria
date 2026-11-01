/** A deliberately narrow exception for the merchant's no-goods checkout test. */
export const CHECKOUT_TEST_SLUG = "checkout-test-150"
export const CHECKOUT_TEST_SKU = "CHECKOUT-TEST-150"
export const CHECKOUT_TEST_MARKER = "checkout-test-fixture"

/**
 * The payment fixtures the owner seeded into the catalogue.
 *
 * Each one exists to exercise a payment path. None of them is merchandise:
 * there are no goods, no batch and no certificate behind them, and their
 * prices are placeholders. One is the card fixture above; the other tests
 * the crypto path.
 *
 * The storefront leaves them out of everything that browses the catalogue.
 * `isCheckoutTestProduct` recognises only the first of them, because the
 * direct-sale and shipping rules are written for that one alone — but a
 * shopper must not be offered either of them, so the catalogue asks about
 * the owner's own marker as well as about these names.
 */
export const CHECKOUT_FIXTURE_SLUGS: ReadonlySet<string> = new Set([
  CHECKOUT_TEST_SLUG,
  "test-usdc-1-50",
])

export function isCheckoutTestProduct(
  product: { slug: string; status: string; productType: string; specJson: unknown },
  vial: { sku: string; priceCents: number | null; purchaseMode: string },
): boolean {
  const spec = product.specJson as Record<string, unknown> | null
  return (
    process.env.CHECKOUT_TEST_PRODUCT_ENABLED === "true" &&
    product.slug === CHECKOUT_TEST_SLUG &&
    product.status === "active" &&
    product.productType === "supplies" &&
    spec?.checkoutTest === true &&
    spec.evidenceRef === CHECKOUT_TEST_MARKER &&
    vial.sku === CHECKOUT_TEST_SKU &&
    vial.priceCents === 150 &&
    vial.purchaseMode === "direct"
  )
}
