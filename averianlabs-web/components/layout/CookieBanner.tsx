"use client"

import { Cookie } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

const STORAGE_KEY = "averianlabs-cookie-consent"

export function CookieBanner({ locale }: { locale: string }) {
  const t = useTranslations("cookie")
  const [show, setShow] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved || document.documentElement.dataset.cookieSettingsRequested) setShow(true)
    delete document.documentElement.dataset.cookieSettingsRequested
    const reopen = () => {
      delete document.documentElement.dataset.cookieSettingsRequested
      setShow(true)
    }
    window.addEventListener("cookie-settings", reopen)
    return () => window.removeEventListener("cookie-settings", reopen)
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
      className="fixed inset-x-0 bottom-3 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-xl animate-in slide-in-from-bottom-4 flex-col gap-2 px-1 safe-bottom fade-in sm:bottom-6 sm:px-2"
    >
      {/* Compact mobile pill — title + icon-only buttons. Sits in the
          bottom-left corner of the screen so the chat bubble (which only
          renders post-consent) has its own clear space at the bottom-right.
          Expands to the full inline card on sm+. */}
      <div className="glass-strong noise flex items-center gap-2 rounded-full border border-line/80 py-1.5 pl-2 pr-1.5 shadow-lg ring-1 ring-ink/5 sm:hidden">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Cookie className="h-3.5 w-3.5" />
        </div>
        <p className="flex-1 text-xs font-semibold text-ink">{t("title")}</p>
        <button
          type="button"
          onClick={() => persist("essential")}
          aria-label={t("reject")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span aria-hidden="true" className="text-xs font-medium">
            ✕
          </span>
        </button>
        <button
          type="button"
          onClick={() => persist("all")}
          aria-label={t("accept")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span aria-hidden="true" className="text-xs font-semibold">
            ✓
          </span>
        </button>
      </div>

      {/* Inline card on sm+ — title, body, both buttons. Same vertical
          anchor as before so the layout on tablet / desktop is stable. */}
      <div className="glass-strong noise hidden flex-col gap-4 rounded-[var(--radius-lg)] border border-line/80 p-4 shadow-2xl ring-1 ring-ink/5 sm:flex sm:flex-row sm:items-center sm:gap-5 sm:p-5">
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
