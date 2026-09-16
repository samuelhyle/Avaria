"use client"

/**
 * ChatWidget — top-level client component for Averia.
 *
 * Owns open/close state, the opt-in consent banner, the cart wiring, and
 * surfaces the action-confirmation flow.
 */

import { ChatBubble } from "@/components/ai/ChatBubble"
import { ChatDrawer } from "@/components/ai/ChatDrawer"
import { ConsentBanner } from "@/components/ai/ConsentBanner"
import type { ProposedAction } from "@/components/ai/MessageList"
import { type ChatMessageWithExtras, useAveriaChat } from "@/lib/ai/hooks/use-averia-chat"
import { usePageContext } from "@/lib/ai/hooks/use-page-context"
import { useCart } from "@/lib/cart/store"
import { AnimatePresence } from "motion/react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export interface ChatWidgetProps {
  locale: string
  /** When true (Netlify static demo), short-circuit submissions so the
   *  chat UX still appears but Averia is presented as offline. */
  demoMode?: boolean
}

const AGE_COOKIE = "averianlabs-age-confirmed"

function isAgeConfirmed(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").some((c) => c.startsWith(`${AGE_COOKIE}=`))
}

export function ChatWidget({ locale, demoMode = false }: ChatWidgetProps) {
  const t = useTranslations("averia")
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(false)
  const cart = useCart((s) => s.items)
  const cartCount = useCart((s) => s.count())
  const context = usePageContext({ itemCount: cartCount })
  const cartAdd = useCart((s) => s.add)
  const cartRemove = useCart((s) => s.remove)

  // In demo mode we inject a permanent provider_unavailable error so the
  // widget renders the "Averia is offline" state from the very first
  // send, instead of trying to POST to a non-existent /api/ai/chat.
  const demoError = demoMode
    ? (() => {
        const e = new Error("Averia is offline right now. Set MINIMAX_API_KEY to enable the chat.")
        e.name = "provider_unavailable"
        return e
      })()
    : null

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
    onSend: () => setUnread(false),
  })

  // Keep the latest submit in a ref so the open-chat listener can stay mounted.
  const submitRef = useRef(chat.submit)
  submitRef.current = chat.submit

  // Any page can open Averia with a prefilled question, e.g. "Ask Averia" on a
  // product page: window.dispatchEvent(new CustomEvent("averianlabs:open-chat", { detail: { message } }))
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      if (!isAgeConfirmed()) return
      setOpen(true)
      setUnread(false)
      if (detail?.message) submitRef.current(detail.message)
    }
    window.addEventListener("averianlabs:open-chat", handler)
    return () => window.removeEventListener("averianlabs:open-chat", handler)
  }, [])

  // Set unread when a new assistant message arrives while drawer is closed.
  const prevMsgCount = useRef(chat.messages.length)
  useEffect(() => {
    const newCount = chat.messages.length
    if (newCount > prevMsgCount.current && !open) {
      const last = chat.messages[chat.messages.length - 1]
      if (last?.role === "assistant") setUnread(true)
    }
    prevMsgCount.current = newCount
  }, [chat.messages, open])

  const handleOpen = () => {
    if (!isAgeConfirmed()) return
    setOpen(true)
    setUnread(false)
  }

  const handleClose = () => setOpen(false)

  const handleQuickPrompt = (prompt: string) => {
    chat.submit(prompt)
  }

  const handleRetry = () => {
    chat.retry()
  }

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
      }).catch(() => {
        // Feedback is telemetry — never block the conversation on it.
      })
    },
    [chat],
  )

  const messages: ChatMessageWithExtras[] = chat.messages

  return (
    <>
      <AnimatePresence>
        {!open ? <ChatBubble unread={unread} onOpen={handleOpen} /> : null}
      </AnimatePresence>

      {/* Only prompt for memory consent once the researcher actually opens
          Averia — an auto-shown card on first visit covers storefront CTAs. */}
      {open ? (
        <ConsentBanner
          consent={chat.consent}
          onAccept={() => chat.setConsent("accepted")}
          onDecline={() => chat.setConsent("declined")}
        />
      ) : null}

      <ChatDrawer
        open={open}
        onClose={handleClose}
        messages={messages}
        input={chat.input}
        setInput={chat.setInput}
        onSubmit={(text) => chat.submit(text)}
        onStop={chat.stop}
        isLoading={chat.isLoading}
        error={demoError ?? chat.error ?? undefined}
        onRetry={handleRetry}
        onQuickPrompt={handleQuickPrompt}
        onConfirmAction={handleConfirmAction}
        onDismissAction={handleDismissAction}
        onClearConversation={() => chat.reset()}
        onFeedback={handleFeedback}
      />
    </>
  )
}
