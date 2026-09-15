"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type FormEvent, useState } from "react"

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    })

    setPending(false)
    if (result?.error) {
      setError(t("invalidCredentials"))
      return
    }
    window.location.assign(`/${locale}/account`)
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
      <Input
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={200}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} fullWidth>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
      <div className="flex items-center justify-between text-xs">
        <Link href={`/${locale}/forgot-password`} className="text-accent hover:underline">
          {t("forgotPassword")}
        </Link>
        <Link href={`/${locale}/register`} className="text-ink-muted hover:text-ink">
          {t("register")}
        </Link>
      </div>
    </form>
  )
}
