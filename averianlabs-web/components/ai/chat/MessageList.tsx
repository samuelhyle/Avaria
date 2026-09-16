"use client"

import { useAutoScroll } from "@/lib/hooks/use-auto-scroll"
import { useMemo, useRef } from "react"

import { Message } from "./Message"
import type { MessageListProps } from "./types"

export function MessageList({
  messages,
  isStreaming,
  emptyState,
  onConfirmAction,
  onDismissAction,
  onFeedback,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hash all the things that should trigger a scroll when they grow. Watching
  // just `content` misses tool chips, citations, and action cards which can
  // appear without the content changing.
  const growthKey = useMemo(() => {
    let tool = 0
    let cite = 0
    let action = 0
    for (const m of messages) {
      tool += m.toolTrace?.length ?? 0
      cite += m.citations?.length ?? 0
      action += m.proposedActions?.length ?? 0
    }
    const last = messages.at(-1)
    return (
      messages.length * 1_000_000 +
      (last?.content.length ?? 0) * 1000 +
      tool * 100 +
      cite * 10 +
      action
    )
  }, [messages])

  useAutoScroll({ scrollRef, growthKey, isStreaming })

  if (messages.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {emptyState}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isStreaming}
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
    >
      {messages.map((m) => (
        <Message
          key={m.id}
          message={m}
          isStreaming={isStreaming && m === messages.at(-1) && m.role === "assistant"}
          onConfirmAction={onConfirmAction}
          onDismissAction={onDismissAction}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  )
}
