"use client"

import { LazyOnVisible } from "@/components/three/LazyOnVisible"
import { Skeleton } from "@/components/ui/Skeleton"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatSize } from "@/lib/utils/format"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

export interface Hero3DProductChipsProps {
  products: Array<Pick<Product, "slug" | "hue" | "defaultTranslation" | "translations" | "vials">>
  /** Notified when the user clicks a chip; the canvas reads this to focus. */
  onFocus?: (slug: string) => void
  /** The slug currently in focus; the chip reflects this with aria-selected. */
  focusedSlug?: string
  locale: string
}

/**
 * The bottom row of small chips in the hero. Each chip is one featured
 * product. Clicking a chip tells the canvas which vial to focus. The chips
 * are real `<button>` elements (keyboard-navigable, focusable, screen
 * reader-readable). Colour dot is the product's `hue`.
 *
 * The chips render server-side; the click handler is hydrated by the
 * adjacent client canvas. If the canvas hasn't hydrated yet, the chip
 * still works — the focus state is local React state that the canvas
 * syncs to once it's alive.
 */
export function Hero3DProductChips({
  products,
  onFocus,
  focusedSlug,
  locale,
}: Hero3DProductChipsProps) {
  const t = useTranslations("home")
  const [internal, setInternal] = useState<string | undefined>(focusedSlug)

  useEffect(() => {
    if (focusedSlug && focusedSlug !== internal) setInternal(focusedSlug)
  }, [focusedSlug, internal])

  if (products.length === 0) {
    return <Skeleton className="h-12 w-full rounded-full" />
  }

  const handleClick = (slug: string) => {
    setInternal(slug)
    onFocus?.(slug)
  }

  return (
    <div
      role="group"
      aria-label={t("heroChipsLabel")}
      className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent_0,black_24px,black_calc(100%-24px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0,black_24px,black_calc(100%-24px),transparent_100%)]"
    >
      {products.map((p) => {
        const isFocused = (focusedSlug ?? internal) === p.slug
        const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
        const minVial = p.vials.length
          ? p.vials.reduce((min, v) => (v.priceCents < min.priceCents ? v : min), p.vials[0]!)
          : undefined
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => handleClick(p.slug)}
            className={cn(
              "group relative inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border bg-surface px-3 py-1 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.97] sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm",
              isFocused
                ? "border-accent bg-accent-soft text-accent-ink shadow-sm"
                : "border-line text-ink hover:border-accent/40 hover:bg-accent-soft/40",
            )}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 ease-[var(--ease-crystal)] group-hover:scale-125 sm:h-2.5 sm:w-2.5"
              style={{ background: `hsl(${p.hue} 60% 50%)` }}
            />
            <span className="font-medium">{translation.name}</span>
            {minVial ? (
              <span className="hidden font-mono text-3xs text-ink-subtle sm:inline">
                · {formatSize(minVial, locale)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
