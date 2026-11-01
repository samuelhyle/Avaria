"use client"

import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/pricing"
import type { Locale } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight, ShoppingBag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

interface MiniCartPopoverProps {
  /** Element to anchor against (the cart button in the header). */
  anchorRef: React.RefObject<HTMLElement>
  locale: Locale
}

/**
 * Hover/focus preview surface for the cart icon in the header.
 *
 * Mouse: appears on hover with a small delay; dismisses on mouseleave (with
 * a grace period so users can move into it).
 * Keyboard: appears on focus; closes on Escape or blur.
 * Touch: tap-to-toggle behaviour is intentionally not added — long-press
 * would be more honest, but the existing drawer click is the canonical path.
 *
 * Renders nothing when the cart is empty — the header already communicates
 * the empty state via the badge-less cart icon.
 */
export function MiniCartPopover({ anchorRef, locale }: MiniCartPopoverProps) {
  const t = useTranslations("cart")
  const items = useCart((s) => s.items)
  const subtotal = useCart((s) =>
    s.items.reduce(
      (sum, item) => sum + (item.purchaseMode === "direct" ? item.unitPriceCents * item.qty : 0),
      0,
    ),
  )
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<NodeJS.Timeout | null>(null)

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const onEnter = () => {
      if (items.length === 0) return
      cancelClose()
      setOpen(true)
    }
    const onLeave = () => scheduleClose()
    const onFocus = () => setOpen(true)
    const onBlur = () => setOpen(false)
    anchor.addEventListener("mouseenter", onEnter)
    anchor.addEventListener("mouseleave", onLeave)
    anchor.addEventListener("focus", onFocus)
    anchor.addEventListener("blur", onBlur)
    return () => {
      anchor.removeEventListener("mouseenter", onEnter)
      anchor.removeEventListener("mouseleave", onLeave)
      anchor.removeEventListener("focus", onFocus)
      anchor.removeEventListener("blur", onBlur)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [anchorRef, items.length, cancelClose, scheduleClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (items.length === 0 || !open) return null

  const recent = items.slice(-3).reverse()

  return (
    <div
      role="dialog"
      aria-label={t("previewLabel")}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      className={cn(
        "absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-lg)]",
        "animate-in slide-in-from-top-2 fade-in-0",
      )}
    >
      <header className="flex items-center justify-between border-b border-line bg-surface-2/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-sm font-semibold">
            {t("title")} · {items.length}
          </span>
        </div>
        <button
          type="button"
          aria-label={t("dismissPreview")}
          onClick={() => setOpen(false)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <ul className="divide-y divide-line">
        {recent.map((item) => (
          <li key={item.sku} className="flex items-start gap-3 px-4 py-3">
            <div
              aria-hidden
              className="hue-tile flex h-12 w-10 shrink-0 items-end justify-center rounded-[var(--radius-sm)]"
              style={{ "--cat-hue": 214 } as React.CSSProperties}
            >
              <span className="mb-1 font-mono text-3xs text-ink-muted">
                {formatSize(item, locale)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="mt-0.5 break-all font-mono text-2xs text-ink-muted">
                {item.sku} · × {item.qty}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums">
              {formatCurrency(item.unitPriceCents * item.qty, "EUR", locale)}
            </span>
          </li>
        ))}
      </ul>
      {items.length > 3 ? (
        <p className="px-4 py-2 text-2xs text-ink-subtle">
          {t("moreInCart", { count: items.length - 3 })}
        </p>
      ) : null}
      <div className="space-y-2 border-t border-line bg-surface-2/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted">{t("subtotal")}</span>
          <span className="font-display text-base font-semibold tabular-nums">
            {formatCurrency(subtotal, "EUR", locale)}
          </span>
        </div>
        <Link
          href={`/${locale}/checkout/cart`}
          onClick={() => setOpen(false)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-hover"
        >
          {t("reviewCart")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Badge tone="muted" className="justify-center">
          {t("freeOver", {
            amount: formatCurrency(FREE_SHIPPING_THRESHOLD_CENTS, "EUR", locale),
          })}
        </Badge>
      </div>
    </div>
  )
}
