"use client"

import { cn } from "@/lib/utils/cn"

interface OpenChatButtonProps {
  /** Event name dispatched on `window` when the button is clicked. */
  event: string
  /** Detail payload attached to the CustomEvent. */
  detail?: unknown
  className?: string
  children: React.ReactNode
}

/**
 * Client-side button that dispatches a window-level CustomEvent on click.
 *
 * Used by server-rendered marketing pages to open the chat widget with a
 * pre-filled question — Server Components can't pass event handlers through
 * serialization, so this is its own client island.
 */
export function OpenChatButton({ event, detail, className, children }: OpenChatButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === "undefined") return
        window.dispatchEvent(new CustomEvent(event, { detail }))
      }}
      className={cn(
        "mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover",
        className,
      )}
    >
      {children}
    </button>
  )
}
