"use client"

import { CheckoutSummary } from "@/components/checkout/CheckoutSummary"
import { SecureCheckout } from "@/components/checkout/SecureCheckout"
import { ProductCard } from "@/components/product/ProductCard"
import { TrustStrip } from "@/components/product/TrustStrip"
import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function CartView({ locale }: { locale: string }) {
  const t = useTranslations("cart")
  const items = useCart((s) => s.items)

  if (items.length === 0) {
    const recommended = products.slice(0, 4)
    return (
      <div className="space-y-12">
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line bg-surface py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">{t("empty")}</h2>
          <p className="max-w-md text-sm text-ink-muted text-pretty">{t("emptyDesc")}</p>
          <Button asChild size="lg" className="mt-2">
            <Link href={`/${locale}/shop`}>
              {t("browseCatalog")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <section>
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-display text-xl font-semibold">{t("bestSellers")}</h3>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale as Locale} />
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <CheckoutSummary locale={locale} />
          <SecureCheckout />
        </div>
        <div className="space-y-4">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            {t("continueShopping")}
          </Link>
        </div>
      </div>
      <TrustStrip />
    </div>
  )
}
