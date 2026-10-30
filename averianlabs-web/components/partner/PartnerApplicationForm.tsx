"use client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
export function PartnerApplicationForm() {
  const t = useTranslations("research")
  const locale = useLocale()
  const [state, setState] = useState("idle")
  if (state === "done") return <p role="status">{t("contactPersisted")}</p>
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setState("pending")
        try {
          const res = await fetch("/api/partner", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              orgName: data.get("orgName"),
              contactEmail: data.get("contactEmail"),
              country: data.get("country"),
              volume: data.get("volume") ? Number(data.get("volume")) : undefined,
              useCase: data.get("useCase"),
              locale,
            }),
          })
          setState(res.ok ? "done" : "error")
        } catch {
          setState("error")
        }
      }}
    >
      <Input
        name="orgName"
        label={t("quoteOrganisation").replace(/\s*\([^)]*\)/, "")}
        required
        minLength={2}
        maxLength={200}
        autoComplete="organization"
      />
      <Input
        name="contactEmail"
        type="email"
        label={t("quoteEmail")}
        required
        autoComplete="email"
      />
      <Input
        name="country"
        label={t("country")}
        required
        minLength={2}
        maxLength={100}
        autoComplete="country-name"
      />
      <Input name="volume" type="number" min={0} step={1} label={t("estimatedVolume")} />
      <label className="block text-sm">
        {t("quoteMessage")}
        <textarea
          name="useCase"
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-[var(--radius)] border border-line bg-surface p-3"
        />
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm text-danger">
          {t("requestFailed")}
        </p>
      )}
      <Button type="submit" disabled={state === "pending"} fullWidth>
        {t(state === "pending" ? "quoteSending" : "partnerApply")}
      </Button>
    </form>
  )
}
