"use client"

import { Button } from "@/components/ui/Button"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

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
  const t = useTranslations("notifications" as never) as unknown as (k: string) => string
  void userId // not used in this client component — server passes initial
  const [prefs, setPrefs] = useState(initial)
  const [busy, setBusy] = useState(false)

  const toggle = (key: keyof typeof prefs) => async () => {
    setBusy(true)
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      await fetch("/api/account/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      })
    } catch {
      // revert on failure
      setPrefs(prefs)
    }
    setBusy(false)
  }

  const rows: { key: keyof typeof prefs; label: string; sub: string }[] = [
    {
      key: "replyEnabled",
      label: t("reply") ?? "Replies to your threads",
      sub: t("replySub") ?? "When someone replies to a thread you started.",
    },
    {
      key: "reactionEnabled",
      label: t("reaction") ?? "Reactions to your posts",
      sub: t("reactionSub") ?? "Helpful / Insightful / Thanks.",
    },
    {
      key: "planSharedEnabled",
      label: t("planShared") ?? "Shared research plans",
      sub: t("planSharedSub") ?? "When someone shares a plan publicly.",
    },
    {
      key: "emailDigest",
      label: t("emailDigest") ?? "Weekly email digest",
      sub: t("emailDigestSub") ?? "A roundup of activity, every Monday.",
    },
  ]

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Notification preferences</h3>
      <p className="mt-1 text-xs text-ink-muted">Choose what shows up in your inbox.</p>
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
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : prefs[key] ? "On" : "Off"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
