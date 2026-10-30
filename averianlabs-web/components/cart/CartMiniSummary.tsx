"use client"

import { useCatalogue } from "@/components/product/CatalogueProvider"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import type { Locale } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight, Truck } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

const FREE_SHIPPING_THRESHOLD_CENTS = 15000

/**
 * Compact cart summary used inside Cart Drawer header (or popover) — shows
 * subtotal + free-shipping progress + a "review cart" link. Does NOT duplicate
 * the line-items list to keep the drawer moving fast.
 */
export function CartMiniSummary({
  locale,
  showRecent = true,
}: {
  locale: Locale
  /**
   * Whether to list the most recent items. In the header popover there is no
   * other list, so it is the content. In the drawer the full line-item list is
   * already above it, and repeating the same items reads as a mistake.
   */
  showRecent?: boolean
}) {
  const items = useCart((s) => s.items)
  const products = useCatalogue()
  const t = useTranslations("cart")
  const subtotal = items.reduce(
    (sum, item) => sum + (item.purchaseMode === "direct" ? item.unitPriceCents * item.qty : 0),
    0,
  )
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100)
  const free = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - subtotal

  // Last 3 added items (read from cart store in insertion order)
  const recent = items.slice(-3).reverse()

  return (
    <div className="space-y-4 border-b border-line p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          {/* The number is the products subtotal, not the total: shipping and
              VAT are added at checkout. Without the label the two read the
              same and the customer is surprised at the end. */}
          <p className="text-2xs uppercase tracking-wider text-ink-subtle">{t("subtotal")}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {formatCurrency(subtotal, "EUR", locale)}
          </p>
        </div>
        <Link
          href={`/${locale}/checkout/cart`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline underline-offset-4"
        >
          {t("checkout")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs",
          free ? "bg-success-soft text-success" : "bg-surface-2 text-ink-muted",
        )}
      >
        <Truck className="h-3.5 w-3.5" aria-hidden />
        {free
          ? t("freeShippingUnlocked")
          : t("freeShippingProgress", { amount: formatCurrency(remaining, "EUR", locale) })}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full transition-all", free ? "bg-success" : "bg-accent")}
          style={{ width: `${progress}%` }}
        />
      </div>

      {showRecent && recent.length > 0 ? (
        <ul className="space-y-2">
          {recent.map((item) => {
            const product = products.find((p) => p.slug === item.productSlug)
            const hue = product?.hue ?? 214
            return (
              <li key={item.sku} className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="hue-tile flex h-10 w-8 shrink-0 items-end justify-center rounded-[var(--radius-sm)]"
                  style={{ "--cat-hue": hue } as React.CSSProperties}
                >
                  <span className="mb-0.5 font-mono text-3xs text-ink-muted">
                    {formatSize(item, locale)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="font-mono text-2xs text-ink-muted">
                    {item.sku} · × {item.qty}
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatCurrency(item.unitPriceCents * item.qty, "EUR", locale)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      <Button asChild fullWidth size="lg">
        <Link href={`/${locale}/checkout/cart`}>
          {t("checkout")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}
