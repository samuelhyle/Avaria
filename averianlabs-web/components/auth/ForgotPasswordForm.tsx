"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type FormEvent, useState } from "react"

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    const form = new FormData(event.currentTarget)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          locale,
        }),
      })
    } finally {
      setPending(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">{t("forgotSent")}</p>
        <Link
          href={`/${locale}/account`}
          className="inline-block text-sm text-accent hover:underline"
        >
          {t("backToAccount")}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
      />
      <Button type="submit" loading={pending} fullWidth>
        {pending ? t("sending") : t("sendResetLink")}
      </Button>
    </form>
  )
}
