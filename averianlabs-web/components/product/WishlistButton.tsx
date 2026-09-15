"use client"

import { cn } from "@/lib/utils/cn"
import { useWishlist } from "@/lib/wishlist/store"
import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"

interface WishlistButtonProps {
  slug: string
  size?: "sm" | "md"
  className?: string
}

export function WishlistButton({ slug, size = "md", className }: WishlistButtonProps) {
  const tCommon = useTranslations("common")
  const has = useWishlist((s) => s.items.includes(slug))
  const toggle = useWishlist((s) => s.toggle)

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
        "inline-flex items-center justify-center rounded-full border bg-surface transition-all",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        has
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-line text-ink-muted hover:border-danger/40 hover:text-danger",
        className,
      )}
    >
      <Heart className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", has && "fill-current")} />
    </button>
  )
}
