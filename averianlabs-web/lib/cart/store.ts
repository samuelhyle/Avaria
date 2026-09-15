"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartItem {
  productSlug: string
  sku: string
  name: string
  mg: number
  qty: number
  unitPriceCents: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void
  remove: (sku: string) => void
  setQty: (sku: string, qty: number) => void
  clear: () => void
  open: () => void
  close: () => void
  toggle: () => void
  subtotal: () => number
  count: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((state) => {
          const addQty = item.qty ?? 1
          const existing = state.items.find((i) => i.sku === item.sku)
          if (existing) {
            const totalQty = existing.qty + addQty
            // Blend unit prices so line totals stay exact when the same SKU is
            // added again at a different price (e.g. bundle discounts).
            const unitPriceCents = Math.round(
              (existing.unitPriceCents * existing.qty + item.unitPriceCents * addQty) / totalQty,
            )
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, qty: totalQty, unitPriceCents } : i,
              ),
              isOpen: true,
            }
          }
          return {
            items: [...state.items, { ...item, qty: addQty }],
            isOpen: true,
          }
        }),
      remove: (sku) => set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      setQty: (sku, qty) =>
        set((state) => ({
          items: state.items.map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    {
      name: "averianlabs-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
