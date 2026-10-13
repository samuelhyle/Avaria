import { CompareTable } from "@/components/product/CompareTable"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("compare", "/compare")

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getStorefrontCatalogue()
  const t = await getTranslations({ locale, namespace: "research" })
  return (
    <Container className="py-12">
      <header className="mb-10 max-w-3xl">
        <Badge tone="accent" className="mb-4">
          {t("specifications")}
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
          {t("compare")}
        </h1>
        <p className="mt-3 text-ink-muted text-pretty">{t("specPending")}</p>
      </header>

      <CompareTable products={products} locale={locale} />
    </Container>
  )
}
