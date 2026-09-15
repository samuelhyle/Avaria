"use client"

import { Share2 } from "lucide-react"
import { useState } from "react"

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2"
      onClick={() => {
        if (typeof window !== "undefined") {
          navigator.clipboard.writeText(window.location.href)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }}
    >
      <Share2 className="h-4 w-4" />
      {copied ? "Copied!" : "Share list"}
    </button>
  )
}
