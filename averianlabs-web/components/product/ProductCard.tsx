"use client"
import { VialGraphic } from "@/components/product/VialGraphic"
import { WishlistButton } from "@/components/product/WishlistButton"
import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight, GitCompare, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
export function ProductCard({
  product,
  locale,
  className,
  variant = "grid",
  headingLevel = 3,
}: {
  product: Product
  locale: Locale
  className?: string
  variant?: "grid" | "list"
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  const t = useTranslations("shop")
  const r = useTranslations("research")
  const translation = product.translations?.[locale] ?? product.defaultTranslation
  const vial = defaultVial(product)
  const canAdd = vial.purchaseMode === "direct" && vial.stockQty > 0 && vial.priceCents > 0
  const quotation = vial.purchaseMode === "quotation"
  const documents = hasPublishedDocuments(product, locale, vial.sku)
  const compare = useCompare()
  const add = useCart((s) => s.add)
  return (
    <article
      className={cn(
        "group relative rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40",
        variant === "list" &&
          "sm:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2"
        >
          <VialGraphic hue={product.hue} showLabel={false} className="h-14 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <Heading className="text-base font-semibold tracking-tight">
            <Link
              href={`/${locale}/shop/${product.slug}`}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {translation.name}
            </Link>
          </Heading>
          <p className="mt-1 break-words font-mono text-xs text-ink-muted">{vial.sku}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {product.vials.map((v) => formatSize(v, locale)).join(" / ")}
          </p>
        </div>
        <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-accent sm:hidden" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 sm:mt-0 sm:border-0 sm:pt-0">
        <Badge tone={canAdd ? "success" : "muted"}>
          {canAdd ? t("inStockBadge") : quotation ? r("quote") : r("unavailable")}
        </Badge>
        <span className="text-sm text-ink-muted">
          {documents ? r("documentAvailable") : r("noPublicDocumentsShort")}
        </span>
        {canAdd && (
          <span className="font-mono text-sm font-medium">
            {formatCurrency(vial.priceCents, "EUR", locale)}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
        <WishlistButton slug={product.slug} size="sm" />
        <button
          type="button"
          onClick={() => compare.toggle(product.slug)}
          aria-label={`${t("compareLabel")}: ${compare.items.includes(product.slug) ? t("removeFromCompare") : t("addToCompare")}`}
          aria-pressed={compare.items.includes(product.slug)}
          disabled={!compare.items.includes(product.slug) && compare.items.length >= compare.max}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs text-ink-muted hover:text-ink disabled:opacity-50"
        >
          <GitCompare className="h-3.5 w-3.5" />
          {t("compareLabel")}
        </button>
        {canAdd && (
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-medium text-on-accent"
            onClick={() =>
              add({
                productSlug: product.slug,
                sku: vial.sku,
                name: translation.name,
                mg: vial.mg,
                sizeValue: vial.sizeValue,
                sizeUnit: vial.sizeUnit,
                unitPriceCents: vial.priceCents,
                purchaseMode: vial.purchaseMode,
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t("quickAdd")}
          </button>
        )}
      </div>
    </article>
  )
}
