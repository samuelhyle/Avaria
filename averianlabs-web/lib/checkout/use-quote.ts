"use client"

import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import type { QuoteLine } from "@/lib/orders/quote"
import type { ShippingRate } from "@/lib/shipping"
import { useEffect, useState } from "react"

export interface CheckoutQuote {
  lines: QuoteLine[]
  subtotalCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
  hash: string
  currency: string
}
interface Result {
  signature: string
  quote?: CheckoutQuote
  rates?: ShippingRate[]
  shippingMethodId?: string
  error?: string
}

export function useCheckoutQuote(locale: string) {
  const items = useCart((state) => state.items)
  const address = useCheckout()
  const [revision, setRevision] = useState(0)
  const signature = JSON.stringify({
    items: items.map(({ sku, qty }) => ({ sku, qty })),
    locale,
    country: address.country,
    postal: address.postal,
    city: address.city,
    shippingMethodId: address.shippingMethod || undefined,
    revision,
  })
  const [result, setResult] = useState<Result | null>(null)
  useEffect(() => {
    if (!items.length) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: signature,
          signal: controller.signal,
        })
        const data = await response.json()
        if (controller.signal.aborted) return
        if (!response.ok) {
          setResult({ signature, error: data.code ?? "quote_unavailable" })
          return
        }
        setResult({ signature, ...data })
      } catch {
        if (!controller.signal.aborted) setResult({ signature, error: "quote_unavailable" })
      }
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [signature, items.length])
  const current = result?.signature === signature ? result : null
  return {
    refresh: () => setRevision((value) => value + 1),
    quote: current?.quote,
    rates: current?.rates ?? [],
    shippingMethodId: current?.shippingMethodId,
    error: current?.error,
    loading: items.length > 0 && !current,
  }
}
