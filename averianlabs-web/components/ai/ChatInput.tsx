"use client"

import { cn } from "@/lib/utils/cn"
import { Send, Square } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
} from "react"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  onStop?: () => void
  isLoading?: boolean
  placeholder: string
  disabled?: boolean
  maxLength?: number
  reservePlatformSpace?: boolean
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
  reservePlatformSpace = false,
}: ChatInputProps) {
  const t = useTranslations("averia")
  const ref = useRef<HTMLTextAreaElement>(null)
  const composing = useRef(false)
  const hintId = useId()

  // biome-ignore lint/correctness/useExhaustiveDependencies: controlled text changes require remeasuring the textarea.
  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.style.height = "auto"
    input.style.height = `${Math.min(input.scrollHeight, 192)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !composing.current &&
      !e.nativeEvent.isComposing &&
      e.nativeEvent.keyCode !== 229
    ) {
      e.preventDefault()
      if (value.trim().length > 0 && !isLoading && !disabled) {
        onSubmit(value)
      }
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (value.trim().length === 0 || isLoading || disabled || composing.current) return
    onSubmit(value)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "shrink-0 border-t border-line bg-surface px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        reservePlatformSpace &&
          "pb-[calc(0.75rem+var(--platform-bottom-inset,0px)+env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          placeholder={placeholder}
          aria-label={t("inputLabel")}
          aria-describedby={hintId}
          disabled={disabled}
          rows={2}
          maxLength={maxLength}
          className={cn(
            "min-h-20 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-base leading-6",
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || value.trim().length === 0}
              aria-label={t("send")}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-on-accent shadow-sm",
                "transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-ink-muted">
        {t("inputHint")}
      </p>
    </form>
  )
}
