"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * How a vial is sold. Mirrors the `vials.purchase_mode` DB column.
 * Server is authoritative — these values are mirrored client-side only so the
 * UI can show the correct CTA and the cart can refuse to check out a
 * non-buyable line. See PHASE2_CATALOGUE_DESIGN.md §3.1.
 */
export type PurchaseMode = "direct" | "quotation" | "unavailable"

/** Typed size; replaces the old `mg: number` field. */
export type SizeUnit = "mg" | "g" | "mcg" | "mL" | "uL" | "vial"

export interface CartItem {
  productSlug: string
  sku: string
  name: string
  /**
   * Legacy mass-only field kept for backward compatibility with pre-Phase-2
   * cart state. New code should pass `sizeValue` + `sizeUnit` instead so
   * volume / count items render correctly (UNIT-01).
   */
  mg: number
  sizeValue: number
  sizeUnit: SizeUnit
  qty: number
  /**
   * Always present as a number. Quotation items use 0 + the `purchaseMode`
   * discriminator; the cart store and the checkout API reject any non-direct
   * line before it can affect pricing.
   */
  unitPriceCents: number
  purchaseMode: PurchaseMode
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
  /** Sum of unitPriceCents × qty for `direct` items only. */
  subtotal: () => number
  count: () => number
  /** True if any item is not directly buyable. Used to gate the checkout CTA. */
  hasNonBuyable: () => boolean
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((state) => {
          // Quotation / unavailable items are kept in the cart for display
          // (so the user can see the "Contact for quote" badge) but they
          // never merge with direct-purchase items: the SKU is unique per
          // purchase mode in practice, and treating them as separate lines
          // keeps the totals honest.
          const addQty = item.qty ?? 1
          const existing = state.items.find(
            (i) => i.sku === item.sku && i.purchaseMode === item.purchaseMode,
          )
          if (existing && item.purchaseMode === "direct") {
            const totalQty = existing.qty + addQty
            // Blend unit prices so line totals stay exact when the same SKU is
            // added again at a different price (e.g. bundle discounts).
            const existingPrice = existing.unitPriceCents ?? 0
            const newPrice = item.unitPriceCents ?? 0
            const unitPriceCents = Math.round(
              (existingPrice * existing.qty + newPrice * addQty) / totalQty,
            )
            return {
              items: state.items.map((i) =>
                i.sku === item.sku && i.purchaseMode === item.purchaseMode
                  ? { ...i, qty: totalQty, unitPriceCents }
                  : i,
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
      subtotal: () =>
        get().items.reduce((sum, i) => {
          if (i.purchaseMode !== "direct" || i.unitPriceCents === null) return sum
          return sum + i.unitPriceCents * i.qty
        }, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      hasNonBuyable: () => get().items.some((i) => i.purchaseMode !== "direct"),
    }),
    {
      name: "averianlabs-cart",
      partialize: (state) => ({ items: state.items }),
      // Drop legacy carts that pre-date the purchaseMode / sizeValue fields.
      // Without this, persisted carts from the previous build deserialize
      // with `undefined` and crash the type-narrowing subtotal().
      version: 2,
      migrate: (persistedState, _version) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState
        const items = (persistedState as { items?: unknown }).items
        if (!Array.isArray(items)) return persistedState
        return {
          ...(persistedState as object),
          items: items
            .filter((i): i is CartItem => {
              return (
                typeof i === "object" &&
                i !== null &&
                typeof (i as CartItem).sku === "string" &&
                typeof (i as CartItem).productSlug === "string" &&
                typeof (i as CartItem).name === "string"
              )
            })
            .map((i) => ({
              ...i,
              // Forward-fill new fields if migrating from a v1 cart.
              mg: typeof i.mg === "number" ? i.mg : (i.sizeValue ?? 0),
              sizeValue: typeof i.sizeValue === "number" ? i.sizeValue : (i.mg ?? 0),
              sizeUnit: i.sizeUnit ?? "mg",
              purchaseMode: i.purchaseMode ?? "direct",
              unitPriceCents: i.unitPriceCents ?? null,
            })),
        }
      },
    },
  ),
)
