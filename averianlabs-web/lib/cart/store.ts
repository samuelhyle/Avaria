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

const MAX_QTY = 99

function sanitizeQty(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10)
  if (!Number.isFinite(n)) return 1
  if (n < 1) return 1
  if (n > MAX_QTY) return MAX_QTY
  return Math.floor(n)
}

function isValidItem(item: Partial<CartItem>): item is CartItem {
  return (
    typeof item.sku === "string" &&
    item.sku.length > 0 &&
    typeof item.productSlug === "string" &&
    item.productSlug.length > 0 &&
    typeof item.name === "string" &&
    typeof item.mg === "number" &&
    Number.isFinite(item.mg) &&
    typeof item.unitPriceCents === "number" &&
    Number.isFinite(item.unitPriceCents) &&
    item.unitPriceCents >= 0
  )
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
          if (!isValidItem(item)) return state
          const addQty = sanitizeQty(item.qty ?? 1)
          const existing = state.items.find((i) => i.sku === item.sku)
          if (existing) {
            const totalQty = Math.min(existing.qty + addQty, MAX_QTY)
            if (totalQty === existing.qty) return { ...state, isOpen: true }
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
          items: state.items.map((i) => (i.sku === sku ? { ...i, qty: sanitizeQty(qty) } : i)),
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
      // Strip any corrupted shape loaded from older storage versions.
      merge: (persisted, current) => {
        const items = Array.isArray((persisted as { items?: unknown[] })?.items)
          ? (persisted as { items: CartItem[] }).items.filter(isValidItem).map((i) => ({
              ...i,
              qty: sanitizeQty(i.qty),
            }))
          : current.items
        return { ...current, items }
      },
    },
  ),
)
