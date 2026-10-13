"use client"

import { useCatalogue } from "@/components/product/CatalogueProvider"
import { ProductCard } from "@/components/product/ProductCard"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { defaultVial } from "@/lib/products/selection"
import type { Locale } from "@/lib/products/types"
import { useWishlist } from "@/lib/wishlist/store"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function WishlistView({ locale }: { locale: string }) {
  const t = useTranslations("research")
  const products = useCatalogue()
  const selected = useWishlist((state) => state.items)
  const clear = useWishlist((state) => state.clear)
  const add = useCart((state) => state.add)
  const compare = useCompare((state) => state.toggle)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null
  const list = products.filter((product) => selected.includes(product.slug))
  if (!list.length)
    return (
      <div className="rounded border border-line p-8">
        <h2 className="text-xl font-semibold">{t("savedEmpty")}</h2>
        <p className="mt-3 text-ink-muted">{t("savedEmptyBody")}</p>
        <Link href={`/${locale}/shop`} className="mt-5 inline-block text-accent underline">
          {t("browse")}
        </Link>
      </div>
    )
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <button type="button" className="rounded border border-line p-3" onClick={clear}>
          {t("clearSaved")}
        </button>
        <button
          type="button"
          className="rounded border border-line p-3"
          onClick={() => {
            let count = 0
            for (const product of list) {
              const vial = defaultVial(product)
              if (vial.purchaseMode !== "direct" || vial.stockQty < 1) continue
              add({
                productSlug: product.slug,
                sku: vial.sku,
                name: (product.translations?.[locale as Locale] ?? product.defaultTranslation).name,
                mg: vial.mg,
                sizeValue: vial.sizeValue,
                sizeUnit: vial.sizeUnit,
                unitPriceCents: vial.priceCents,
                purchaseMode: vial.purchaseMode,
              })
              count++
            }
            toast.success(t("addedCount", { count }))
          }}
        >
          {t("addAvailable")}
        </button>
        <button
          type="button"
          className="rounded border border-line p-3"
          onClick={() => {
            for (const product of list)
              if (!useCompare.getState().items.includes(product.slug)) compare(product.slug)
            toast.success(t("compareUpdated"))
          }}
        >
          {t("compare")}
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((product) => (
          <ProductCard key={product.slug} product={product} locale={locale as Locale} />
        ))}
      </div>
    </div>
  )
}
