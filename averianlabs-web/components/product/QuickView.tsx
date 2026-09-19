"use client"

import { VialGraphic } from "@/components/product/VialGraphic"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { isContactOnly, totalStock } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { useWishlist } from "@/lib/wishlist/store"
import { ExternalLink, FileCheck2, GitCompare, Heart, ShoppingBag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type CSSProperties, useEffect, useState } from "react"
import { toast } from "sonner"

interface QuickViewProps {
  product: Product | null
  locale: Locale | string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function QuickView({ product, locale, open, onOpenChange }: QuickViewProps) {
  const t = useTranslations("product")
  const tCommon = useTranslations("common")
  const [vialIdx, setVialIdx] = useState(0)
  const add = useCart((s) => s.add)
  const wishlistToggle = useWishlist((s) => s.toggle)
  const inWishlist = useWishlist((s) => (product ? s.items.includes(product.slug) : false))
  const compareToggle = useCompare((s) => s.toggle)
  const inCompare = useCompare((s) => (product ? s.items.includes(product.slug) : false))

  useEffect(() => {
    if (open) setVialIdx(0)
  }, [open])

  if (!product) return null

  const vial = product.vials[vialIdx]
  if (!vial) return null
  const isContact = isContactOnly(vial)
  const aggregateStock = totalStock(product)
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation

  const handleAdd = () => {
    add({
      productSlug: product.slug,
      sku: vial.sku,
      name: `${translation.name} ${vial.mg}mg`,
      mg: vial.mg,
      qty: 1,
      unitPriceCents: vial.priceCents,
    })
    toast.success(t("addedToCart"), { description: `${translation.name} ${vial.mg}mg` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-1/2 top-1/2 max-w-3xl -translate-x-1/2 -translate-y-1/2 border-line bg-surface p-0 shadow-2xl">
        <DialogTitle className="sr-only">Quick view: {translation.name}</DialogTitle>

        <div className="grid gap-0 sm:grid-cols-2">
          <div
            className="hue-radial relative flex aspect-square items-end justify-center overflow-hidden rounded-t-[var(--radius-xl)] p-8 sm:rounded-tr-none"
            style={{ "--cat-hue": product.hue } as CSSProperties}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-ink-muted shadow-sm backdrop-blur-md hover:text-ink"
              aria-label={tCommon("closeQuickView")}
            >
              <X className="h-4 w-4" />
            </button>
            <VialGraphic
              hue={product.hue}
              name={translation.name}
              sku={vial.sku}
              className="h-3/4 w-3/4"
            />
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div>
              <Badge tone="muted" className="mb-2 capitalize">
                {product.category}
              </Badge>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {translation.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted text-pretty">{translation.tagline}</p>
            </div>

            <div className="flex items-baseline gap-2">
              {isContact ? (
                <span className="font-display text-2xl font-semibold">{t("requestQuote")}</span>
              ) : (
                <>
                  <span className="font-display text-2xl font-semibold">
                    {formatCurrency(vial.priceCents, "EUR", locale)}
                  </span>
                  {product.vials.length > 1 ? (
                    <span className="text-xs text-ink-subtle">
                      {t("fromSizes", { count: product.vials.length })}
                    </span>
                  ) : null}
                </>
              )}
            </div>

            {product.vials.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {product.vials.map((v, i) => (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => setVialIdx(i)}
                    disabled={v.stockQty === 0}
                    className={cn(
                      "rounded-[var(--radius)] border px-2.5 py-1.5 text-xs transition-colors",
                      vialIdx === i
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-line bg-surface text-ink-muted hover:border-accent/40",
                      v.stockQty === 0 && "opacity-50",
                    )}
                  >
                    {v.mg} mg · {formatCurrency(v.priceCents, "EUR", locale)}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              {isContact ? (
                <Badge tone="muted">{t("stockQuoteOnly")}</Badge>
              ) : aggregateStock === 0 ? (
                <Badge tone="danger">{t("outOfStock")}</Badge>
              ) : aggregateStock < 25 ? (
                <Badge tone="warn">{t("lowStockLeft", { count: aggregateStock })}</Badge>
              ) : (
                <Badge tone="success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("inStock")}
                </Badge>
              )}
              {product.purityPercent ? (
                <Badge tone="accent">
                  {t("purityHplc", { purity: product.purityPercent.toFixed(1) })}
                </Badge>
              ) : null}
            </div>

            {product.latestBatch ? (
              <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-2xs text-ink-muted">
                    {t("batchLabel", { code: product.latestBatch.code })}
                  </span>
                  <Badge tone="success" className="text-3xs">
                    <FileCheck2 className="h-3 w-3" />
                    {t("coaAvailable")}
                  </Badge>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-ink-subtle">{t("batchDataHplc")}</dt>
                  <dd className="text-right font-mono">
                    {product.latestBatch.hplcPurity.toFixed(2)} %
                  </dd>
                  <dt className="text-ink-subtle">{t("batchDataEndotoxin")}</dt>
                  <dd className="text-right font-mono">
                    {product.latestBatch.endotoxinEUPerMg.toFixed(2)} {t("endotoxinUnit")}
                  </dd>
                  <dt className="text-ink-subtle">{t("batchDataManufactured")}</dt>
                  <dd className="text-right">
                    {formatDate(product.latestBatch.manufacturedAt, locale)}
                  </dd>
                  <dt className="text-ink-subtle">{t("batchDataExpires")}</dt>
                  <dd className="text-right">
                    {formatDate(product.latestBatch.expiresAt, locale)}
                  </dd>
                </dl>
                <Link
                  href={`/${locale}/coa/${product.latestBatch.code}`}
                  className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("batchDataOpenCoa")}
                </Link>
              </div>
            ) : null}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button size="lg" disabled={isContact || aggregateStock === 0} onClick={handleAdd}>
                <ShoppingBag className="h-4 w-4" />
                {t("addToCartWithPrice", { price: formatCurrency(vial.priceCents, "EUR", locale) })}
              </Button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    wishlistToggle(product.slug)
                    toast.success(inWishlist ? t("qvRemovedFromWishlist") : t("qvSavedToWishlist"))
                  }}
                  className={cn(
                    "inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[var(--radius)] border text-xs font-medium",
                    inWishlist
                      ? "border-danger/30 bg-danger-soft text-danger"
                      : "border-line bg-surface text-ink hover:bg-surface-2",
                  )}
                >
                  <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
                  {inWishlist ? t("wishlistSaved") : t("wishlistAdd")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    compareToggle(product.slug)
                    toast.success(inCompare ? t("qvRemovedFromCompare") : t("qvAddedToCompare"))
                  }}
                  className={cn(
                    "inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[var(--radius)] border text-xs font-medium",
                    inCompare
                      ? "border-accent/30 bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink hover:bg-surface-2",
                  )}
                >
                  <GitCompare className="h-4 w-4" />
                  {inCompare ? t("compareAdded") : t("compareAdd")}
                </button>
                <Link
                  href={`/${locale}/shop/${product.slug}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[var(--radius)] border border-line bg-surface text-xs font-medium text-ink hover:bg-surface-2"
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("qvFullDetails")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
