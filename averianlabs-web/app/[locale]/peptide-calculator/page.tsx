import { Calculator } from "@/components/calculator/Calculator"
import { Container } from "@/components/ui/Container"
import { readCalculationHandoff } from "@/lib/calculator-handoff"
import { getCurrentMember } from "@/lib/community/auth"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"
export const generateMetadata = makePageMetadata("calculator", "/peptide-calculator")
export default async function PeptideCalculatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, query, member] = await Promise.all([
    getTranslations({ locale, namespace: "research" }),
    searchParams,
    getCurrentMember(),
  ])
  let initial = readCalculationHandoff(query)
  let source: { sku: string; name: string; nominalMassMg: number } | undefined
  if (typeof query.sku === "string") {
    const products = await getStorefrontCatalogue()
    const product = products.find((p) => p.vials.some((v) => v.sku === query.sku))
    const vial = product?.vials.find((v) => v.sku === query.sku)
    if (product && vial && ["mg", "mcg", "g"].includes(vial.sizeUnit)) {
      source = {
        sku: vial.sku,
        name: (product.translations?.[locale as "en" | "fi"] ?? product.defaultTranslation).name,
        nominalMassMg:
          vial.sizeValue * (vial.sizeUnit === "mcg" ? 0.001 : vial.sizeUnit === "g" ? 1000 : 1),
      }
      initial ??= {
        mode: "concentration",
        massMg: source.nominalMassMg,
      }
    }
  }
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-6 max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
          {t("tools")}
        </p>
        <h1 className="h-page">{t("calculator")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("calculatorNotice")}</p>
      </header>
      <Calculator initial={initial} source={source} isAuthed={!!member} />
    </Container>
  )
}
