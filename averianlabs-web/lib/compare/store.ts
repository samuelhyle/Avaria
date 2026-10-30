"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

const MAX_COMPARE = 4

interface CompareState {
  items: string[]
  isOpen: boolean
  toggle: (slug: string) => void
  has: (slug: string) => boolean
  remove: (slug: string) => void
  clear: () => void
  open: () => void
  close: () => void
  count: () => number
  isFull: () => boolean
  max: number
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
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
      clear: () => set({ items: [], isOpen: false }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      count: () => get().items.length,
      isFull: () => get().items.length >= MAX_COMPARE,
    }),
    {
      name: "averianlabs-compare",
      // Persist only the product slugs; UI state is ephemeral.
      partialize: (state) => ({ items: state.items }) as never,
    },
  ),
)
