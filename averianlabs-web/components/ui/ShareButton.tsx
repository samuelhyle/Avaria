"use client"

import { Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

export function ShareButton() {
  const t = useTranslations("common")
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The timeout has to be cleared on unmount, otherwise it sets state on a
  // component that is no longer mounted.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2"
      onClick={() => {
        if (typeof window === "undefined") return
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 2000)
      }}
    >
      <Share2 className="h-4 w-4" aria-hidden />
      {copied ? t("copied") : t("shareList")}
    </button>
  )
}
