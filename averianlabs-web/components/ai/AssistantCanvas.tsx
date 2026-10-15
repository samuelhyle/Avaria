"use client"

import { ChatInput } from "@/components/ai/ChatInput"
import { ConsentBanner } from "@/components/ai/ConsentBanner"
import { type ChatMessage, MessageList, type ProposedAction } from "@/components/ai/MessageList"
import { QuickActions } from "@/components/ai/QuickActions"
import { HelixGlyph } from "@/components/ai/icons/HelixGlyph"
import { useCatalogue } from "@/components/product/CatalogueProvider"
import { Button } from "@/components/ui/Button"
import { chatErrorBody, chatErrorTitle } from "@/lib/ai/errors"
import { type ChatMessageWithExtras, useAveriaChat } from "@/lib/ai/hooks/use-averia-chat"
import { usePageContext } from "@/lib/ai/hooks/use-page-context"
import { useCart } from "@/lib/cart/store"
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useCallback, useEffect } from "react"
import { toast } from "sonner"

interface AssistantCanvasProps {
  locale: string
  initialPrompt?: string
}

/**
 * Full-page Averia canvas — the power-user view of the same chat the floating
 * widget uses. Shares the hook, message renderer and action/feedback plumbing.
 */
export function AssistantCanvas({ locale, initialPrompt }: AssistantCanvasProps) {
  const t = useTranslations("averia")
  const products = useCatalogue()
  const tAssistant = useTranslations("averia.assistant")
  const r = useTranslations("research")
  const cart = useCart((s) => s.items)
  const cartCount = cart.reduce((count, item) => count + item.qty, 0)
  const cartAdd = useCart((s) => s.add)
  const cartRemove = useCart((s) => s.remove)
  const context = usePageContext({ itemCount: cartCount })

  const chat = useAveriaChat({
    locale,
    context,
    cart: cart.map((i) => ({
      sku: i.sku,
      productSlug: i.productSlug,
      name: i.name,
      mg: i.mg,
      sizeValue: i.sizeValue,
      sizeUnit: i.sizeUnit,
      qty: i.qty,
      unitPriceCents: i.unitPriceCents ?? 0,
      purchaseMode: i.purchaseMode,
    })),
  })

  useEffect(() => {
    if (initialPrompt) chat.setInput(initialPrompt)
  }, [initialPrompt, chat.setInput])
  const handleConfirmAction = useCallback(
    async (action: ProposedAction, messageId: string) => {
      if (action.kind === "add_to_cart") {
        const product = products.find((p) => p.slug === action.productSlug)
        const vial = product?.vials.find((v) => v.sku === action.sku)
        if (!product || !vial || vial.purchaseMode !== "direct" || vial.stockQty < action.qty) {
          toast.error(t("actions.unavailable"))
          return
        }
        cartAdd({
          sku: vial.sku,
          productSlug: product.slug,
          name: action.productName,
          mg: vial.mg,
          sizeValue: vial.sizeValue,
          sizeUnit: vial.sizeUnit,
          qty: action.qty,
          unitPriceCents: vial.priceCents,
          purchaseMode: vial.purchaseMode,
        })
        chat.resolveAction(messageId, action, "added")
        toast.success(t("actions.addedToast", { name: action.productName }))
      } else if (action.kind === "remove_from_cart") {
        cartRemove(action.sku)
        chat.resolveAction(messageId, action, "added")
        toast.success(t("actions.removedToast"))
      } else if (action.kind === "remember") {
        try {
          const response = await fetch("/api/ai/memory", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ key: action.key, value: action.value, source: "explicit" }),
          })
          if (!response.ok) throw new Error("memory_not_saved")
          chat.resolveAction(messageId, action, "added")
          toast.success(t("actions.rememberedToast"))
        } catch {
          toast.error(t("errorBody"))
        }
      }
    },
    [products, cartAdd, cartRemove, chat, t],
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex h-[min(780px,calc(100dvh-8rem))] min-h-96 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <HelixGlyph className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">{t("title")}</h1>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-subtle" aria-hidden />
                {t("statusOnline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => chat.reset()}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {tAssistant("newChat")}
            </Button>
          </div>
        </header>

        <MessageList
          messages={messages as ChatMessage[]}
          isStreaming={chat.isLoading}
          emptyState={
            <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <HelixGlyph className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{t("greeting")}</h2>
                <p className="mt-2 text-base leading-relaxed text-ink-muted">{t("greetingSub")}</p>
              </div>
              <QuickActions onSelect={(prompt) => chat.submit(prompt)} />
            </div>
          }
          onConfirmAction={handleConfirmAction}
          onDismissAction={handleDismissAction}
          onFeedback={handleFeedback}
        />

        {chat.error ? (
          <div
            role="alert"
            className="mx-4 mb-2 flex shrink-0 flex-wrap items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-3 py-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">{chatErrorTitle(t, chat.error)}</p>
              <p className="opacity-80">{chatErrorBody(t, chat.error)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => chat.retry()}>
              <RefreshCw className="h-3 w-3" aria-hidden />
              {t("retry")}
            </Button>
          </div>
        ) : null}

        <ConsentBanner
          inline
          consent={chat.consent}
          onAccept={() => chat.setConsent("accepted")}
          onDecline={() => chat.setConsent("declined")}
        />
        <ChatInput
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={(text) => chat.submit(text)}
          onStop={chat.stop}
          isLoading={chat.isLoading}
          placeholder={t("inputPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-ink-muted">
        <p>
          {tAssistant("privacyNote")}{" "}
          <Link
            href={`/${locale}/legal/privacy`}
            className="text-accent underline underline-offset-2"
          >
            {tAssistant("privacyLink")}
          </Link>
        </p>
        <div className="flex flex-wrap gap-4 text-accent">
          <Link className="underline underline-offset-2" href={`/${locale}/peptide-calculator`}>
            {r("calculator")}
          </Link>
          <Link className="underline underline-offset-2" href={`/${locale}/documents`}>
            {r("documents")}
          </Link>
        </div>
      </div>
    </div>
  )
}
