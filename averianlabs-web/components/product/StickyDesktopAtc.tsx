"use client"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { isContactOnly } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { useWishlist } from "@/lib/wishlist/store"
import { Heart, ShoppingBag, Truck } from "lucide-react"
import { useTranslations } from "next-intl"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface StickyDesktopAtcProps {
  product: Product
  locale: string
}

export function StickyDesktopAtc({ product, locale }: StickyDesktopAtcProps) {
  const t = useTranslations("product")
  const tCommon = useTranslations("common")
  const add = useCart((s) => s.add)
  const wishlistToggle = useWishlist((s) => s.toggle)
  const inWishlist = useWishlist((s) => s.items.includes(product.slug))
  const inCompare = useCompare((s) => s.items.includes(product.slug))
  const compareToggle = useCompare((s) => s.toggle)

  const [vialIdx, setVialIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [show, setShow] = useState(false)

  const vial = product.vials[vialIdx]
  if (!vial) return null
  const isContact = isContactOnly(vial)
  const disabled = !isContact && vial.stockQty === 0

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 480
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
      setShow(scrolled && !atBottom)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleAdd = () => {
    const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
    add({
      productSlug: product.slug,
      sku: vial.sku,
      name: `${translation.name} ${vial.mg}mg`,
      mg: vial.mg,
      qty,
      unitPriceCents: vial.priceCents,
    })
    toast.success(t("addedToCart"), {
      description: t("addedToCartDesc", { name: translation.name, mg: vial.mg, qty }),
    })
  }

  const handleSubscribe = () => {
    toast.success(t("stickySubscriptionSaved"), {
      description: t("stickySubscriptionDesc", { mg: vial.mg, weeks: 8 }),
    })
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-surface/95 backdrop-blur-xl transition-transform duration-300 ease-[var(--ease-crystal)] lg:block",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className="hue-tile flex h-12 w-12 items-end justify-center rounded-[var(--radius)]"
            style={{ "--cat-hue": product.hue } as CSSProperties}
          >
            <span className="mb-1.5 font-mono text-3xs font-semibold text-ink-muted">
              {vial.mg}mg
            </span>
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">
              {(product.translations?.[locale as Locale] ?? product.defaultTranslation).name}
            </p>
            <p className="font-mono text-3xs text-ink-subtle">{vial.sku}</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          {product.vials.length > 1 ? (
            <select
              value={vialIdx}
              onChange={(e) => setVialIdx(Number(e.target.value))}
              aria-label={tCommon("vialSize")}
              className="h-9 rounded-[var(--radius)] border border-line bg-surface px-2 text-xs focus:border-accent focus:outline-none"
            >
              {product.vials.map((v, i) => (
                <option key={v.sku} value={i}>
                  {v.mg} mg · {formatCurrency(v.priceCents, "EUR", locale)}
                </option>
              ))}
            </select>
          ) : null}

          <div className="inline-flex items-center rounded-[var(--radius)] border border-line bg-surface">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="inline-flex h-9 w-8 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={tCommon("decreaseQuantity")}
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(vial.stockQty, q + 1))}
              className="inline-flex h-9 w-8 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={tCommon("increaseQuantity")}
            >
              +
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              wishlistToggle(product.slug)
              toast.success(
                inWishlist ? t("stickyRemovedFromWishlist") : t("stickySavedToWishlist"),
              )
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label={inWishlist ? tCommon("removeFromWishlist") : tCommon("addToWishlist")}
          >
            <Heart className={cn("h-4 w-4", inWishlist && "fill-danger text-danger")} />
          </button>
          <button
            type="button"
            onClick={() => {
              compareToggle(product.slug)
              toast.success(inCompare ? t("stickyRemovedFromCompare") : t("stickyAddedToCompare"))
            }}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius)] border border-line bg-surface px-3 text-xs font-medium hover:bg-surface-2"
          >
            {t("stickyCompare")}
          </button>
          <button
            type="button"
            onClick={handleSubscribe}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-3 text-xs font-medium text-accent-ink hover:bg-accent-soft/80"
            title={t("stickySubscribeTooltip")}
          >
            <Badge tone="accent" className="px-1 py-0 text-3xs">
              −10%
            </Badge>
            {t("stickySubscribe")}
          </button>
          <Button size="md" disabled={disabled} onClick={handleAdd} className="min-w-[160px]">
            <ShoppingBag className="h-4 w-4" />
            {disabled ? t("stickyOutOfStock") : t("stickyAdd")}
          </Button>
        </div>
      </div>
    </div>
  )
}
