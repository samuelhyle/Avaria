"use client"

import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils/cn"

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
}

const variantClass: Record<NonNullable<PrimaryButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.97] shadow-sm hover:shadow-md",
  secondary:
    "bg-surface-2 text-ink hover:bg-surface-3 border border-line hover:border-ink-subtle/30",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
}

export function PrimaryButton({
  variant = "primary",
  className,
  children,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[var(--radius)] px-4 text-sm font-medium",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
