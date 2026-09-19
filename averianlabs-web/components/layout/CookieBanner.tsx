"use client"

import { Cookie } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

const STORAGE_KEY = "averianlabs-cookie-consent"

export function CookieBanner() {
  const t = useTranslations("cookie")
  const [show, setShow] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) setShow(true)
  }, [])

  const persist = (value: "all" | "essential") => {
    localStorage.setItem(STORAGE_KEY, value)
    document.cookie = `${STORAGE_KEY}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
    setShow(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }))
    }
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-xl px-2 safe-bottom animate-in slide-in-from-bottom-4 fade-in sm:bottom-6"
    >
      <div className="glass-strong noise flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line/80 p-4 shadow-2xl ring-1 ring-ink/5 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{t("title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted text-pretty">{t("body")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => persist("essential")}
            className="rounded-[var(--radius)] border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {t("reject")}
          </button>
          <button
            type="button"
            onClick={() => persist("all")}
            className="rounded-[var(--radius)] bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  )
}
