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
