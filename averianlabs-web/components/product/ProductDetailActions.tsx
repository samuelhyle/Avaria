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
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

export function ProductDetailActions({
  product,
  locale,
  isAuthed = false,
  plans = [],
  initialSku,
}: {
  product: Product
  locale: string
  isAuthed?: boolean
  plans?: Array<{ id: string; title: string }>
  initialSku?: string
}) {
  const t = useTranslations("product")
  const r = useTranslations("research")
  const common = useTranslations("common")
  const compare = useCompare()
  const index = Math.max(
    0,
    product.vials.findIndex((v) => v.sku === initialSku),
  )
  const [qty, setQty] = useState(1)
  const add = useCart((s) => s.add)
  const vial = product.vials[index]
  if (!vial) return null
  const name = (product.translations?.[locale as Locale] ?? product.defaultTranslation).name
  const direct = vial.purchaseMode === "direct" && vial.priceCents > 0 && vial.stockQty > 0
  const changeVial = (next: number) => {
    const selected = product.vials[next]
    if (!selected || selected.sku === vial.sku) return
    const url = new URL(window.location.href)
    url.searchParams.set("sku", selected.sku)
    // Keep actions, imagery and exact batch evidence on the same server-selected SKU.
    // A full GET commits them together rather than optimistically changing only the actions.
    window.location.assign(`${url.pathname}${url.search}${url.hash}`)
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
      <div className="mt-5 space-y-5">
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
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {product.vials.map((variant, i) => (
              <button
                key={variant.sku}
                type="button"
                aria-pressed={index === i}
                onClick={() => changeVial(i)}
                className={cn(
                  "min-w-0 rounded-[var(--radius)] border p-3 text-left [overflow-wrap:anywhere] sm:min-w-28",
                  index === i ? "border-accent bg-accent-soft" : "border-line bg-surface",
                )}
              >
                <span className="block font-semibold">{formatSize(variant, locale)}</span>
                <span className="block font-mono text-sm text-ink-muted">{variant.sku}</span>
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
            <p className="text-sm text-ink-muted">
              {t("vatNote")} {r("shippingAtCheckout")}
            </p>
          </>
        ) : (
          <details key={vial.sku} className="rounded-lg border border-line">
            <summary className="min-h-11 cursor-pointer list-none rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-on-accent [&::-webkit-details-marker]:hidden">
              {r("quote")}
            </summary>
            <div className="p-4">
              <QuoteForm sku={vial.sku} locale={locale} />
            </div>
          </details>
        )}
        {["mg", "mcg", "g"].includes(vial.sizeUnit) && (
          <Link
            href={`/${locale}/peptide-calculator?sku=${encodeURIComponent(vial.sku)}`}
            className="inline-flex min-h-10 items-center text-sm text-accent underline"
          >
            {r("useCalculator")} · {vial.sku}
          </Link>
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
              href={`/${locale}/documents?sku=${encodeURIComponent(vial.sku)}&batch=${encodeURIComponent(vial.batch.code)}`}
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
