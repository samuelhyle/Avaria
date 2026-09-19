"use client"

import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, ShoppingBag, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type CSSProperties, useState } from "react"
import { toast } from "sonner"

interface FrequentlyBoughtProps {
  product: Product
  locale: Locale | string
}

/**
 * Pick 2 complementary products from the same category as cross-sell.
 * The cart flow uses the active product + the chosen bundle.
 */
export function FrequentlyBought({ product, locale }: FrequentlyBoughtProps) {
  const t = useTranslations("product")
  // Pick from same category, excluding current
  const sameCat = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 2)
  // Fall back to top picks if a category is too thin
  const picks =
    sameCat.length === 2
      ? sameCat
      : [
          ...sameCat,
          ...products
            .filter((p) => p.slug !== product.slug && !sameCat.find((s) => s.slug === p.slug))
            .slice(0, 2 - sameCat.length),
        ]

  const [selected, setSelected] = useState<Set<string>>(new Set(picks.map((p) => p.slug)))
  const toggle = (slug: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const mainVial = product.vials[0]
  if (!mainVial) return null
  const items = [
    {
      slug: product.slug,
      name: product.defaultTranslation.name,
      sku: mainVial.sku,
      priceCents: mainVial.priceCents,
      mg: mainVial.mg,
      isMain: true,
    },
    ...picks
      .map((p) => {
        const v = p.vials[0]
        if (!v) return null
        return {
          slug: p.slug,
          name: p.translations?.[locale as Locale]?.name ?? p.defaultTranslation.name,
          sku: v.sku,
          priceCents: v.priceCents,
          mg: v.mg,
          isMain: false,
        }
      })
      .filter((i): i is NonNullable<typeof i> => i !== null),
  ]

  const totalCents = items
    .filter((i) => i.isMain || selected.has(i.slug))
    .reduce((s, i) => s + i.priceCents, 0)
  const bundleItems = items.filter((i) => i.isMain || selected.has(i.slug))
  const discountedCents = (cents: number) => Math.round(cents * 0.95)
  const bundleTotalCents = bundleItems.reduce((s, i) => s + discountedCents(i.priceCents), 0)
  const savedVsAlone = totalCents - bundleTotalCents

  const add = useCart((s) => s.add)
  const addBundle = () => {
    for (const i of bundleItems) {
      add({
        productSlug: i.slug,
        sku: i.sku,
        name: `${i.name} ${i.mg}mg`,
        mg: i.mg,
        qty: 1,
        unitPriceCents: discountedCents(i.priceCents),
      })
    }
    toast.success(t("bundleAdded"), {
      description: t("bundleSaved", {
        count: bundleItems.length,
        amount: formatCurrency(savedVsAlone, "EUR", locale),
      }),
    })
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-accent/20 bg-accent-soft/40 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold">{t("completeStack")}</h2>
        <Badge tone="accent" className="ml-auto">
          {t("saveBundlePercent")}
        </Badge>
      </div>

      <ul className="space-y-3">
        {items.map((i) => (
          <li
            key={i.slug}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius)] border bg-surface p-3",
              i.isMain ? "border-accent" : "border-line",
            )}
          >
            <div
              className="hue-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
              style={{ "--cat-hue": getHue(picks, i.slug) } as CSSProperties}
            >
              <span className="font-mono text-3xs font-semibold text-ink-muted">{i.mg}mg</span>
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {i.name}
                {i.isMain ? <Badge tone="accent">{t("thisProduct")}</Badge> : null}
              </p>
              <p className="font-mono text-3xs text-ink-subtle">{i.sku}</p>
            </div>
            <p className="font-display text-sm font-semibold">
              {formatCurrency(i.priceCents, "EUR", locale)}
            </p>
            {i.isMain ? null : (
              <label className="flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={selected.has(i.slug)}
                  onChange={() => toggle(i.slug)}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  aria-label={t("fbIncludeItem", { name: i.name })}
                />
              </label>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-accent/20 pt-4">
        <div>
          <p className="text-3xs uppercase tracking-wider text-ink-subtle">{t("bundleTotal")}</p>
          <p className="font-display text-2xl font-semibold">
            {formatCurrency(bundleTotalCents, "EUR", locale)}
          </p>
          <p className="text-xs text-success">
            {t("saveOnBundle", { amount: formatCurrency(savedVsAlone, "EUR", locale) })}
          </p>
        </div>
        <button
          type="button"
          onClick={addBundle}
          className="inline-flex h-12 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <ShoppingBag className="h-4 w-4" />
          {t("addBundle")}
        </button>
      </div>
    </section>
  )
}

// Pulled from products (small helper, mirrors lib/products/data)
import { products } from "@/lib/products/data"
function getHue(_picks: Product[], slug: string): number {
  return products.find((p) => p.slug === slug)?.hue ?? 214
}
