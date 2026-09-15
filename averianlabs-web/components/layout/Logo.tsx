import { cn } from "@/lib/utils/cn"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

type LogoSize = "sm" | "md"

interface LogoProps
  extends Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children"> {
  href: string
  /** sm = drawer (h-7 text-base), md = header/footer (h-8 text-lg). */
  size?: LogoSize
  /**
   * Wordmark visibility:
   *   true           — always shown
   *   false          — never shown
   *   "responsive"   — hidden below the `sm` breakpoint (header pattern)
   */
  showWordmark?: boolean | "responsive"
  /** Soft glow shadow around the Æ chip. Header-only. */
  glow?: boolean
  className?: string
}

const BASE_LINK = "inline-flex items-center gap-2 font-display font-semibold"

const SIZE_MAP: Record<LogoSize, { chip: string; wordmark: string; link: string }> = {
  sm: {
    chip: "h-7 w-7 text-sm",
    wordmark: "text-base",
    link: "text-base",
  },
  md: {
    chip: "h-8 w-8",
    wordmark: "text-lg tracking-tight",
    link: "text-lg tracking-tight",
  },
}

export function Logo({
  href,
  size = "md",
  showWordmark = true,
  glow = false,
  className,
  ...rest
}: LogoProps) {
  const s = SIZE_MAP[size]
  const wordmarkClass = cn(s.wordmark, showWordmark === "responsive" && "hidden sm:inline")
  const wordmarkVisible = showWordmark === "responsive" ? true : showWordmark
  return (
    <Link href={href} className={cn(BASE_LINK, s.link, className)} {...rest}>
      <span
        className={cn(
          "flex items-center justify-center rounded-[var(--radius)] bg-accent text-white",
          s.chip,
          glow && size === "md" && "shadow-glow",
        )}
      >
        Æ
      </span>
      {wordmarkVisible ? <span className={wordmarkClass}>AVERIANLABS</span> : null}
    </Link>
  )
}
