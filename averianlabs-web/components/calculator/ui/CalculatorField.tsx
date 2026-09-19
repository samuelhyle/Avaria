"use client"

import { cn } from "@/lib/utils/cn"
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react"

interface CalculatorFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string
  unit?: string
  suffix?: ReactNode
  hint?: ReactNode
  error?: string | null
  /**
   * Optional preset chips rendered below the input. Each preset specifies
   * the value to write via the field's `onChange` when clicked.
   */
  presets?: Array<{ value: number; label: string }>
}

export function CalculatorField({
  label,
  unit,
  suffix,
  hint,
  error,
  presets,
  className,
  id,
  onChange,
  ...rest
}: CalculatorFieldProps) {
  const handlePresetClick = (value: number) => () => {
    onChange?.({
      target: { value: String(value) },
    } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-ink-muted">
          {label}
        </label>
        {unit ? <span className="font-mono text-2xs text-ink-subtle">{unit}</span> : null}
      </div>
      <div
        className={cn(
          "relative flex items-center overflow-hidden rounded-[var(--radius)] border border-line bg-surface",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
          error && "border-danger focus-within:ring-danger/30",
        )}
      >
        <input
          id={id}
          className={cn(
            "h-11 w-full bg-transparent px-3 text-base tabular-nums text-ink outline-none",
            "placeholder:text-ink-subtle",
          )}
          inputMode="decimal"
          aria-invalid={error ? true : undefined}
          onChange={onChange}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none pr-3 text-ink-subtle text-sm">{suffix}</span>
        ) : null}
      </div>
      {presets?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={handlePresetClick(preset.value)}
              className={cn(
                "rounded-full border border-line bg-surface px-2.5 py-0.5 text-2xs text-ink-muted",
                "hover:border-ink-subtle/40 hover:text-ink",
                "transition-colors duration-150",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-2xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-2xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
