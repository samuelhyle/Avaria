"use client"

import { VialGraphic } from "@/components/product/VialGraphic"
import { WishlistButton } from "@/components/product/WishlistButton"
import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { findCheapestVial } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatPercent, localeTag } from "@/lib/utils/format"
import {
  ArrowRight,
  Beaker,
  FileCheck2,
  FlaskConical,
  GitCompare,
  Plus,
  ShoppingBag,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import type { CSSProperties } from "react"

interface ProductCardProps {
  product: Product
  locale: Locale
  className?: string
  variant?: "grid" | "list"
}

export function ProductCard({ product, locale, className, variant = "grid" }: ProductCardProps) {
  const t = useTranslations("shop")
  const tCommon = useTranslations("common")
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const minVial = findCheapestVial(product)
  if (!minVial) return null
  const totalStock = product.vials.reduce((s, v) => s + v.stockQty, 0)
  const isContact = minVial.contactOnly === true || minVial.priceCents === 0
  const isOut = !isContact && totalStock === 0
  const isLow = !isContact && totalStock > 0 && totalStock < 25
  const canAdd = !isContact && !isOut

  const toggleCompare = useCompare((s) => s.toggle)
  const inCompare = useCompare((s) => s.has(product.slug))
  const addToCart = useCart((s) => s.add)
  const hueStyle = { "--cat-hue": product.hue } as CSSProperties

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canAdd) return
    addToCart({
      productSlug: product.slug,
      sku: minVial.sku,
      name: translation.name,
      mg: minVial.mg,
      unitPriceCents: minVial.priceCents,
    })
  }

  if (variant === "list") {
    return (
      <Link
        href={`/${locale}/shop/${product.slug}`}
        className={cn(
          "group flex items-stretch gap-4 p-4 transition-colors hover:bg-surface-2/60",
          className,
        )}
      >
        <div
          className="hue-tile relative flex h-24 w-20 shrink-0 items-end justify-center rounded-[var(--radius)]"
          style={hueStyle}
        >
          <VialGraphic hue={product.hue} showLabel={false} className="h-3/4 w-3/5" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-1">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                {translation.name}
              </h3>
              {product.latestBatch ? (
                <span className="font-mono text-3xs text-ink-subtle">
                  {t("batchLabel", { code: product.latestBatch.code })}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-1 text-xs text-ink-muted">{translation.tagline}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isContact ? (
                <span className="font-display text-sm font-semibold">
                  {t("carouselRequestQuote")}
                </span>
              ) : (
                <span className="font-display text-sm font-semibold">
                  {formatCurrency(minVial.priceCents, "EUR", locale)}
                  {product.vials.length > 1 ? (
                    <span className="ml-1 text-3xs font-normal text-ink-subtle">
                      {t("fromLabel")}
                    </span>
                  ) : null}
                </span>
              )}
              {isContact ? (
                <Badge tone="muted">{t("carouselPricingOnRequest")}</Badge>
              ) : isOut ? (
                <Badge tone="danger">{t("outOfStockBadge")}</Badge>
              ) : isLow ? (
                <Badge tone="warn">{t("lowStockBadge", { n: totalStock })}</Badge>
              ) : (
                <Badge tone="success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("inStockBadge")}
                </Badge>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
              {tCommon("view")} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div
      className={cn(
        "hue-radial group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-crystal)]",
        "hover:-translate-y-1 hover:border-ink-subtle/20 hover:shadow-xl focus-within:border-accent/40",
        className,
      )}
      style={hueStyle}
    >
      {/* Stretched card link — the card's single keyboard stop. */}
      <Link
        href={`/${locale}/shop/${product.slug}`}
        aria-label={translation.name}
        className="absolute inset-0 z-10 rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />

      <div className="relative aspect-[4/5] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-3/4 w-3/4 transition-transform duration-500 ease-[var(--ease-crystal)] group-hover:scale-110">
            <VialGraphic
              hue={product.hue}
              name={translation.name}
              sku={minVial.sku}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Top-right: wishlist + purity badge.
            Stock state (in/out/low) moved to a dedicated status row in the
            info panel below the image to avoid stacking with the purity
            badge over the vial artwork. */}
        <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1.5">
          <WishlistButton
            slug={product.slug}
            size="sm"
            className="bg-surface/85 shadow-sm backdrop-blur-md transition-colors hover:bg-surface"
          />
          {product.purityPercent ? (
            <Badge tone="accent" className="bg-surface/85 shadow-sm backdrop-blur-md">
              <Beaker className="h-3 w-3" />
              {t("purityHplcLabel", {
                purity: formatPercent(product.purityPercent, localeTag(locale as Locale)),
              })}
            </Badge>
          ) : null}
        </div>

        {/* Compare button - bottom right */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleCompare(product.slug)
          }}
          aria-label={inCompare ? t("removeFromCompare") : t("addToCompare")}
          aria-pressed={inCompare}
          className={cn(
            "absolute bottom-3 right-3 z-20 inline-flex h-7 items-center gap-1 rounded-full border bg-surface/85 px-2.5 text-3xs font-medium shadow-sm backdrop-blur-md transition-all",
            inCompare
              ? "border-accent/40 bg-accent-soft text-accent-ink"
              : "border-line text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink",
          )}
        >
          <GitCompare className="h-3 w-3" />
          {inCompare ? t("comparing") : t("compareLabel")}
        </button>

        {/* Quick add button - bottom left */}
        {canAdd ? (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="absolute bottom-3 left-3 z-20 inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-2xs font-semibold text-on-accent shadow-md transition-all duration-200 hover:bg-accent-hover active:scale-95 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
          >
            <Plus className="h-3 w-3" />
            {t("quickAdd")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
            {translation.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted text-pretty">
            {translation.tagline}
          </p>
        </div>

        {/* Stock state inline with title — replaces the floating badge. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isContact ? (
            <Badge tone="muted">{t("carouselPricingOnRequest")}</Badge>
          ) : isOut ? (
            <Badge tone="danger">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t("outOfStockBadge")}
            </Badge>
          ) : isLow ? (
            <Badge tone="warn">
              <FlaskConical className="h-3 w-3" />
              {t("lowStockBadge", { n: totalStock })}
            </Badge>
          ) : (
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t("inStockBadge")}
            </Badge>
          )}
          {product.latestBatch ? (
            <>
              <span className="font-mono text-2xs text-ink-subtle">
                {t("batchLabel", { code: product.latestBatch.code })}
              </span>
              <Badge tone="success" className="text-3xs">
                <FileCheck2 className="h-3 w-3" />
                {t("coaAvailable")}
              </Badge>
            </>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            {isContact ? (
              <>
                <div className="text-3xs uppercase tracking-wider text-ink-subtle">
                  {t("pricingLabel")}
                </div>
                <div className="font-display text-lg font-semibold text-ink">
                  {t("carouselRequestQuote")}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xs uppercase tracking-wider text-ink-subtle">
                  {product.vials.length > 1 ? t("fromLabel") : ""}
                </div>
                <div className="font-display text-lg font-semibold tabular-nums text-ink">
                  {formatCurrency(minVial.priceCents, "EUR", locale)}
                </div>
              </>
            )}
          </div>
          <ArrowRight
            className="h-4 w-4 -translate-x-1 text-ink-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </div>
      </div>

      <div className="border-t border-line/60 bg-surface-2/40 px-4 py-1.5 text-center text-3xs uppercase tracking-wider text-ink-subtle">
        {t("researchUseOnly")}
      </div>
    </div>
  )
}
