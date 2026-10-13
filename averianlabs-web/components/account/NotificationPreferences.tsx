"use client"

import { Button } from "@/components/ui/Button"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

interface Props {
  userId: string
  initial: {
    replyEnabled: boolean
    reactionEnabled: boolean
    mentionEnabled: boolean
    planSharedEnabled: boolean
    emailDigest: boolean
  }
}

export function NotificationPreferences({ userId, initial }: Props) {
  const t = useTranslations("notifications")
  void userId // not used in this client component — server passes initial
  const [prefs, setPrefs] = useState(initial)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggle = (key: keyof typeof prefs) => async () => {
    setBusy(true)
    setError(false)
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      const response = await fetch("/api/account/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      })
      if (!response.ok) throw new Error("preferences_failed")
    } catch {
      // revert on failure
      setPrefs(prefs)
      setError(true)
    }
    setBusy(false)
  }

  const rows: { key: keyof typeof prefs; label: string; sub: string }[] = [
    {
      key: "replyEnabled",
      label: t("reply"),
      sub: t("replySub"),
    },
    {
      key: "reactionEnabled",
      label: t("reaction"),
      sub: t("reactionSub"),
    },
    {
      key: "planSharedEnabled",
      label: t("planShared"),
      sub: t("planSharedSub"),
    },
  ]

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">{t("title")}</h3>
      <p className="mt-1 text-xs text-ink-muted">{t("intro")}</p>
      {error && <p role="alert">{t("error")}</p>}
      <ul className="mt-4 space-y-3">
        {rows.map(({ key, label, sub }) => (
          <li
            key={key}
            className="flex items-start justify-between gap-3 border-t border-line pt-3 first:border-0 first:pt-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{label}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
            </div>
            <Button
              variant={prefs[key] ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                void toggle(key)()
              }}
              disabled={busy}
              aria-pressed={prefs[key]}
              aria-label={`${label}: ${prefs[key] ? t("on") : t("off")}`}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : prefs[key] ? (
                t("on")
              ) : (
                t("off")
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
