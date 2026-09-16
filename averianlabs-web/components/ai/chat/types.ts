import type { CitationRef } from "@/lib/ai/types"
import type {
  ActionResolution,
  ProposedAction,
  ProposedActionAddToCart,
} from "@/lib/ai/types/events"

export type { ProposedAction, ProposedActionAddToCart, ActionResolution }

export interface ToolTrace {
  id: string
  name: string
  args: unknown
  result?: unknown
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  citations?: CitationRef[]
  toolTrace?: ToolTrace[]
  proposedActions?: ProposedAction[]
  resolvedActions?: Record<string, ActionResolution>
  feedback?: "up" | "down"
}

export interface MessageProps {
  message: ChatMessage
  isStreaming?: boolean
  onConfirmAction?: (action: ProposedAction, messageId: string) => void
  onDismissAction?: (action: ProposedAction, messageId: string) => void
  onFeedback?: (messageId: string, feedback: "up" | "down") => void
}

export interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  emptyState: React.ReactNode
  onConfirmAction?: (action: ProposedAction, messageId: string) => void
  onDismissAction?: (action: ProposedAction, messageId: string) => void
  onFeedback?: (messageId: string, feedback: "up" | "down") => void
}
