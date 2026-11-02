"use client"

import { ProductVisual } from "@/components/product/ProductVisual"
import { useQuickView } from "@/components/product/QuickViewProvider"
import { WishlistButton } from "@/components/product/WishlistButton"
import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { Eye, GitCompare, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function ProductCard({
  product,
  locale,
  className,
  variant = "grid",
  headingLevel = 3,
  showAvailability = true,
}: {
  product: Product
  locale: Locale
  className?: string
  variant?: "grid" | "list"
  headingLevel?: 2 | 3
  /**
   * Whether the card repeats the availability badge. Inside the "currently
   * unavailable" section the heading already says it, and repeating it on
   * every row turns the section into a wall of the same grey pill.
   */
  showAvailability?: boolean
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
  const quickView = useQuickView()

  const directVials = product.vials.filter((v) => v.purchaseMode === "direct" && v.stockQty > 0)
  const cheapest = [...directVials].sort((a, b) => a.priceCents - b.priceCents)[0] ?? vial
  const multiplePrices = directVials.length > 1
  const compared = compare.items.includes(product.slug)

  return (
    <article
      className={cn(
        // The card the shopper looks at most used a 20px corner while every
        // other card on the site used 12px, so the product grid did not sit
        // in the same family as the bands around it. The storefront has one
        // radius now.
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-crystal)] hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--shadow)]",
        variant === "list" && "sm:flex-row sm:items-stretch",
        className,
      )}
    >
      {/* ── Visual stage ───────────────────────────────────────────── */}
      <div
        style={{ ["--cat-hue" as string]: String(product.hue ?? 184) }}
        className={cn(
          "store-stage relative flex items-center justify-center overflow-hidden",
          variant === "grid" ? "aspect-[4/3] w-full" : "sm:w-56 sm:shrink-0",
        )}
      >
        <ProductVisual
          product={product}
          sku={vial.sku}
          size="md"
          className="relative z-[1] h-[78%] w-auto transition-transform duration-500 ease-[var(--ease-crystal)] group-hover:-translate-y-1 group-hover:scale-[1.04]"
        />

        {/* Wishlist */}
        <div className="absolute right-2.5 top-2.5 z-20">
          <WishlistButton slug={product.slug} size="md" className="shadow-sm" />
        </div>

        {/* Quick view (hover / focus) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            quickView.open(product)
          }}
          aria-label={`${t("quickView")}: ${translation.name}`}
          className="absolute bottom-2.5 left-2.5 z-20 inline-flex translate-y-2 items-center gap-1.5 rounded-full border border-line bg-surface/92 px-3 py-1.5 text-2xs font-semibold text-ink opacity-0 shadow-sm backdrop-blur-md transition-all hover:border-accent/40 hover:text-accent group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <Eye aria-hidden className="h-3.5 w-3.5" />
          {t("quickView")}
        </button>

        {/* Stock corner ribbon */}
        {canAdd && vial.stockQty <= 5 ? (
          <span className="absolute left-2.5 top-2.5 z-20 rounded-full bg-warn px-2 py-0.5 text-2xs font-semibold text-white shadow-sm">
            {t("lowStockBadge", { n: vial.stockQty })}
          </span>
        ) : null}
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          {/* A long category name in a narrow column must wrap rather than
              widen the card: "Laboratoriotarvikkeet" is wider than a 320px
              viewport allows. */}
          <span className="min-w-0 break-words hyphens-auto text-2xs font-semibold uppercase tracking-[0.08em] text-accent">
            {t(`categories.${product.category}`)}
          </span>
          {showAvailability || quotation ? (
            <Badge tone={canAdd ? "success" : "muted"} className="shrink-0">
              {canAdd ? t("inStockBadge") : quotation ? r("quote") : t("outOfStockBadge")}
            </Badge>
          ) : null}
        </div>

        <Heading className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight text-ink">
          <Link
            href={`/${locale}/shop/${product.slug}`}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {translation.name}
          </Link>
        </Heading>

        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
          {translation.tagline}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-subtle">
          <span className="font-mono">{vial.sku}</span>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span>{product.vials.map((v) => formatSize(v, locale)).join(" / ")}</span>
          {product.purityPercent ? (
            <>
              <span aria-hidden className="text-line-strong">
                ·
              </span>
              <span className="font-medium text-success">
                {t("purityBadge", { purity: product.purityPercent })}
              </span>
            </>
          ) : null}
          {vial.batch?.code ? (
            <>
              <span aria-hidden className="text-line-strong">
                ·
              </span>
              <span className="font-mono" title={vial.batch.code}>
                {vial.batch.code}
              </span>
            </>
          ) : null}
        </div>

        {/* ── Price + actions ───────────────────────────────────────── */}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3.5">
          <div className="min-w-0">
            {canAdd ? (
              <>
                <p className="text-2xs uppercase tracking-wider text-ink-subtle">
                  {multiplePrices ? t("fromLabel") : t("priceLabel")}
                </p>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular tracking-tight text-ink">
                    {formatCurrency(cheapest.priceCents, "EUR", locale)}
                  </span>
                  {cheapest.compareAtCents ? (
                    <span className="text-xs text-ink-subtle line-through tabular">
                      {formatCurrency(cheapest.compareAtCents, "EUR", locale)}
                    </span>
                  ) : null}
                </p>
                <p className="text-2xs text-ink-subtle">{t("vatIncludedShort")}</p>
              </>
            ) : (
              <>
                <p className="text-2xs uppercase tracking-wider text-ink-subtle">
                  {t("pricingLabel")}
                </p>
                <p className="text-lg font-bold tracking-tight text-ink">
                  {quotation ? t("pricingOnRequest") : t("outOfStockBadge")}
                </p>
              </>
            )}
          </div>

          <div className="relative z-20 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => compare.toggle(product.slug)}
              aria-label={`${t("compareLabel")}: ${compared ? t("removeFromCompare") : t("addToCompare")}`}
              aria-pressed={compared}
              disabled={!compared && compare.items.length >= compare.max}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40",
                compared && "border-accent bg-accent-soft text-accent",
              )}
            >
              <GitCompare className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("compareLabel")}</span>
            </button>
            {canAdd ? (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("addToCartShort")}
              </button>
            ) : null}
          </div>
        </div>

        {documents ? (
          <p className="mt-2 flex items-center gap-1 text-2xs text-ink-subtle">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            {t("coaIncluded")}
          </p>
        ) : null}
      </div>
    </article>
  )
}
