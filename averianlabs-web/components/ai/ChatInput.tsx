"use client"

import { cn } from "@/lib/utils/cn"
import { Send, Square } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
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
  /**
   * Hard character limit (also enforced server-side). The textarea shows a
   * soft counter once the user crosses `counterThreshold` chars. Defaults to
   * the server's `8000` cap so the client never silently truncates.
   */
  maxLength?: number
  counterThreshold?: number
}

const MAX_HEIGHT_PX = 192 // matches max-h-48 (12rem) — see textarea className below
const MIN_HEIGHT_PX = 40 // matches min-h-[40px]

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  {
    value,
    onChange,
    onSubmit,
    onStop,
    isLoading,
    placeholder,
    disabled,
    maxLength = 8000,
    counterThreshold = 1500,
  },
  forwardedRef,
) {
  const t = useTranslations("averia")
  const ref = useRef<HTMLTextAreaElement>(null)

  // Expose the textarea so parents can focus it (e.g. when the chat drawer opens).
  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement)

  // Auto-grow the textarea up to MAX_HEIGHT_PX. After that we let the native
  // scrollbar kick in so very long pastes remain reachable.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on `value` so the height tracks typed content
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX)
    el.style.height = `${Math.max(next, MIN_HEIGHT_PX)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden"
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter while an IME composition is in flight — otherwise pressing
    // Enter to confirm a JP/CN/KR candidate submits the half-typed message.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
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

  const showCounter = value.length >= counterThreshold
  const overLimit = value.length > maxLength

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-1 border-t border-line bg-surface px-3 py-3"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={1}
          className={cn(
            "min-h-[40px] max-h-48 flex-1 resize-none rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm",
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
      </div>
      {showCounter ? (
        <p
          aria-live="polite"
          className={cn(
            "self-end pr-1 text-3xs tabular-nums",
            overLimit ? "text-danger" : "text-ink-subtle",
          )}
        >
          {t("charCounter", { count: value.length, max: maxLength })}
        </p>
      ) : null}
    </form>
  )
})
