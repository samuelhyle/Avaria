import { getServerEnv } from "@/lib/env"
import Stripe from "stripe"

let _stripe: Stripe | null = null

export function stripe(): Stripe {
  if (_stripe) return _stripe
  const key = getServerEnv().STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  _stripe = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    appInfo: { name: "AverianLabs", version: "0.1.0" },
  })
  return _stripe
}
