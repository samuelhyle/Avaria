"use client"

import { type ReactNode, use } from "react"

let documentReady: Promise<void> | undefined

/** Keep streamed HTML intact until the browser has parsed the complete document. */
export function DocumentHydrationGate({ children }: { children: ReactNode }) {
  if (typeof document !== "undefined" && document.readyState === "loading") {
    documentReady ??= new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true })
    })
    use(documentReady)
  }
  return children
}
