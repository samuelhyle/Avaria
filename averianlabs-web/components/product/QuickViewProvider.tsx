"use client"

import { QuickView } from "@/components/product/QuickView"
import type { Locale, Product } from "@/lib/products/types"
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

interface QuickViewContextValue {
  /** Open the quick-view sheet for the given product. */
  open: (product: Product) => void
  /** Currently-shown product, if any. */
  product: Product | null
}

const Ctx = createContext<QuickViewContextValue | null>(null)

/**
 * Provider wrapping the catalogue: any ProductCard in the tree can request
 * a quick view by calling `open(product)`. The provider mounts a single
 * `<QuickView>` and feeds it the right product — keeps the catalogue
 * responsive even with hundreds of cards.
 */
export function QuickViewProvider({
  locale,
  products,
  children,
}: {
  locale: Locale
  products: Product[]
  children: ReactNode
}) {
  const [slug, setSlug] = useState<string | null>(null)
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products])
  const product = slug ? (bySlug.get(slug) ?? null) : null
  const open = useCallback((p: Product) => setSlug(p.slug), [])
  return (
    <Ctx.Provider value={{ open, product }}>
      {children}
      <QuickView
        product={product}
        locale={locale}
        open={Boolean(product)}
        onOpenChange={(v) => {
          if (!v) setSlug(null)
        }}
      />
    </Ctx.Provider>
  )
}

export function useQuickView(): QuickViewContextValue {
  const value = useContext(Ctx)
  // Outside a QuickViewProvider the "open" action is a no-op so cards that
  // render outside the catalogue (home page, related-products, etc.) do not
  // crash. Quick-view is opt-in: only the shop page provides a real target.
  if (!value) return { open: () => {}, product: null }
  return value
}
