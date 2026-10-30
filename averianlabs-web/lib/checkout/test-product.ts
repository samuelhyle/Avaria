/** A deliberately narrow exception for the merchant's no-goods checkout test. */
export const CHECKOUT_TEST_SLUG = "checkout-test-150"
export const CHECKOUT_TEST_SKU = "CHECKOUT-TEST-150"
export const CHECKOUT_TEST_MARKER = "checkout-test-fixture"

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
