"use client"

import { cn } from "@/lib/utils/cn"
import {
  type ButtonHTMLAttributes,
  type ReactElement,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger"
type Size = "sm" | "md" | "lg" | "icon"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Optional label to render alongside the spinner while loading. */
  loadingLabel?: string
  fullWidth?: boolean
  /** Render the single child element (e.g. a `<Link>`) with the button styles. */
  asChild?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.97] shadow-sm hover:shadow-md",
  secondary:
    "bg-surface-2 text-ink hover:bg-surface-3 border border-line hover:border-ink-subtle/30",
  ghost: "bg-transparent text-ink hover:bg-surface-2 hover:text-ink active:bg-surface-3",
  outline:
    "bg-transparent text-accent border border-accent/40 hover:bg-accent-soft hover:border-accent",
  danger: "bg-danger text-on-accent hover:bg-danger/90 shadow-sm",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)] gap-1.5",
  md: "h-10 px-4 text-sm rounded-[var(--radius)] gap-2",
  lg: "h-12 px-6 text-base rounded-[var(--radius-lg)] gap-2",
  icon: "h-9 w-9 rounded-[var(--radius)]",
}

const baseClasses =
  "inline-flex items-center justify-center font-medium tracking-tight transition-[background,color,transform,box-shadow,border-color] duration-200 ease-[var(--ease-crystal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none"

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      loadingLabel,
      fullWidth,
      asChild,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className,
    )

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>
      return cloneElement(child, {
        ...rest,
        className: cn(classes, child.props.className),
      })
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classes}
        {...rest}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            {loadingLabel ? <span className="sr-only">{loadingLabel}</span> : null}
          </>
        ) : null}
        <span className={cn(loading && "opacity-70")}>{children}</span>
      </button>
    )
  },
)
Button.displayName = "Button"
