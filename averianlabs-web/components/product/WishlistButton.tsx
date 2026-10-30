"use client"

import { cn } from "@/lib/utils/cn"
import { useWishlist } from "@/lib/wishlist/store"
import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

interface WishlistButtonProps {
  slug: string
  size?: "sm" | "md"
  className?: string
  /** Optional label content — when present, the button renders as a pill. */
  children?: ReactNode
}

export function WishlistButton({ slug, size = "md", className, children }: WishlistButtonProps) {
  const tCommon = useTranslations("common")
  const has = useWishlist((s) => s.items.includes(slug))
  const toggle = useWishlist((s) => s.toggle)
  const labelled = Boolean(children)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(slug)
      }}
      aria-label={has ? tCommon("removeFromWishlist") : tCommon("addToWishlist")}
      aria-pressed={has}
      className={cn(
        labelled
          ? "inline-flex h-10 items-center gap-1 rounded-[var(--radius)] border px-3 text-sm font-medium transition-colors"
          : "inline-flex items-center justify-center rounded-full border bg-surface transition-all",
        size === "sm" && !labelled ? "h-7 w-7" : "",
        size === "md" && !labelled ? "h-9 w-9" : "",
        has
          ? labelled
            ? "border-danger/30 bg-danger-soft text-danger"
            : "border-danger/30 bg-danger-soft text-danger"
          : labelled
            ? "border-line bg-surface text-ink hover:border-danger/40 hover:text-danger"
            : "border-line text-ink-muted hover:border-danger/40 hover:text-danger",
        className,
      )}
    >
      <Heart
        className={cn(
          labelled ? "h-4 w-4" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          has && "fill-current",
        )}
      />
      {labelled ? children : null}
    </button>
  )
}
