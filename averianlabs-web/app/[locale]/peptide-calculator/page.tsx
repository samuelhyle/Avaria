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
    <Container className="py-16">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Reconstitution calculator
        </h1>
        <p className="mt-3 text-ink-muted">
          Calculate draw volumes, concentrations, and remaining doses for any peptide vial.
        </p>
      </header>

      <Calculator />
    </Container>
  )
}
