"use client"

import {
  type ButtonSize,
  type ButtonVariant,
  buttonBase,
  buttonSizes,
  buttonVariants,
} from "@/lib/ui/button-styles"
import { cn } from "@/lib/utils/cn"
import {
  type ButtonHTMLAttributes,
  type ReactElement,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Optional label to render alongside the spinner while loading. */
  loadingLabel?: string
  fullWidth?: boolean
  /** Render the single child element (e.g. a `<Link>`) with the button styles. */
  asChild?: boolean
}

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
      buttonBase,
      buttonVariants[variant],
      buttonSizes[size],
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
        <span className={cn("inline-flex items-center gap-[inherit]", loading && "opacity-70")}>
          {children}
        </span>
      </button>
    )
  },
)
Button.displayName = "Button"
