"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

export function PartnerApplicationForm() {
  const t = useTranslations("partner")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <div className="rounded-[var(--radius)] border border-success/30 bg-success-soft/40 p-6 text-sm">
        <p className="font-semibold text-success">{t("submittedTitle")}</p>
        <p className="mt-1 text-ink-muted">{t("submittedBody")}</p>
      </div>
    )
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)

        setLoading(true)
        try {
          const res = await fetch("/api/partner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgName: formData.get("orgName"),
              contactEmail: formData.get("contactEmail"),
              country: formData.get("country"),
              volume: Number(formData.get("volume")) || undefined,
              useCase: formData.get("useCase") || undefined,
            }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || t("submitError"))
          }

          setSubmitted(true)
          toast.success(t("submitSuccess"))
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("submitErrorGeneric"))
        } finally {
          setLoading(false)
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="orgName" placeholder={t("orgName")} required />
        <Input name="country" placeholder={t("country")} required />
      </div>
      <Input name="contactEmail" type="email" placeholder={t("contactEmail")} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="volume" placeholder={t("volume")} type="number" required />
        <select
          name="useCase"
          className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:outline-none focus:border-accent"
        >
          <option>{t("useCaseResearchLab")}</option>
          <option>{t("useCaseUniversity")}</option>
          <option>{t("useCaseReseller")}</option>
          <option>{t("useCaseClinic")}</option>
        </select>
      </div>
      <textarea
        name="useCaseDetail"
        rows={3}
        placeholder={t("useCaseDetail")}
        className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-subtle focus:border-accent focus:outline-none"
      />
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  )
}
