"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type FormEvent, useState } from "react"

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")
    const name = String(form.get("name") ?? "")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined, locale }),
      })

      if (res.status === 409) {
        setError(t("accountExists"))
        setPending(false)
        return
      }
      if (res.status === 429) {
        setError(t("rateLimited"))
        setPending(false)
        return
      }
      if (!res.ok) {
        setError(t("genericError"))
        setPending(false)
        return
      }

      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        setPending(false)
        window.location.assign(`/${locale}/account`)
        return
      }
      window.location.assign(`/${locale}/account`)
    } catch {
      setError(t("genericError"))
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label={t("nameOptional")} name="name" autoComplete="name" maxLength={120} />
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
        {pending ? t("registering") : t("register")}
      </Button>
      <p className="text-xs text-ink-muted">
        {t("haveAccount")}{" "}
        <Link href={`/${locale}/account`} className="text-accent hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  )
}
