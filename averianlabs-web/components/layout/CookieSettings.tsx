"use client"
import { useTranslations } from "next-intl"
export function CookieSettings() {
  const t = useTranslations("research")
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cookie-settings"))}
      className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
    >
      {t("cookieSettings")}
    </button>
  )
}
