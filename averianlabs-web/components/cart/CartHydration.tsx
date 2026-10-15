"use client"

import { useCatalogue } from "@/components/product/CatalogueProvider"
import { useCart } from "@/lib/cart/store"
import type { Locale } from "@/lib/products/types"
import { useLocale } from "next-intl"
import { useEffect } from "react"

export function CartHydration() {
  const products = useCatalogue()
  const locale = useLocale()
  useEffect(() => {
    let active = true
    Promise.resolve(useCart.persist?.rehydrate()).then(() => {
      if (!active) return
      const state = useCart.getState()
      const items = state.items.map((item) => {
        const product = products.find((p) => p.vials.some((v) => v.sku === item.sku))
        const vial = product?.vials.find((v) => v.sku === item.sku)
        if (!product || !vial) return { ...item, purchaseMode: "unavailable" as const }
        const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
        return {
          ...item,
          name: translation.name,
          productSlug: product.slug,
          mg: vial.mg,
          sizeValue: vial.sizeValue,
          sizeUnit: vial.sizeUnit,
          unitPriceCents: vial.priceCents,
          purchaseMode: vial.purchaseMode,
          qty: Number.isFinite(item.qty) ? Math.min(20, Math.max(1, Math.floor(item.qty))) : 1,
        }
      })
      if (JSON.stringify(items) !== JSON.stringify(state.items)) useCart.setState({ items })
    })
    return () => {
      active = false
    }
  }, [products, locale])
  return null
}
