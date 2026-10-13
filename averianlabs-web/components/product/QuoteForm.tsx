"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { toast } from "sonner"

export function QuoteForm({ sku, locale }: { sku: string; locale: string }) {
  const t = useTranslations("research")
  const [pending, setPending] = useState(false)
  const [received, setReceived] = useState(false)
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  return (
    <section className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-5">
      <h3 className="font-display text-lg font-semibold">{t("quote")}</h3>
      <p className="mt-2 text-sm text-ink-muted">{t("quoteDescription")}</p>
      {received ? (
        <p role="status" className="mt-4 text-sm">
          {t("quoteReceivedDescription")}
        </p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (pending) return
            const data = new FormData(event.currentTarget)
            const payload = {
              sku,
              locale,
              name: String(data.get("name")),
              email: String(data.get("email")),
              organisation: String(data.get("organisation") ?? ""),
              message: String(data.get("message") ?? ""),
            }
            const fingerprint = JSON.stringify(payload)
            if (attempt.current?.fingerprint !== fingerprint)
              attempt.current = { fingerprint, key: crypto.randomUUID() }
            setPending(true)
            try {
              const res = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, requestKey: attempt.current.key }),
              })
              if (!res.ok) throw new Error("quote_not_recorded")
              setReceived(true)
              toast.success(t("quoteReceived"))
            } catch {
              toast.error(t("quoteFailed"))
            } finally {
              setPending(false)
            }
          }}
        >
          <Input
            name="name"
            label={t("quoteName")}
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            name="email"
            label={t("quoteEmail")}
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
          <Input
            name="organisation"
            label={t("quoteOrganisation")}
            autoComplete="organization"
            maxLength={200}
          />
          <Input name="message" label={t("quoteMessage")} maxLength={2000} />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? t("quoteSending") : t("quote")}
          </Button>
        </form>
      )}
    </section>
  )
}
