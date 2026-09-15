"use client"

import { useCart } from "@/lib/cart/store"
import { useEffect } from "react"

export function CartHydration() {
  useEffect(() => {
    useCart.persist.rehydrate()
  }, [])
  return null
}
