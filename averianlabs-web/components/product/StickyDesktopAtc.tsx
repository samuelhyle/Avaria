"use client"

import { Button } from "@/components/ui/Button"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

type StickyDesktopAtcProps = {
  product: Product
  locale: string
  index?: number
  qty?: number
  onVialChange?: (index: number) => void
  onAdd?: () => void
}

/**
 * Sticky add-to-cart bar that pins to the bottom of the viewport on
 * desktop once the user has scrolled past the product hero. The parent
 * can hoist `index` / `qty` / `onVialChange` / `onAdd` to keep the
 * sticky bar in sync with the in-page selector; when the parent doesn't
 * (e.g. server components) we manage small defaults locally so the bar
 * still does something useful on its own.
 */
export function StickyDesktopAtc({
  product,
  locale,
  index,
  qty,
  onVialChange,
  onAdd,
}: StickyDesktopAtcProps) {
  const t = useTranslations("product")
  const [internalIndex, setInternalIndex] = useState(0)
  const [internalQty, setInternalQty] = useState(1)
  const [show, setShow] = useState(false)
  // The compare bar is also pinned to the bottom of the viewport. When both
  // are on screen the compare bar sits on top, so the buy bar moves up.
  const compareCount = useCompare((s) => s.items.length)

  useEffect(() => {
    const onScroll = () =>
      setShow(
        window.scrollY > 480 &&
          window.innerHeight + window.scrollY < document.body.offsetHeight - 200,
      )
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const activeIndex = index ?? internalIndex
  const activeQty = qty ?? internalQty
  const handleVialChange = onVialChange ?? setInternalIndex
  const handleAdd = onAdd ?? (() => undefined)

  const vial = product.vials[activeIndex]
  if (!vial || !show) return null

  const name = (product.translations?.[locale as Locale] ?? product.defaultTranslation).name

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-surface/95 backdrop-blur-xl lg:block",
        compareCount > 0 && "bottom-[72px]",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <div className="flex-1">
          <p className="font-semibold">{name}</p>
          <p className="font-mono text-xs text-ink-muted">
            {vial.sku} · {formatSize(vial, locale)} × {activeQty}
          </p>
        </div>
        <select
          value={activeIndex}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (index === undefined) setInternalIndex(next)
            handleVialChange(next)
          }}
          aria-label={t("selectVialSize")}
          className="h-11 rounded border border-line bg-surface px-3"
        >
          {product.vials.map((v, i) => (
            <option key={v.sku} value={i}>
              {formatSize(v, locale)}
            </option>
          ))}
        </select>
        <p className="font-semibold">
          {formatCurrency(vial.priceCents * activeQty, "EUR", locale)}
        </p>
        <Button
          onClick={() => {
            if (onAdd) handleAdd()
            else setInternalQty((q) => q + 1)
          }}
          disabled={vial.purchaseMode !== "direct" || vial.stockQty < activeQty}
        >
          {t("addToCart")}
        </Button>
      </div>
    </div>
  )
}
