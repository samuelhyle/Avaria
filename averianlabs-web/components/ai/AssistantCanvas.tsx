"use client"

import { ChatInput } from "@/components/ai/ChatInput"
import { ConsentBanner } from "@/components/ai/ConsentBanner"
import { type ChatMessage, MessageList, type ProposedAction } from "@/components/ai/MessageList"
import { QuickActions } from "@/components/ai/QuickActions"
import { SourcesPanel } from "@/components/ai/SourcesPanel"
import { HelixGlyph } from "@/components/ai/icons/HelixGlyph"
import { Button } from "@/components/ui/Button"
import { type ChatMessageWithExtras, useAveriaChat } from "@/lib/ai/hooks/use-averia-chat"
import { usePageContext } from "@/lib/ai/hooks/use-page-context"
import type { CitationRef } from "@/lib/ai/types"
import { useCart } from "@/lib/cart/store"
import { AlertCircle, MessageSquare, RefreshCw, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

interface AssistantCanvasProps {
  locale: string
}

/**
 * Full-page Averia canvas — the power-user view of the same chat the floating
 * widget uses. Shares the hook, message renderer and action/feedback plumbing.
 *
 * Adds a sources side-panel (toggleable) so researchers can see every cited
 * source for the current conversation at a glance, with type labels and
 * direct links into the originating page.
 */
export function AssistantCanvas({ locale }: AssistantCanvasProps) {
  const t = useTranslations("averia")
  const tAssistant = useTranslations("averia.assistant")
  const cart = useCart((s) => s.items)
  const cartCount = useCart((s) => s.count())
  const cartAdd = useCart((s) => s.add)
  const cartRemove = useCart((s) => s.remove)
  const context = usePageContext({ itemCount: cartCount })
  const [showSources, setShowSources] = useState(true)

  const chat = useAveriaChat({
    locale,
    context,
    cart: cart.map((i) => ({
      sku: i.sku,
      productSlug: i.productSlug,
      name: i.name,
      mg: i.mg,
      qty: i.qty,
      unitPriceCents: i.unitPriceCents,
    })),
  })

  const handleConfirmAction = useCallback(
    (action: ProposedAction, messageId: string) => {
      if (action.kind === "add_to_cart") {
        cartAdd({
          sku: action.sku,
          productSlug: action.productSlug,
          name: action.productName,
          mg: action.mg,
          qty: action.qty,
          unitPriceCents: action.unitPriceCents,
        })
        chat.resolveAction(messageId, action, "added")
        toast.success(t("actions.addedToast", { name: action.productName }))
      } else if (action.kind === "remove_from_cart") {
        cartRemove(action.sku)
        chat.resolveAction(messageId, action, "added")
        toast.success(t("actions.removedToast"))
      } else if (action.kind === "remember") {
        void fetch("/api/ai/memory", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: action.key, value: action.value, source: "explicit" }),
        }).catch(() => {})
        chat.resolveAction(messageId, action, "added")
        toast.success(t("actions.rememberedToast"))
      }
    },
    [cartAdd, cartRemove, chat, t],
  )

  const handleDismissAction = useCallback(
    (action: ProposedAction, messageId: string) => {
      chat.resolveAction(messageId, action, "dismissed")
    },
    [chat],
  )

  const handleFeedback = useCallback(
    (messageId: string, feedback: "up" | "down") => {
      chat.setFeedback(messageId, feedback)
      void fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId, feedback }),
      }).catch(() => {})
    },
    [chat],
  )

  const messages: ChatMessageWithExtras[] = chat.messages

  const allCitations = useMemo<CitationRef[]>(() => {
    const flat: CitationRef[] = []
    for (const m of messages) {
      if (m.citations) flat.push(...m.citations)
    }
    return flat
  }, [messages])

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-sm">
        <header className="flex items-center justify-between border-b border-line bg-surface-2/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <HelixGlyph className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">{t("title")}</h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                {t("statusOnline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => chat.reset()}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {tAssistant("newChat")}
            </Button>
          </div>
        </header>

        <MessageList
          messages={messages as ChatMessage[]}
          isStreaming={chat.isLoading}
          emptyState={
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <HelixGlyph className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("greeting")}</h3>
                <p className="mt-1 text-xs text-ink-muted">{t("greetingSub")}</p>
              </div>
              <QuickActions onSelect={(prompt) => chat.submit(prompt)} />
            </div>
          }
          onConfirmAction={handleConfirmAction}
          onDismissAction={handleDismissAction}
          onFeedback={handleFeedback}
        />

        {chat.error ? (
          <div className="mx-5 mb-2 flex items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">{t("errorTitle")}</p>
              <p className="opacity-80">{t("errorBody")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => chat.reset()}>
              <RefreshCw className="h-3 w-3" aria-hidden />
              {t("retry")}
            </Button>
          </div>
        ) : null}

        <ChatInput
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={(text) => chat.submit(text)}
          onStop={chat.stop}
          isLoading={chat.isLoading}
          placeholder={t("inputPlaceholder")}
        />
      </div>

      <aside className="space-y-5">
        <SourcesPanel
          citations={allCitations}
          showSources={showSources}
          onToggle={() => setShowSources((v) => !v)}
        />

        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-accent" aria-hidden />
            {tAssistant("tipsTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-ink-muted">
            <li>· {tAssistant("tip1")}</li>
            <li>· {tAssistant("tip2")}</li>
            <li>· {tAssistant("tip3")}</li>
          </ul>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2/50 p-5 text-xs text-ink-muted">
          {tAssistant("privacyNote")}{" "}
          <Link href={`/${locale}/legal/privacy`} className="text-accent hover:underline">
            {tAssistant("privacyLink")}
          </Link>
        </div>
      </aside>

      <ConsentBanner
        consent={chat.consent}
        onAccept={() => chat.setConsent("accepted")}
        onDecline={() => chat.setConsent("declined")}
      />
    </div>
  )
}
