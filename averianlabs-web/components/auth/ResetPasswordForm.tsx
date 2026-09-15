"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type FormEvent, useState } from "react"

export function ResetPasswordForm({
  locale,
  email,
  token,
}: {
  locale: string
  email: string
  token: string
}) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        password: String(form.get("password") ?? ""),
      }),
    })

    setPending(false)
    if (!res.ok) {
      setError(res.status === 400 ? t("resetInvalid") : t("genericError"))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">{t("resetSuccess")}</p>
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
        label={t("newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={200}
        hint={t("passwordHint")}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} fullWidth>
        {pending ? t("resetting") : t("resetPassword")}
      </Button>
    </form>
  )
}
