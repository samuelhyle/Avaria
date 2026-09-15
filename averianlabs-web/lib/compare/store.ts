"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

const MAX_COMPARE = 4

interface CompareState {
  items: string[]
  toggle: (slug: string) => void
  has: (slug: string) => boolean
  remove: (slug: string) => void
  clear: () => void
  count: () => number
  isFull: () => boolean
  max: number
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      max: MAX_COMPARE,
      toggle: (slug) => {
        const { items } = get()
        if (items.includes(slug)) {
          set({ items: items.filter((s) => s !== slug) })
          return
        }
        if (items.length >= MAX_COMPARE) return
        set({ items: [...items, slug] })
      },
      has: (slug) => get().items.includes(slug),
      remove: (slug) => set((s) => ({ items: s.items.filter((x) => x !== slug) })),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
      isFull: () => get().items.length >= MAX_COMPARE,
    }),
    { name: "averianlabs-compare" },
  ),
)
