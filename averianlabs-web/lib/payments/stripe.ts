import { getServerEnv } from "@/lib/env"
import Stripe from "stripe"

let _stripe: Stripe | null = null
let _cachedKey: string | null = null

export function stripe(): Stripe {
  const key = getServerEnv().STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  // Re-instantiate the client when the key changes (test stubs override
  // `STRIPE_SECRET_KEY` at runtime via `resetServerEnvCache()`).
  if (!_stripe || _cachedKey !== key) {
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: { name: "AverianLabs", version: "0.1.0" },
    })
    _cachedKey = key
  }
  return _stripe
}
