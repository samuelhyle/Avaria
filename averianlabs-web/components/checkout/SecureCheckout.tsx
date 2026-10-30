"use client"
import { useTranslations } from "next-intl"

/**
 * The reassurance panel beside the cart.
 *
 * The copy is about the checkout as a whole, not about a payment form: on the
 * cart page there is no form yet, and promising one that is not there reads
 * as a mistake.
 */
export function SecureCheckout() {
  const t = useTranslations("research")
  const c = useTranslations("cart")
  return (
    <aside className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h3 className="font-semibold">{c("secureCheckout")}</h3>
      <p className="mt-3 text-sm text-ink-muted">{t("checkoutTrust")}</p>
    </aside>
  )
}
