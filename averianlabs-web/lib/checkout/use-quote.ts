"use client"

import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import type { QuoteLine } from "@/lib/orders/quote"
import type { ShippingRate } from "@/lib/shipping"
import { useEffect, useState } from "react"

export interface CheckoutQuote {
  lines: QuoteLine[]
  /** Product value before any promotion. */
  grossSubtotalCents: number
  /** Product value the customer pays. */
  subtotalCents: number
  discountCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
  hash: string
  currency: string
  /** The applied promotion, reduced to the fields a customer may see. */
  promotion?: {
    code: string
    kind: string
    label: string | null
    discountCents: number
    freeShipping: boolean
    minSubtotalCents: number
  } | null
  /** Why a supplied code did not apply. */
  promotionError?: string | null
  /** The minimum a rejected code required, in cents. */
  promotionRequiredCents?: number
}
interface Result {
  signature: string
  quote?: CheckoutQuote
  rates?: ShippingRate[]
  shippingMethodId?: string
  error?: string
}

export interface CheckoutQuoteState {
  quote?: CheckoutQuote
  rates: ShippingRate[]
  shippingMethodId?: string
  selectedRate?: ShippingRate
  error?: string
  loading: boolean
  refresh: () => void
}

export function useCheckoutQuote(locale: string): CheckoutQuoteState {
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
    promoCode: address.promoCode || undefined,
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
  const shippingMethodId = current?.shippingMethodId
  const rates = current?.rates ?? []
  // The server picks a default rate when the customer has not chosen one. Keep
  // that choice in the checkout store so the cart summary and the shipping step
  // price the same delivery method. Without this the cart quotes the default
  // (express) while the checkout quotes the rate the customer actually picked,
  // and the total silently changes between the two screens.
  useEffect(() => {
    if (!shippingMethodId) return
    const state = useCheckout.getState()
    if (state.shippingMethod === shippingMethodId) return
    state.setShippingMethod(shippingMethodId)
  }, [shippingMethodId])
  return {
    refresh: () => setRevision((value) => value + 1),
    quote: current?.quote,
    rates,
    shippingMethodId,
    selectedRate: rates.find((rate) => rate.id === shippingMethodId),
    error: current?.error,
    loading: items.length > 0 && !current,
  }
}
