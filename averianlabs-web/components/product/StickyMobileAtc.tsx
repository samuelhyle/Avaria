"use client"

import { Button } from "@/components/ui/Button"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { ShoppingBag } from "lucide-react"
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
  const [show, setShow] = useState(false)
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
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl transition-transform duration-300 ease-[var(--ease-crystal)] lg:hidden",
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
          <ShoppingBag className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
