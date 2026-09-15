"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const ChatWidget = dynamic(
  () => import("@/components/ai/ChatWidget").then((m) => ({ default: m.ChatWidget })),
  { ssr: false, loading: () => null },
)

/**
 * Defers the chat bundle (motion + markdown) until the browser is idle so it
 * doesn't compete with hydration and LCP on first load.
 *
 * Pass `demoMode` from a server component — `BUILD_MODE` isn't surfaced to
 * the browser at runtime. In demo mode the widget is still mounted (so
 * visitors can see the chat UX), but submission will hit a 404 and the
 * widget renders the friendly "Averia is offline" state from the
 * error-classification layer.
 */
export function LazyChatWidget({
  locale,
  demoMode = false,
}: {
  locale: string
  demoMode?: boolean
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // `requestIdleCallback`/`cancelIdleCallback` aren't in the default DOM
    // types in TS 5.7; widen locally so we can feature-detect at runtime.
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => number
    }

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 3000 })
      return () => w.cancelIdleCallback?.(id)
    }

    const timer = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return <ChatWidget locale={locale} demoMode={demoMode} />
}