"use client"

/**
 * Averia chat — barrel module. The actual implementation lives in the
 * `chat/` subdirectory. This file is kept for backwards compatibility with
 * existing imports (`@/components/ai/MessageList`) — prefer importing the
 * concrete pieces from `./chat/*` in new code.
 */

export { MessageList } from "./chat/MessageList"
export { Message } from "./chat/Message"
export { ActionCard } from "./chat/ActionCard"
export { AssistantMarkdown } from "./chat/AssistantMarkdown"
export { CitationChips } from "./chat/CitationChips"
export { FeedbackBar } from "./chat/FeedbackBar"
export { InlineProducts, extractProducts } from "./chat/InlineProducts"
export { ToolTraceList, ToolIcon } from "./chat/ToolTraceList"

export type {
  ChatMessage,
  MessageListProps,
  MessageProps,
  ToolTrace,
} from "./chat/types"

export type {
  ActionResolution,
  ProposedAction,
  ProposedActionAddToCart,
} from "@/lib/ai/types/events"
