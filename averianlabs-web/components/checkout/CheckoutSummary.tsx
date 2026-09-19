"use client"

import { BulkDiscountBadge, BulkDiscountNudge } from "@/components/cart/BulkDiscount"
import { useCart } from "@/lib/cart/store"
import { FREE_SHIPPING_THRESHOLD_CENTS, VAT_LABEL, computeOrderTotals } from "@/lib/pricing"
import { computeBulkDiscount } from "@/lib/pricing/bulk-discount"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowRight, Lock, ShieldCheck, Sparkles, Truck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"

interface CheckoutSummaryProps {
  locale: string
  ctaLabel?: string
  ctaHref?: string
  showItems?: boolean
}

export function CheckoutSummary({
  locale: localeProp,
  ctaLabel,
  ctaHref,
  showItems = true,
}: CheckoutSummaryProps) {
  const t = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const tCommon = useTranslations("common")
  const localeFromHook = useLocale()
  const locale = localeProp ?? localeFromHook
  const items = useCart((s) => s.items)
  const subtotal = useCart((s) => s.subtotal())
  const FREE_SHIPPING_THRESHOLD = FREE_SHIPPING_THRESHOLD_CENTS
  // Tiered bulk discount — applied per SKU (5–10 → −10%, 11–20 → −15%, 21+
  // → −20%). The server re-runs `computeBulkDiscount` on the canonical cart
  // before persisting; this preview is for the buyer's eyes only.
  const bulk = computeBulkDiscount(
    items.map((i) => ({ sku: i.sku, qty: i.qty, unitPriceCents: i.unitPriceCents })),
  )
  const effectiveSubtotal = bulk.discountedSubtotalCents
  const shippingCents =
    effectiveSubtotal >= FREE_SHIPPING_THRESHOLD || effectiveSubtotal === 0 ? 0 : 990
  const { vatCents, totalCents } = computeOrderTotals(effectiveSubtotal, shippingCents)
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - effectiveSubtotal)
  const points = Math.floor(totalCents / 100) // 1 pt per €1

  return (
    <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">{tCommon("orderSummary")}</h2>

      {showItems ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-auto pr-1">
          {items.map((item) => {
            const line = bulk.lines.find((l) => l.sku === item.sku)
            const lineDiscountCents = line?.discountCents ?? 0
            return (
              <li key={item.sku} className="flex items-start gap-3 text-sm">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-3xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, hsl(214 70% 96%), hsl(214 70% 80%))",
                    color: "hsl(214 70% 30%)",
                  }}
                >
                  {item.mg}mg
                </span>
                <div className="flex-1">
                  <p className="font-medium leading-tight">{item.name}</p>
                  <p className="font-mono text-3xs text-ink-subtle">
                    {item.sku} · ×{item.qty}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {line ? <BulkDiscountBadge line={line} /> : null}
                    {line && line.percent === 0 ? <BulkDiscountNudge qty={item.qty} /> : null}
                  </div>
                </div>
                <div className="text-right">
                  {lineDiscountCents > 0 ? (
                    <span className="block text-3xs text-ink-subtle line-through">
                      {formatCurrency(item.unitPriceCents * item.qty, "EUR", locale)}
                    </span>
                  ) : null}
                  <span className="font-medium">
                    {formatCurrency(
                      item.unitPriceCents * item.qty - lineDiscountCents,
                      "EUR",
                      locale,
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {bulk.discountCents > 0 ? (
          <>
            <div className="flex justify-between text-ink-muted">
              <dt>{t("subtotalBeforeDiscount")}</dt>
              <dd className="line-through opacity-60">
                {formatCurrency(bulk.originalSubtotalCents, "EUR", locale)}
              </dd>
            </div>
            <div className="flex justify-between text-success">
              <dt className="flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3" />
                {tCheckout("bulkDiscountLabel")}
              </dt>
              <dd className="font-medium">−{formatCurrency(bulk.discountCents, "EUR", locale)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt className="text-ink">{t("subtotal")}</dt>
              <dd>{formatCurrency(effectiveSubtotal, "EUR", locale)}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <dt className="text-ink-muted">{t("subtotal")}</dt>
            <dd>{formatCurrency(effectiveSubtotal, "EUR", locale)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink-muted flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {t("shipping")}
          </dt>
          <dd>
            {shippingCents === 0 ? (
              <span className="text-success">{tCheckout("shippingFree")}</span>
            ) : (
              formatCurrency(shippingCents, "EUR", locale)
            )}
          </dd>
        </div>
        <div className="flex justify-between text-xs text-ink-subtle">
          <dt>
            {t("vat")} · {VAT_LABEL}
          </dt>
          <dd>{formatCurrency(vatCents, "EUR", locale)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 font-display text-base font-semibold">
          <dt>{t("total")}</dt>
          <dd>{formatCurrency(totalCents, "EUR", locale)}</dd>
        </div>
      </dl>

      {remainingForFree > 0 && items.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius)] border border-accent/20 bg-accent-soft p-3 text-xs text-accent-ink">
          <p className="font-medium">
            {t("freeShippingProgress", {
              amount: formatCurrency(remainingForFree, "EUR", locale),
            })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/20">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius)] border border-success/20 bg-success-soft p-3 text-xs text-success">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium">
            {t("rewardsEarn")} <span className="font-display">{points} pts</span> {t("rewardsFrom")}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-3xs text-ink-subtle">
        <Lock className="h-3 w-3 text-success" />
        <span>{tCheckout("secureHeading")} · 256-bit TLS</span>
      </div>

      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </aside>
  )
}
