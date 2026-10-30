"use client"

import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function OrderStatus({
  id,
  status,
  items,
}: { id: string; status: string; items: Array<{ sku: string; qty: number }> }) {
  const router = useRouter()
  useEffect(() => {
    if (
      ["paid", "packed", "shipped", "delivered"].includes(status) &&
      useCheckout.getState().pendingOrderId === id
    ) {
      const cart = useCart.getState()
      for (const item of items) {
        const current = cart.items.find((line) => line.sku === item.sku)
        if (!current) continue
        if (current.qty <= item.qty) cart.remove(item.sku)
        else cart.setQty(item.sku, current.qty - item.qty)
      }
      useCheckout.getState().reset()
    }
    // A crypto order waits in `awaiting_crypto` for the transfer to land, so
    // the page has to keep polling for it as well as for a card payment.
    if (!["pending", "awaiting_crypto"].includes(status)) return
    let ticks = 0
    const timer = setInterval(() => {
      if (++ticks > 100) clearInterval(timer)
      else router.refresh()
    }, 3000)
    return () => clearInterval(timer)
  }, [id, status, items, router])
  return null
}
