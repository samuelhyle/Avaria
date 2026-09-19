import { Calculator } from "@/components/calculator/Calculator"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("calculator", "/peptide-calculator")

export default async function PeptideCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const _t = await getTranslations({ locale, namespace: "product" })

  return (
    <Container className="py-12 sm:py-16" size="wide">
      <Calculator locale={locale} />
    </Container>
  )
}
