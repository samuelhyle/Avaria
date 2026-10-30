"use client"

import { CartMiniSummary } from "@/components/cart/CartMiniSummary"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useOverlay } from "@/lib/hooks/use-overlay"
import { getProduct } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import type { CSSProperties } from "react"

export function CartDrawer({ locale }: { locale: string }) {
  const t = useTranslations("cart")
  const tCommon = useTranslations("common")
  const isOpen = useCart((s) => s.isOpen)
  const items = useCart((s) => s.items)
  const close = useCart((s) => s.close)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)

  const containerRef = useOverlay({ open: isOpen, onClose: close })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={tCommon("close")}
        onClick={close}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-in fade-in-0"
      />
      <aside
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("drawerTitle")}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl animate-in slide-in-from-right fade-in-0"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <ShoppingBag className="h-4 w-4" />
            </span>
            {t("drawerTitle")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={tCommon("close")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-sm text-ink-muted">{t("empty")}</p>
            <Button variant="outline" size="md" asChild>
              <Link href={`/${locale}/shop`}>{t("emptyCta")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-auto divide-y divide-line">
              {items.map((item) => {
                const product = getProduct(item.productSlug)
                const hue = product?.hue ?? 214
                return (
                  <li key={item.sku} className="flex gap-4 p-5">
                    <div
                      className="hue-tile flex h-16 w-14 shrink-0 items-end justify-center rounded-[var(--radius)]"
                      style={{ "--cat-hue": hue } as React.CSSProperties}
                    >
                      <span className="mb-1.5 font-mono text-3xs font-semibold text-ink-muted">
                        {formatSize(item, locale)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-ink line-clamp-1">{item.name}</p>
                          <p className="font-mono text-xs text-ink-subtle">{item.sku}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.sku)}
                          aria-label={t("remove")}
                          className="shrink-0 text-ink-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-[var(--radius)] border border-line bg-surface">
                          <button
                            type="button"
                            onClick={() => setQty(item.sku, item.qty - 1)}
                            aria-label={`${tCommon("decreaseQuantity")} — ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span className="w-7 text-center font-mono text-sm tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(item.sku, item.qty + 1)}
                            aria-label={`${tCommon("increaseQuantity")} — ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        <span className="font-display font-semibold tabular-nums">
                          {formatCurrency(item.unitPriceCents * item.qty, "EUR", locale)}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <CartMiniSummary locale={locale as Locale} showRecent={false} />
          </>
        )}
      </aside>
    </div>
  )
}
