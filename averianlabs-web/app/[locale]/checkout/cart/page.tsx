import { CartView } from "@/components/cart/CartView"
import { Container } from "@/components/ui/Container"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "cart" })

  return (
    <Container className="py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-ink-muted">{t("subtitle")}</p>
      <div className="mt-10">
        <CartView locale={locale} />
      </div>
    </Container>
  )
}
