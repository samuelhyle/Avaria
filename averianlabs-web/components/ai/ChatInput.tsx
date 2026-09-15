"use client"

import { cn } from "@/lib/utils/cn"
import { Send, Square } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useRef } from "react"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  onStop?: () => void
  isLoading?: boolean
  placeholder: string
  disabled?: boolean
  maxLength?: number
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  placeholder,
  disabled,
  maxLength = 2000,
}: ChatInputProps) {
  const t = useTranslations("averia")
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim().length > 0 && !isLoading) {
        onSubmit(value)
      }
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (value.trim().length === 0 || isLoading) return
    onSubmit(value)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-line bg-surface px-3 py-3"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={maxLength}
        className={cn(
          "min-h-[40px] max-h-32 flex-1 resize-none rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm",
          "placeholder:text-ink-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
          "disabled:opacity-50",
        )}
      />
      <div className="flex items-center gap-1">
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={t("stop")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || value.trim().length === 0}
            aria-label={t("send")}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-accent text-white shadow-sm",
              "transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
}
