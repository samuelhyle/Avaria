"use client"

import { HelixGlyph } from "@/components/ai/icons/HelixGlyph"
import { prepareAssistantContent } from "@/lib/ai/citations"
import { proposedActionKey } from "@/lib/ai/types/events"

import { ActionCard } from "./ActionCard"
import { AssistantMarkdown } from "./AssistantMarkdown"
import { CitationChips } from "./CitationChips"
import { FeedbackBar } from "./FeedbackBar"
import { InlineProducts, extractProducts } from "./InlineProducts"
import { ToolTraceList } from "./ToolTraceList"
import type { MessageProps } from "./types"

export function Message({
  message,
  isStreaming,
  onConfirmAction,
  onDismissAction,
  onFeedback,
}: MessageProps) {
  const isUser = message.role === "user"
  const products = isUser ? [] : extractProducts(message.toolTrace)
  const renderedContent = isUser
    ? message.content
    : prepareAssistantContent(message.content, message.citations).text

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5 text-sm text-ink shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <HelixGlyph className="h-4 w-4" />
      </div>
      <div className="flex max-w-[85%] min-w-0 flex-col gap-2">
        {message.toolTrace && message.toolTrace.length > 0 ? (
          <ToolTraceList trace={message.toolTrace} />
        ) : null}
        {message.content ? (
          <div className="min-w-0 rounded-2xl rounded-tl-md border border-line/60 bg-surface px-4 py-2.5 text-sm text-ink shadow-sm">
            <AssistantMarkdown content={renderedContent} isStreaming={Boolean(isStreaming)} />
          </div>
        ) : null}
        {message.proposedActions && message.proposedActions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {message.proposedActions.map((a) => (
              <ActionCard
                key={proposedActionKey(a)}
                action={a}
                resolved={message.resolvedActions?.[proposedActionKey(a)]}
                onConfirm={() => onConfirmAction?.(a, message.id)}
                onDismiss={() => onDismissAction?.(a, message.id)}
              />
            ))}
          </div>
        ) : null}
        {!isStreaming && products.length > 0 ? <InlineProducts products={products} /> : null}
        {message.citations && message.citations.length > 0 && !isStreaming ? (
          <CitationChips citations={message.citations} />
        ) : null}
        {!isStreaming && message.content ? (
          <FeedbackBar
            feedback={message.feedback}
            onFeedback={(fb) => onFeedback?.(message.id, fb)}
          />
        ) : null}
      </div>
    </div>
  )
}
