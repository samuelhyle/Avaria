"use client"

import { Button } from "@/components/ui/Button"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { ShoppingBag } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

interface StickyMobileAtcProps {
  product: Product
  locale: string
  onAddToCart: () => void
  disabled: boolean
  priceCents: number
  vialLabel: string
}

export function StickyMobileAtc({
  product,
  locale,
  onAddToCart,
  disabled,
  priceCents,
  vialLabel,
}: StickyMobileAtcProps) {
  const t = useTranslations("product")
  const [show, setShow] = useState(false)
  // The compare bar is also pinned to the bottom of the viewport. When both
  // are on screen the compare bar sits on top, so the buy bar moves up.
  const compareCount = useCompare((s) => s.items.length)
  const name = product.translations?.[locale as Locale]?.name ?? product.defaultTranslation.name

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 600
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
      setShow(scrolled && !atBottom)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      // `inert` removes the hidden bar from the tab order and from the
      // accessibility tree, so a keyboard user never lands on an invisible
      // add-to-cart button.
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl transition-transform duration-300 ease-[var(--ease-crystal)] lg:hidden",
        compareCount > 0 && "bottom-[72px]",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm leading-tight">{name}</p>
          <p className="font-mono text-3xs text-ink-subtle">{vialLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-sm font-semibold">
            {formatCurrency(priceCents, "EUR", locale)}
          </p>
        </div>
        <Button size="md" disabled={disabled} onClick={onAddToCart}>
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {t("addToCart")}
        </Button>
      </div>
    </div>
  )
}
