import { cn } from "@/lib/utils/cn"

/**
 * One definition of the button.
 *
 * The storefront's calls to action were each written out by hand — the hero
 * had one style, the featured band another, the quality band a third — and
 * they had drifted: three different focus treatments, two different heights
 * for the same role, and a dark CTA that was the primary action on one page
 * and the accent colour on another.
 *
 * These classes are shared by two things:
 *
 *   - `components/ui/Button.tsx`, the interactive button;
 *   - the server-rendered links on the storefront, which apply the same
 *     classes to a `<Link>` directly. A link must not become a client
 *     component just to look like a button — the storefront is server
 *     rendered on purpose, and the call to action is the one part of it that
 *     most visitors see.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "navy" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg" | "icon"

export const buttonBase =
  "inline-flex items-center justify-center font-medium tracking-tight transition-[background,color,transform,box-shadow,border-color] duration-200 ease-[var(--ease-crystal)] active:translate-y-0 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-surface-2 text-ink border border-line hover:bg-surface-3 hover:border-ink-subtle/30",
  outline:
    "bg-surface text-ink border border-line hover:border-accent/40 hover:text-accent hover:bg-accent-soft",
  // The one dark call to action. It is used where a light band needs a
  // single, unmistakable action and the accent is already spoken for.
  navy: "bg-ink text-white hover:bg-brand-navy shadow-sm",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  danger: "bg-danger text-on-accent hover:bg-danger/90 shadow-sm",
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm rounded-[var(--radius-sm)] gap-1.5",
  md: "min-h-11 px-4 py-2 text-sm rounded-[var(--radius)] gap-2",
  lg: "h-12 px-6 text-base rounded-[var(--radius-lg)] gap-2",
  icon: "h-10 w-10 rounded-[var(--radius)]",
}

/**
 * The classes for a button or a link that looks like one.
 *
 * The focus ring is deliberately *not* set here. The stylesheet draws one
 * focus outline for the whole site, and a button that also carried a ring
 * showed two indicators at once.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)
}
