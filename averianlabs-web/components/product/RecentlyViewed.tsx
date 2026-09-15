"use client"

import { ProductCard } from "@/components/product/ProductCard"
import type { Locale, Product } from "@/lib/products/types"
import { getRecentlyViewedSlugs, trackRecentlyViewed } from "@/lib/storage/recently-viewed"
import { Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

interface RecentlyViewedProps {
  products: Product[]
  locale: Locale | string
  /** Pass the slug of the product currently being viewed so it gets recorded (PDP usage). */
  currentSlug?: string
  /** Override the section heading. Strip usage. */
  heading?: string
  /** Show the right-aligned helper subtitle. Strip usage. */
  showHelper?: boolean
  /** Top spacing variant: "page" (mt-24 pt-16) or "section" (mt-16 pt-12). */
  spacing?: "page" | "section"
}

export function RecentlyViewed({
  products,
  locale,
  currentSlug,
  heading,
  showHelper = false,
  spacing = "page",
}: RecentlyViewedProps) {
  const t = useTranslations("shop")
  const [slugs, setSlugs] = useState<string[]>([])

  useEffect(() => {
    if (currentSlug) trackRecentlyViewed(currentSlug)
    setSlugs(getRecentlyViewedSlugs())
  }, [currentSlug])

  const items = products.filter((p) => slugs.slice(0, 4).includes(p.slug)).slice(0, 4)

  if (items.length === 0) return null

  const resolvedHeading = heading ?? t("recentlyViewed")
  const spacingClasses = spacing === "section" ? "mt-16 border-t pt-12" : "mt-24 border-t pt-16"

  return (
    <section className={spacingClasses + " border-line"}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-ink-muted" />
          <h2 className="font-display text-xl font-semibold">{resolvedHeading}</h2>
        </div>
        {showHelper ? (
          <p className="hidden text-xs text-ink-subtle sm:inline">{t("recentlyViewedHelper")}</p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} locale={locale as Locale} />
        ))}
      </div>
    </section>
  )
}
