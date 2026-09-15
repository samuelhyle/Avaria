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
 * the browser at runtime.
 */
export function LazyChatWidget({
  locale,
  demoMode = false,
}: {
  locale: string
  demoMode?: boolean
}) {
  if (demoMode) return null

  const [ready, setReady] = useState(false)

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 3000 })
      return () => w.cancelIdleCallback?.(id)
    }

    const timer = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return <ChatWidget locale={locale} />
}
