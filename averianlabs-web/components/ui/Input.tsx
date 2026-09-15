import { cn } from "@/lib/utils/cn"
import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from "react"

type InputSize = "sm" | "md" | "lg"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  inputSize?: InputSize
  leftIcon?: ReactNode
}

const sizeClass: Record<InputSize, string> = {
  sm: "h-9",
  md: "h-10",
  lg: "h-12",
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, inputSize = "md", leftIcon, className, id, ...rest }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const helpId = `${inputId}-help`
    const hasMessage = Boolean(error || hint)

    return (
      <div>
        {label ? (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-ink-muted">
            {label}
          </label>
        ) : null}
        <div className={cn("relative", className)}>
          {leftIcon ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center text-ink-subtle"
            >
              {leftIcon}
            </span>
          ) : null}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage ? helpId : undefined}
            className={cn(
              "w-full rounded-[var(--radius)] border border-line bg-surface text-sm placeholder:text-ink-subtle focus:border-accent focus:outline-none",
              sizeClass[inputSize],
              leftIcon ? "pl-10 pr-3" : "px-3",
              error && "border-danger focus:border-danger",
            )}
            {...rest}
          />
        </div>
        {hasMessage ? (
          <p
            id={helpId}
            role={error ? "alert" : undefined}
            className={cn("mt-1 text-xs", error ? "text-danger" : "text-ink-subtle")}
          >
            {error ?? hint}
          </p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = "Input"
