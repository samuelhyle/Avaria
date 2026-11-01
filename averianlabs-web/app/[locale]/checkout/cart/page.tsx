import { CartView } from "@/components/cart/CartView"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { toClientCatalogue } from "@/lib/products/client-catalogue"
import { storefrontProducts } from "@/lib/products/storefront"
import type { Locale } from "@/lib/products/types"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const dynamic = "force-dynamic"

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "cart" })
  // The cart replaces the layout's catalogue provider with its own, so the
  // catalogue has to be trimmed here as well. Untrimmed, this route shipped
  // the full catalogue — every locale's translation and every batch record —
  // to the browser.
  const products = toClientCatalogue(
    storefrontProducts(await getStorefrontCatalogue()),
    locale as Locale,
  )
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        {/*
          The cart sits before the four checkout steps rather than being one
          of them, so it is not numbered. The stepper below starts at "Email".
        */}
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-accent">
          {t("reviewLabel")}
        </p>
        <h1 className="mt-2 h-page">{t("title")}</h1>
        <p className="mt-2 text-base text-ink-muted">{t("subtitle")}</p>
      </header>
      <div className="mt-8">
        <CartView locale={locale} initialProducts={products} />
      </div>
    </div>
  )
}
