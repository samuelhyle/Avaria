"use client"
import { useTranslations } from "next-intl"
export function SecureCheckout() {
  const t = useTranslations("research")
  return (
    <aside className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h3 className="font-semibold">{t("paymentMethod")}</h3>
      <p className="mt-3 text-sm text-ink-muted">{t("cardProcessing")}</p>
    </aside>
  )
}
