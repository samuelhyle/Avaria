"use client"

import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { useState } from "react"

/**
 * The newsletter unsubscribe control.
 *
 * An opt-out has to be one click and obvious. The form posts the address and
 * says so plainly, without a page transition.
 */
export function UnsubscribeForm({ locale }: { locale: string }) {
  const t = useTranslations("newsletter")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      })
      if (!response.ok) {
        setError(t("unsubscribeFailed"))
        return
      }
      setDone(true)
    } catch {
      setError(t("unsubscribeFailed"))
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <p
        role="status"
        className="rounded-[var(--radius)] border border-success/30 bg-success-soft p-4 text-sm text-success"
      >
        {t("unsubscribed")}
      </p>
    )

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="block min-w-0 flex-1 text-2xs uppercase tracking-wider text-ink-subtle">
        {t("unsubscribeLabel")}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          aria-label={t("unsubscribeLabel")}
          className="mt-1 h-11 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm outline-none focus-visible:border-accent"
        />
      </label>
      <Button type="submit" disabled={busy || !email.trim()}>
        {t("unsubscribe")}
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  )
}
