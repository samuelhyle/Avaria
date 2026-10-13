"use client"
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary"
import { SecureCheckout } from "@/components/checkout/SecureCheckout"
import { useCart } from "@/lib/cart/store"
import { useTranslations } from "next-intl"
import Link from "next/link"
export function CartView({ locale }: { locale: string }) {
  const items = useCart((s) => s.items)
  const t = useTranslations("research")
  return (
    <div className="space-y-6">
      {items.length ? (
        <>
          <CheckoutSummary locale={locale} />
          <SecureCheckout />
        </>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line p-12 text-center">
          <h2 className="text-2xl font-semibold">{t("emptyCart")}</h2>
        </div>
      )}
      <Link href={`/${locale}/shop`} className="inline-block text-accent underline">
        {t("browse")}
      </Link>
    </div>
  )
}
