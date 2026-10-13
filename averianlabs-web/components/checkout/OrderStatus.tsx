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
      ["paid", "shipped", "delivered"].includes(status) &&
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
    if (status !== "pending") return
    let ticks = 0
    const timer = setInterval(() => {
      if (++ticks > 100) clearInterval(timer)
      else router.refresh()
    }, 3000)
    return () => clearInterval(timer)
  }, [id, status, items, router])
  return null
}
