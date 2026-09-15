"use client"

import { useOverlay } from "@/lib/hooks/use-overlay"
import { FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

const STORAGE_KEY = "averianlabs-age-confirmed"

export function AgeGate() {
  const t = useTranslations("ageGate")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const confirmed = document.cookie.split("; ").some((c) => c.startsWith(`${STORAGE_KEY}=`))
    if (!confirmed) setOpen(true)
  }, [])

  // Escape must not dismiss the gate — the user has to answer it.
  const containerRef = useOverlay({ open, onClose: () => {} })

  const confirm = (value: boolean) => {
    if (value) {
      document.cookie = `${STORAGE_KEY}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
      setOpen(false)
    } else {
      window.location.href = "https://www.google.com"
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        className="glass-strong noise relative w-full max-w-md rounded-[var(--radius-xl)] border border-line p-8 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <FlaskConical className="h-5 w-5" />
        </div>
        <h2 id="age-gate-title" className="font-display text-2xl font-semibold text-ink">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-ink-muted text-pretty">{t("body")}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => confirm(true)}
            className="flex-1 rounded-[var(--radius)] bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
          >
            {t("yes")}
          </button>
          <button
            type="button"
            onClick={() => confirm(false)}
            className="flex-1 rounded-[var(--radius)] border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2"
          >
            {t("no")}
          </button>
        </div>
      </div>
    </div>
  )
}
