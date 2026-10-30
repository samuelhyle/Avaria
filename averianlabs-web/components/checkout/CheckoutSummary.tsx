"use client"

import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import type { CheckoutQuoteState } from "@/lib/checkout/use-quote"
import { vatLabel } from "@/lib/pricing"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function CheckoutSummary({
  locale,
  ctaLabel,
  ctaHref,
  showItems = true,
  quoteState,
}: {
  locale: string
  ctaLabel?: string
  ctaHref?: string
  showItems?: boolean
  /**
   * The quote, owned by the caller. The summary reads it rather than fetching
   * its own copy: two independent requests would price the same cart twice
   * and could disagree for a moment.
   */
  quoteState: CheckoutQuoteState
}) {
  const t = useTranslations("research")
  const c = useTranslations("cart")
  const items = useCart((state) => state.items)
  const { quote, loading, error, selectedRate } = quoteState
  return (
    <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-6">
      <h2 className="font-display text-xl font-semibold">{t("summary")}</h2>
      {showItems ? (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.sku} className="flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p>{quote?.lines.find((line) => line.sku === item.sku)?.name ?? item.name}</p>
                <p className="text-xs text-ink-muted">
                  {item.sku} · {formatSize(item, locale)} × {item.qty}
                </p>
              </div>
              <span>
                {formatCurrency(
                  (quote?.lines.find((line) => line.sku === item.sku)?.unitPriceCents ??
                    item.unitPriceCents) * item.qty,
                  "EUR",
                  locale,
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {quote ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          {(
            [
              { label: t("subtotal"), cents: quote.subtotalCents },
              ...(quote.discountCents > 0
                ? [
                    {
                      label: t("discount"),
                      cents: -quote.discountCents,
                      hint: quote.promotion?.code,
                    },
                  ]
                : []),
              {
                label: t("shipping"),
                cents: quote.shippingCents,
                hint: selectedRate
                  ? `${selectedRate.carrier} · ${selectedRate.service}`
                  : undefined,
              },
              {
                label: t("vatIncluded", { rate: vatLabel(locale) }),
                cents: quote.vatCents,
              },
              { label: t("total"), cents: quote.totalCents },
            ] as Array<{ label: string; cents: number; hint?: string }>
          ).map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt>
                {row.label}
                {row.hint ? (
                  <span className="block text-2xs text-ink-subtle">{row.hint}</span>
                ) : null}
              </dt>
              <dd className={cn("tabular-nums", row.cents < 0 && "text-success")}>
                {formatCurrency(row.cents, "EUR", locale)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-5 text-sm text-ink-muted" role="status">
          {!items.length
            ? t("emptyCart")
            : loading
              ? t("loadingShipping")
              : error
                ? t("shippingUnavailable")
                : t("shippingAtCheckout")}
        </p>
      )}
      {ctaHref ? (
        <Button asChild fullWidth size="lg" className="mt-5">
          <Link href={ctaHref} data-testid="checkout-cta">
            {ctaLabel ?? c("checkout")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </aside>
  )
}
