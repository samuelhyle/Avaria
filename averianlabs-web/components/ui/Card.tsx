import { cn } from "@/lib/utils/cn"
import type { ComponentPropsWithoutRef } from "react"

/**
 * The storefront's card.
 *
 * Every card in the shop used to be hand-rolled, and they had drifted apart:
 * four different corner radii (8, 12, 16 and 20px), nine different
 * paddings, four shadow treatments and five hover behaviours. The product
 * card — the one a shopper looks at most — was the only one with the 20px
 * radius, so it did not sit in the same family as the cards around it.
 *
 * This is the single definition: one radius, one border, one surface, one
 * padding step and one hover. A card that is not interactive gets no hover;
 * one that is gets the lift.
 *
 *     <Card>                 a static panel
 *     <Card interactive>     a panel that responds to the pointer
 *     <Card as="article">    a panel that is a landmark in the page
 */
export function Card({
  className,
  interactive = false,
  tone = "surface",
  padding = "md",
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  /** Whether the card lifts and tints on hover. Only for cards you can act on. */
  interactive?: boolean
  /** `surface` sits on the page, `sunk` sits inside another card. */
  tone?: "surface" | "sunk"
  /** The inner padding step. */
  padding?: "sm" | "md" | "lg"
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line",
        tone === "surface" ? "bg-surface" : "bg-surface-2/60",
        padding === "sm" && "p-4",
        padding === "md" && "p-5",
        padding === "lg" && "p-6 sm:p-7",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-crystal)] hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--shadow)]",
        className,
      )}
      {...props}
    />
  )
}
