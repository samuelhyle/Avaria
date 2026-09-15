"use client"

import { ProductCard } from "@/components/product/ProductCard"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { useWishlist } from "@/lib/wishlist/store"
import { GitCompare, Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function WishlistView({ locale }: { locale: Locale | string }) {
  const [hydrated, setHydrated] = useState(false)
  const items = useWishlist((s) => s.items)
  const clear = useWishlist((s) => s.clear)
  const add = useCart((s) => s.add)
  const compareToggle = useCompare((s) => s.toggle)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) return null

  const list = products.filter((p) => items.includes(p.slug))

  if (list.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-ink-subtle" />
        <h2 className="mt-4 font-display text-lg">No saved peptides yet.</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Tap the heart on any product to save it for later.
        </p>
        <Button asChild>
          <Link href={`/${locale}/shop`} className="mt-6 inline-block">
            Browse catalog
          </Link>
        </Button>
      </div>
    )
  }

  const addAllToCart = () => {
    let added = 0
    list.forEach((p) => {
      const min = p.vials.reduce((m, v) => (v.priceCents < m.priceCents ? v : m), p.vials[0]!)
      if (!min.contactOnly && min.priceCents > 0) {
        add({
          productSlug: p.slug,
          sku: min.sku,
          name: `${p.defaultTranslation.name} ${min.mg}mg`,
          mg: min.mg,
          qty: 1,
          unitPriceCents: min.priceCents,
        })
        added++
      }
    })
    toast.success(`Added ${added} products to cart`)
  }

  const addAllToCompare = () => {
    list.forEach((p) => compareToggle(p.slug))
    toast.success("Updated compare list")
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{list.length}</span> saved peptide
          {list.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addAllToCompare}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-3 text-xs font-medium hover:bg-surface-2"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Add all to compare
          </button>
          <button
            type="button"
            onClick={addAllToCart}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add all to cart
          </button>
          <button onClick={clear} className="text-xs text-ink-muted hover:text-danger">
            Clear all
          </button>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} locale={locale as Locale} />
        ))}
      </div>
    </div>
  )
}
