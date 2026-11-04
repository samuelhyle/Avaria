"use client"

import { ProductAvailability } from "@/components/product/ProductAvailability"
import { QuoteForm } from "@/components/product/QuoteForm"
import { StickyDesktopAtc } from "@/components/product/StickyDesktopAtc"
import { StickyMobileAtc } from "@/components/product/StickyMobileAtc"
import { StockIndicator } from "@/components/product/StockIndicator"
import { WishlistButton } from "@/components/product/WishlistButton"
import { SaveToPlanWrapper } from "@/components/research-plans/SaveToPlanWrapper"
import { ResearchNotice } from "@/components/store/ResearchNotice"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatPercent, formatSize } from "@/lib/utils/format"
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  GitCompare,
  Info,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Store-style "buy box" for the product detail page.
 *
 * Composition:
 *   1. Pricing hero — current variant price, unit, stock, batch row
 *   2. Variant selector — chips with SKU, stock-by-variant indicator
 *   3. Quantity + Add-to-cart CTA, live total
 *   4. Wishlist · Compare · Save-to-plan secondary actions
 *   5. Trust strip — secure checkout, batch traceability, free-shipping threshold
 *   6. Calculator shortcut + assigned batch details
 *
 * Quotation-mode variants swap the buy box for an inline `QuoteForm`.
 */
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
  const pt = t
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
      <div className="mt-6 space-y-6">
        {product.checkoutTest ? (
          <p role="note" className="rounded border border-line p-4 text-sm">
            {pt("checkoutTestNotice")}
          </p>
        ) : null}
        {/* 1. Pricing hero */}
        <section
          aria-label={pt("priceAvailability")}
          className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            {direct ? (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                  {t("priceLabel")}
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tracking-tight tabular-nums text-ink">
                    {formatCurrency(vial.priceCents, "EUR", locale)}
                  </span>
                  {vial.compareAtCents ? (
                    <span className="text-sm text-ink-subtle line-through tabular-nums">
                      {formatCurrency(vial.compareAtCents, "EUR", locale)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1.5 text-xs text-ink-muted">{t("vatNote")}</p>
              </div>
            ) : (
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                  {t("pricingLabel")}
                </p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
                  {r("quote")}
                </p>
                <p className="mt-1.5 text-sm text-ink-muted">{r("quoteDescription")}</p>
              </div>
            )}
            <StockIndicator
              stockQty={vial.stockQty}
              purchaseMode={vial.purchaseMode}
              availability={vial.availability}
            />
          </div>
          {/*
            The lot, beside the price.

            The proof and the money belong in the same breath: this is the
            batch that ships, this is what it measured, and the certificate
            behind it opens in one click. It used to sit at the bottom of the
            buy box, below the trust strip, where a shopper deciding whether
            to buy had already stopped reading.
          */}
          {vial.batch ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-2xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <FlaskConical aria-hidden className="h-3.5 w-3.5 text-accent" />
                {r("lot")}
                <span className="font-mono font-medium" data-testid="lot-code">
                  {vial.batch.code}
                </span>
              </span>
              {product.productType !== "supplies" && vial.batch.hplcPurity > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-success" />
                  {formatPercent(vial.batch.hplcPurity, locale)}
                </span>
              ) : null}
              <a
                href={`/${locale}/documents?sku=${encodeURIComponent(vial.sku)}&batch=${encodeURIComponent(vial.batch.code)}`}
                className="inline-flex items-center gap-1 font-medium text-accent underline underline-offset-4"
              >
                {r("viewDocuments")}
                <ArrowRight aria-hidden className="h-3 w-3" />
              </a>
            </div>
          ) : null}
        </section>

        {/* 2. Variant selector */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("selectVialSize")}
          </legend>
          <p className="mt-1 text-xs text-ink-muted">{t("sizeHelper")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {product.vials.map((variant, i) => {
              const variantAvailable =
                variant.purchaseMode === "direct" && variant.priceCents > 0 && variant.stockQty > 0
              return (
                <button
                  key={variant.sku}
                  type="button"
                  aria-pressed={index === i}
                  onClick={() => changeVial(i)}
                  className={cn(
                    "group relative min-w-0 rounded-[var(--radius-lg)] border p-3 text-left [overflow-wrap:anywhere] transition-colors sm:min-w-32",
                    index === i
                      ? "border-accent bg-accent-soft shadow-sm"
                      : "border-line bg-surface hover:border-accent/40",
                  )}
                >
                  <span className="block text-sm font-semibold tracking-tight">
                    {formatSize(variant, locale)}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block break-all font-mono text-2xs",
                      index === i ? "text-accent-ink" : "text-ink-muted",
                    )}
                  >
                    {variant.sku}
                  </span>
                  <span className="mt-1.5 block text-sm font-semibold tabular-nums">
                    {variantAvailable
                      ? formatCurrency(variant.priceCents, "EUR", locale)
                      : variant.purchaseMode === "quotation"
                        ? r("quote")
                        : r("unavailable")}
                  </span>
                  <span className="mt-0.5 block text-2xs text-ink-subtle">
                    {variantAvailable ? t("perVial") : ""}
                  </span>
                  {index === i && (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* 3. Quantity + ATC */}
        {direct ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
              {t("quantity")}
            </p>
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="inline-flex items-center rounded-[var(--radius-lg)] border border-line bg-surface">
                <button
                  type="button"
                  aria-label={common("decreaseQuantity")}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="inline-flex h-12 w-12 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span
                  className="w-12 border-x border-line text-center font-mono text-base tabular-nums"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={common("increaseQuantity")}
                  onClick={() =>
                    setQty(Math.min(product.checkoutTest ? 1 : 20, vial.stockQty, qty + 1))
                  }
                  className="inline-flex h-12 w-12 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <Button size="lg" onClick={handleAdd} className="flex-1">
                {t("addToCart")}
                <span className="ml-2 font-mono font-semibold tabular-nums opacity-90">
                  {formatCurrency(vial.priceCents * qty, "EUR", locale)}
                </span>
              </Button>
            </div>
          </div>
        ) : vial.availability ? (
          <ProductAvailability
            availability={vial.availability}
            sku={vial.sku}
            productName={name}
            sizeLabel={formatSize(vial, locale)}
            locale={locale}
          />
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
            <QuoteForm sku={vial.sku} locale={locale} />
          </div>
        )}

        {/* 3b. Research-use fine print */}
        <ResearchNotice />

        {/*
          When it leaves. A buyer deciding on a research peptide is usually
          deciding on a schedule, so the dispatch cut-off belongs next to the
          button rather than in the shipping page.
        */}
        {direct ? (
          <p className="flex items-start gap-2 text-2xs text-ink-subtle">
            <Truck aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{t("dispatchNote")}</span>
          </p>
        ) : null}

        {/* 4. Wishlist · Compare · Save-to-plan */}
        <div className="flex flex-wrap items-center gap-2">
          <WishlistButton slug={product.slug}>
            <span className="ml-1.5">{r("wishlist")}</span>
          </WishlistButton>
          <Button
            variant="outline"
            size="md"
            aria-pressed={compare.items.includes(product.slug)}
            onClick={() => {
              compare.toggle(product.slug)
              toast.success(r("compareUpdated"))
            }}
            disabled={!compare.items.includes(product.slug) && compare.items.length >= compare.max}
          >
            <GitCompare className="h-4 w-4" />
            <span className="ml-1.5">{r("compare")}</span>
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

        {/* 5. Trust strip */}
        {!product.checkoutTest && (
          <ul className="grid gap-2 rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-2 sm:grid-cols-3">
            <li className="flex items-start gap-2 rounded-[var(--radius)] bg-surface px-3 py-2 text-xs">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{r("trustSecure")}</p>
                <p className="text-ink-muted">{r("trustSecureBody")}</p>
              </div>
            </li>
            <li className="flex items-start gap-2 rounded-[var(--radius)] bg-surface px-3 py-2 text-xs">
              <PackageCheck className="mt-0.5 h-3.5 w-3.5 text-success" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{r("trustTraceable")}</p>
                <p className="text-ink-muted">{r("trustTraceableBody")}</p>
              </div>
            </li>
            <li className="flex items-start gap-2 rounded-[var(--radius)] bg-surface px-3 py-2 text-xs">
              <Truck className="mt-0.5 h-3.5 w-3.5 text-accent" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{r("trustFreeShipping")}</p>
                <p className="text-ink-muted">{r("trustFreeShippingBody")}</p>
              </div>
            </li>
          </ul>
        )}

        {/* 6. Calculator shortcut + batch card */}
        {["mg", "mcg", "g"].includes(vial.sizeUnit) && (
          <Link
            href={`/${locale}/peptide-calculator?sku=${encodeURIComponent(vial.sku)}`}
            className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm text-accent transition-colors hover:border-accent/40"
          >
            <Info className="h-4 w-4" />
            <span>
              <span className="font-semibold">{r("useCalculator")}</span>
              <span className="ml-1 font-mono text-ink-muted">{vial.sku}</span>
            </span>
          </Link>
        )}
        {!vial.batch && !product.checkoutTest ? (
          <p className="text-sm text-ink-muted">{t("batchPending")}</p>
        ) : null}
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
