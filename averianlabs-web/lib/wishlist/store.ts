"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface WishlistState {
  items: string[]
  toggle: (slug: string) => void
  has: (slug: string) => boolean
  clear: () => void
  count: () => number
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (slug) =>
        set((state) => ({
          items: state.items.includes(slug)
            ? state.items.filter((s) => s !== slug)
            : [...state.items, slug],
        })),
      has: (slug) => get().items.includes(slug),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: "averianlabs-wishlist" },
  ),
)
