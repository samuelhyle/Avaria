"use client"

import { PromoCodeInput } from "@/components/cart/PromoCodeInput"
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary"
import { SecureCheckout } from "@/components/checkout/SecureCheckout"
import { CatalogueProvider, useCatalogue } from "@/components/product/CatalogueProvider"
import { ProductVisual } from "@/components/product/ProductVisual"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCheckoutQuote } from "@/lib/checkout/use-quote"
import type { Locale } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight, Minus, PackageSearch, Plus, ShoppingBag, Trash2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

const FREE_SHIPPING_THRESHOLD_CENTS = 15000

interface CartViewProps {
  locale: string
  /** Optional preloaded products so the cart can suggest add-ons when the
   *  surrounding page doesn't already provide one through the provider. */
  initialProducts?: Array<import("@/lib/products/types").Product>
}

export function CartView({ locale, initialProducts }: CartViewProps) {
  const content = <Inner locale={locale as Locale} />
  if (initialProducts) {
    return <CatalogueProvider products={initialProducts}>{content}</CatalogueProvider>
  }
  return content
}

function Inner({ locale }: { locale: Locale }) {
  const items = useCart((s) => s.items)
  const allProducts = useCatalogue()
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  // One quote for the whole page. The summary and the promotion input read it
  // so the discount shown in the input and the total in the summary can never
  // disagree.
  const quoteState = useCheckoutQuote(locale)
  const cart = useTranslations("cart")
  const research = useTranslations("research")
  const common = useTranslations("common")
  const subtotal = items.reduce(
    (sum, item) => sum + (item.purchaseMode === "direct" ? item.unitPriceCents * item.qty : 0),
    0,
  )
  const freeShipProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100)
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS
  const remainingForFree = FREE_SHIPPING_THRESHOLD_CENTS - subtotal

  // Cart-aware recommendations: prefer products not already in the cart.
  //
  // The payment fixture is left out. It is a test of the checkout path, not
  // something to offer a shopper who is adding to a basket — and it was the
  // first thing the empty cart suggested.
  const inCart = new Set(items.map((i) => i.productSlug))
  const suggestions = allProducts
    .filter((p) => p.slug && !inCart.has(p.slug) && p.dataSource !== "reference" && !p.checkoutTest)
    .slice(0, 4)

  if (!items.length) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
              <ShoppingBag className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-display font-semibold tracking-tight">{cart("empty")}</h2>
            <p className="max-w-xs text-sm text-ink-muted">{cart("subtitle")}</p>
            <Button asChild size="lg" className="mt-2">
              <Link href={`/${locale}/shop`}>{cart("emptyCta")}</Link>
            </Button>
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {cart("recommendationsHeading")}
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.slice(0, 4).map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${locale}/shop/${p.slug}`}
                  className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3 transition-colors hover:border-accent/40"
                >
                  <div
                    aria-hidden
                    className="store-stage flex h-16 w-14 shrink-0 items-center justify-center rounded-[var(--radius)]"
                    style={{ "--cat-hue": p.hue } as React.CSSProperties}
                  >
                    <ProductVisual
                      product={p}
                      sku={p.vials[0]?.sku}
                      size="sm"
                      className="h-12 w-auto"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {(p.translations?.[locale] ?? p.defaultTranslation).name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">
                      {p.vials[0]?.sku}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-sm text-ink-muted">
                {research("browse")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="space-y-5">
        {/* Free shipping progress — a friendly nudge, not an ad. */}
        <div
          className={cn(
            "rounded-[var(--radius-lg)] border px-5 py-3 text-sm",
            isFreeShipping
              ? "border-success/30 bg-success-soft text-success"
              : "border-line bg-surface text-ink-muted",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <PackageSearch className="h-4 w-4" aria-hidden />
            {isFreeShipping
              ? cart("freeShippingUnlocked")
              : cart("freeShippingProgress", {
                  amount: formatCurrency(remainingForFree, "EUR", locale),
                })}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isFreeShipping ? "bg-success" : "bg-accent",
              )}
              style={{ width: `${freeShipProgress}%` }}
            />
          </div>
        </div>

        <PromoCodeInput locale={locale} quoteState={quoteState} />

        {/* Line items */}
        <ol className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          {items.map((item, idx) => {
            const product = allProducts.find((p) => p.slug === item.productSlug)
            const hue = product?.hue ?? 214
            return (
              <li
                key={item.sku}
                className={cn("flex gap-4 p-4 sm:p-5", idx > 0 && "border-t border-line")}
              >
                {product ? (
                  <Link
                    href={`/${locale}/shop/${product.slug}`}
                    className="store-stage flex h-28 w-24 shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
                    style={{ "--cat-hue": hue } as React.CSSProperties}
                  >
                    <ProductVisual
                      product={product}
                      sku={item.sku}
                      size="sm"
                      className="h-20 w-auto"
                    />
                  </Link>
                ) : (
                  <div
                    className="store-stage flex h-28 w-24 shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
                    style={{ "--cat-hue": hue } as React.CSSProperties}
                  >
                    <span className="font-mono text-2xs font-semibold text-ink-muted">
                      {formatSize(item, locale)}
                    </span>
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={product ? `/${locale}/shop/${product.slug}` : `/${locale}/shop`}
                        className="font-display text-base font-semibold tracking-tight hover:text-accent"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-ink-muted">{item.sku}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatCurrency(item.unitPriceCents, "EUR", locale)} ·{" "}
                        {formatSize(item, locale)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.sku)}
                      aria-label={`${cart("remove")} ${item.name}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-[var(--radius)] border border-line bg-surface">
                      <button
                        type="button"
                        onClick={() => setQty(item.sku, item.qty - 1)}
                        aria-label={common("decreaseQuantity")}
                        className="inline-flex h-9 w-9 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 border-x border-line py-2 text-center font-mono text-sm tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.sku, item.qty + 1)}
                        aria-label={common("increaseQuantity")}
                        className="inline-flex h-9 w-9 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-display text-base font-semibold tabular-nums">
                      {formatCurrency(item.unitPriceCents * item.qty, "EUR", locale)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent hover:underline underline-offset-4"
          >
            <ArrowRight aria-hidden className="h-3.5 w-3.5 rotate-180" />
            {research("browse")}
          </Link>
          <button
            type="button"
            onClick={() => useCart.getState().clear()}
            className="inline-flex min-h-10 items-center gap-1 text-sm text-ink-muted hover:text-danger"
          >
            <X className="h-3.5 w-3.5" />
            {cart("removeAll")}
          </button>
        </div>

        {/* Recommended add-ons */}
        {suggestions.length ? (
          <section className="mt-12 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
              {cart("recommendationsHeading")}
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestions.slice(0, 4).map((p) => {
                const vial =
                  p.vials.find((v) => v.purchaseMode === "direct" && v.priceCents > 0) ?? p.vials[0]
                if (!vial) return null
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/${locale}/shop/${p.slug}`}
                      className="group flex items-center gap-3 rounded-[var(--radius)] border border-line p-3 transition-colors hover:border-accent/40"
                    >
                      <div
                        aria-hidden
                        className="store-stage flex h-16 w-14 shrink-0 items-center justify-center rounded-[var(--radius)]"
                        style={{ "--cat-hue": p.hue } as React.CSSProperties}
                      >
                        <ProductVisual
                          product={p}
                          sku={vial.sku}
                          size="sm"
                          className="h-12 w-auto"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {(p.translations?.[locale] ?? p.defaultTranslation).name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-ink-muted">{vial.sku}</p>
                      </div>
                      <span className="font-mono text-xs font-medium tabular-nums text-ink">
                        {vial.priceCents > 0 ? formatCurrency(vial.priceCents, "EUR", locale) : ""}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <CheckoutSummary
          locale={locale}
          ctaLabel={cart("proceedToCheckout")}
          ctaHref={`/${locale}/checkout/email`}
          quoteState={quoteState}
        />
        <div className="mt-4">
          <SecureCheckout />
        </div>
      </aside>
    </div>
  )
}
