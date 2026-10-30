import { products, vials } from "@/db/schema"
import { CHECKOUT_TEST_SKU, isCheckoutTestProduct } from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { type ShippingAddress, type ShippingRate, getShippingRates } from "./index"

/**
 * Server-only wrapper around `getShippingRates` that caches carrier quotes for
 * five minutes. `lib/shipping/index.ts` stays client-safe (the checkout form
 * imports its fallback rates), so `next/cache` lives in this module.
 */
export const getCachedShippingRates = unstable_cache(
  async (address: ShippingAddress, weightKg = 0.5): Promise<ShippingRate[]> =>
    getShippingRates(address, weightKg),
  ["shipping:rates"],
  { revalidate: 300, tags: ["shipping"] },
)

/** The no-goods checkout fixture has no delivery fee. Ordinary carrier quotes stay unchanged. */
export async function getCheckoutShippingRates(
  address: ShippingAddress,
  items: Array<{ sku: string; qty: number }>,
): Promise<ShippingRate[]> {
  if (items.length === 1 && items[0]?.sku === CHECKOUT_TEST_SKU && items[0].qty === 1) {
    const [row] = await db
      .select({ product: products, vial: vials })
      .from(vials)
      .innerJoin(products, eq(products.id, vials.productId))
      .where(eq(vials.sku, CHECKOUT_TEST_SKU))
      .limit(1)
    if (row && isCheckoutTestProduct(row.product, row.vial))
      return [
        {
          id: "checkout-test-no-delivery",
          carrier: "Checkout test",
          service: "No physical shipment",
          eta: "",
          priceCents: 0,
        },
      ]
  }
  return getCachedShippingRates(address)
}
