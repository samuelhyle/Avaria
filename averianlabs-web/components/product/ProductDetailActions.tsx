"use client"

import { QuoteForm } from "@/components/product/QuoteForm"
import { StickyDesktopAtc } from "@/components/product/StickyDesktopAtc"
import { StickyMobileAtc } from "@/components/product/StickyMobileAtc"
import { WishlistButton } from "@/components/product/WishlistButton"
import { SaveToPlanWrapper } from "@/components/research-plans/SaveToPlanWrapper"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatPercent, formatSize } from "@/lib/utils/format"
import { GitCompare } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

export function ProductDetailActions({
  product,
  locale,
  isAuthed = false,
  plans = [],
}: {
  product: Product
  locale: string
  isAuthed?: boolean
  plans?: Array<{ id: string; title: string }>
}) {
  const t = useTranslations("product")
  const r = useTranslations("research")
  const common = useTranslations("common")
  const compare = useCompare()
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      product.vials.findIndex((v) => v.purchaseMode === "direct" && v.stockQty > 0),
    ),
  )
  const [qty, setQty] = useState(1)
  const add = useCart((s) => s.add)
  const vial = product.vials[index]
  if (!vial) return null
  const name = (product.translations?.[locale as Locale] ?? product.defaultTranslation).name
  const direct = vial.purchaseMode === "direct" && vial.priceCents > 0 && vial.stockQty > 0
  const changeVial = (next: number) => {
    setIndex(next)
    setQty(1)
  }
  const handleAdd = () => {
    if (!direct) return
    add({
      productSlug: product.slug,
      sku: vial.sku,
      name,
      mg: vial.mg,
      sizeValue: vial.sizeValue,
      sizeUnit: vial.sizeUnit,
      qty,
      unitPriceCents: vial.priceCents,
      purchaseMode: vial.purchaseMode,
    })
    toast.success(r("added"), { description: `${name} · ${formatSize(vial, locale)} × ${qty}` })
  }
  return (
    <>
      <div className="mt-8 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <WishlistButton slug={product.slug} />
          <Button
            variant="outline"
            size="sm"
            aria-pressed={compare.items.includes(product.slug)}
            onClick={() => {
              compare.toggle(product.slug)
              toast.success(r("compareUpdated"))
            }}
            disabled={!compare.items.includes(product.slug) && compare.items.length >= compare.max}
          >
            <GitCompare className="h-4 w-4" />
            {r("compare")}
          </Button>
          {product.dataSource === "database" && (
            <SaveToPlanWrapper
              productSlug={product.slug}
              productName={name}
              locale={locale}
              isAuthed={isAuthed}
              plans={plans}
            />
          )}
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{t("selectVialSize")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.vials.map((variant, i) => (
              <button
                key={variant.sku}
                type="button"
                aria-pressed={index === i}
                onClick={() => changeVial(i)}
                className={cn(
                  "min-w-28 rounded-[var(--radius)] border p-3 text-left",
                  index === i ? "border-accent bg-accent-soft" : "border-line bg-surface",
                )}
              >
                <span className="block font-semibold">{formatSize(variant, locale)}</span>
                <span className="block font-mono text-xs text-ink-muted">{variant.sku}</span>
                <span className="block text-sm">
                  {variant.purchaseMode === "direct"
                    ? formatCurrency(variant.priceCents, "EUR", locale)
                    : variant.purchaseMode === "quotation"
                      ? r("quote")
                      : r("unavailable")}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        {direct ? (
          <>
            <div>
              <p className="text-sm font-medium">{t("quantity")}</p>
              <div className="mt-3 inline-flex items-center rounded-[var(--radius)] border border-line">
                <button
                  type="button"
                  aria-label={common("decreaseQuantity")}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="h-11 w-11"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={common("increaseQuantity")}
                  onClick={() => setQty(Math.min(20, vial.stockQty, qty + 1))}
                  className="h-11 w-11"
                >
                  +
                </button>
              </div>
            </div>
            <Button size="lg" fullWidth onClick={handleAdd}>
              {t("addToCart")} · {formatCurrency(vial.priceCents * qty, "EUR", locale)}
            </Button>
            <p className="text-xs text-ink-muted">
              {t("vatNote")} {r("shippingAtCheckout")}
            </p>
          </>
        ) : (
          <QuoteForm key={vial.sku} sku={vial.sku} locale={locale} />
        )}
        {vial.batch ? (
          <div className="rounded-[var(--radius)] border border-line p-4 text-sm">
            <p className="font-medium">
              {r("batch")}: <span className="font-mono">{vial.batch.code}</span>
            </p>
            {product.productType !== "supplies" && vial.batch.hplcPurity > 0 ? (
              <p>
                {r("purity")}: {formatPercent(vial.batch.hplcPurity, locale)}
              </p>
            ) : null}
            <a
              href={`/${locale}/coa?q=${encodeURIComponent(vial.batch.code)}`}
              className="mt-2 inline-block text-accent underline"
            >
              {r("viewDocuments")}
            </a>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{r("batchPending")}</p>
        )}
      </div>
      {direct ? (
        <>
          <StickyMobileAtc
            product={product}
            locale={locale}
            onAddToCart={handleAdd}
            disabled={!direct}
            priceCents={vial.priceCents * qty}
            vialLabel={`${formatSize(vial, locale)} · ${vial.sku}`}
          />
          <StickyDesktopAtc
            product={product}
            locale={locale}
            index={index}
            qty={qty}
            onVialChange={changeVial}
            onAdd={handleAdd}
          />
        </>
      ) : null}
    </>
  )
}
