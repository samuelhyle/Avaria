"use client"

import { Button } from "@/components/ui/Button"
import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import { useState } from "react"

export function SignOutButton({ locale }: { locale: string }) {
  const t = useTranslations("auth")
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)
    await signOut({ redirect: false })
    window.location.assign(`/${locale}`)
  }

  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={onSignOut}>
      {t("signOut")}
    </Button>
  )
}
