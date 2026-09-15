import { cn } from "@/lib/utils/cn"
import { type HTMLAttributes, forwardRef, useId } from "react"

interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  name?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  rows?: number
  maxLength?: number
  required?: boolean
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const helpId = `${textareaId}-help`
    const hasMessage = Boolean(error || hint)

    return (
      <div>
        {label ? (
          <label htmlFor={textareaId} className="mb-1.5 block text-xs font-medium text-ink-muted">
            {label}
          </label>
        ) : null}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rest.rows ?? 4}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? helpId : undefined}
          className={cn(
            "w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-subtle focus:border-accent focus:outline-none",
            error && "border-danger focus:border-danger",
            className,
          )}
          {...rest}
        />
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
Textarea.displayName = "Textarea"
