"use client"

import { ChatInput } from "@/components/ai/ChatInput"
import { type ChatMessage, MessageList, type ProposedAction } from "@/components/ai/MessageList"
import { QuickActions } from "@/components/ai/QuickActions"
import { HelixGlyph } from "@/components/ai/icons/HelixGlyph"
import { chatErrorBody as errorBodyFor, chatErrorTitle as errorTitleFor } from "@/lib/ai/errors"
import { useOverlay } from "@/lib/hooks/use-overlay"
import { cn } from "@/lib/utils/cn"
import { AlertCircle, RefreshCw, Trash2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslations } from "next-intl"

export interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  onSubmit: (text: string) => void
  onStop?: () => void
  isLoading: boolean
  error?: Error | undefined
  onRetry?: () => void
  onQuickPrompt?: (prompt: string) => void
  onConfirmAction?: (action: ProposedAction, messageId: string) => void
  onDismissAction?: (action: ProposedAction, messageId: string) => void
  consentBanner?: React.ReactNode
  onClearConversation?: () => void
  onFeedback?: (messageId: string, feedback: "up" | "down") => void
}

export function ChatDrawer({
  open,
  onClose,
  messages,
  input,
  setInput,
  onSubmit,
  onStop,
  isLoading,
  error,
  onRetry,
  onQuickPrompt,
  onConfirmAction,
  onDismissAction,
  onClearConversation,
  consentBanner,
  onFeedback,
}: ChatDrawerProps) {
  const t = useTranslations("averia")
  const containerRef = useOverlay<HTMLElement>({ open, onClose })

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="averia-drawer"
          className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch md:justify-end"
        >
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm md:hidden"
          />

          <motion.aside
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ y: 32, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className={cn(
              "relative z-10 flex h-[100dvh] max-h-[100dvh] w-full flex-col bg-surface shadow-2xl",
              "md:ml-auto md:max-w-md md:rounded-l-[var(--radius-lg)] md:border md:border-line md:border-r-0",
            )}
          >
            <header className="flex items-center justify-between border-b border-line bg-surface-2/50 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <HelixGlyph className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none">{t("title")}</span>
                  <span className="flex items-center gap-1 text-2xs text-ink-muted">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-ink-subtle"
                      aria-hidden
                    />
                    {t("statusOnline")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onClearConversation ? (
                  <button
                    type="button"
                    onClick={onClearConversation}
                    aria-label={t("clearConversation")}
                    title={t("clearConversation")}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("close")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <MessageList
              messages={messages}
              isStreaming={isLoading}
              emptyState={<EmptyState onPrompt={onQuickPrompt} />}
              onConfirmAction={onConfirmAction}
              onDismissAction={onDismissAction}
              onFeedback={onFeedback}
            />

            {error ? (
              <div
                role="alert"
                className="mx-4 mb-2 flex shrink-0 flex-wrap items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-3 py-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{errorTitleFor(t, error)}</p>
                  <p className="opacity-80">{errorBodyFor(t, error)}</p>
                </div>
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    aria-label={t("retry")}
                    className="ml-2 inline-flex items-center gap-1 rounded-full border border-danger/30 px-2 py-1 text-2xs font-medium hover:bg-danger/10"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("retry")}
                  </button>
                ) : null}
              </div>
            ) : null}

            {consentBanner}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              onStop={onStop}
              isLoading={isLoading}
              placeholder={t("inputPlaceholder")}
              reservePlatformSpace
            />
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function EmptyState({ onPrompt }: { onPrompt?: (prompt: string) => void }) {
  const t = useTranslations("averia")
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <HelixGlyph className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{t("greeting")}</h2>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">{t("greetingSub")}</p>
      </div>
      {onPrompt ? <QuickActions onSelect={onPrompt} /> : null}
    </div>
  )
}
