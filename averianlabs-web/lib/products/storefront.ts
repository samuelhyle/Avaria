import type { Product } from "@/lib/products/types"

/**
 * What the storefront presents.
 *
 * This is a policy, not a query, so it lives apart from the module that
 * reads the database: it can then be used — and tested — without one.
 *
 * The checkout fixture is a payment test, not merchandise. It has no goods,
 * no batch, no certificate and a placeholder price, and the owner can put
 * it back for as long as the payment path is being tested.
 */
export function storefrontProducts(products: Product[]): Product[] {
  if (process.env.CHECKOUT_FIXTURE_IN_STOREFRONT === "true") return products
  return products.filter((product) => !product.checkoutTest)
}
