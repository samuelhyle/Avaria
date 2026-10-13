"use client"

import { useCart } from "@/lib/cart/store"
import { useCheckoutQuote } from "@/lib/checkout/use-quote"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function CheckoutSummary({
  locale,
  ctaLabel,
  ctaHref,
  showItems = true,
}: { locale: string; ctaLabel?: string; ctaHref?: string; showItems?: boolean }) {
  const t = useTranslations("research")
  const items = useCart((state) => state.items)
  const { quote, loading, error } = useCheckoutQuote(locale)
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
          {[
            [t("subtotal"), quote.subtotalCents],
            [t("shipping"), quote.shippingCents],
            [t("vatIncluded", { rate: locale === "fi" ? "25,5 %" : "25.5%" }), quote.vatCents],
            [t("total"), quote.totalCents],
          ].map(([label, cents]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd>{formatCurrency(Number(cents), "EUR", locale)}</dd>
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
                ? t("referenceNotice")
                : t("shippingAtCheckout")}
        </p>
      )}
      {ctaHref && quote ? (
        <Link
          href={ctaHref}
          className="mt-5 block rounded bg-accent p-3 text-center font-medium text-white"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </aside>
  )
}
