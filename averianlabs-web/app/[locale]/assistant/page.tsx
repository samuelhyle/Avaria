import { AssistantCanvas } from "@/components/ai/AssistantCanvas"
import { Container } from "@/components/ui/Container"
import { readCalculationHandoff } from "@/lib/calculator-handoff"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "averia" })
  return {
    title: `${t("title")} — AverianLabs`,
    description: t("assistant.description"),
    alternates: { canonical: `/${locale}/assistant` },
  }
}

export default async function AssistantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const query = await searchParams
  const initial = readCalculationHandoff(query)
  const t = await getTranslations({ locale, namespace: "averia.assistant" })
  const initialPrompt = initial
    ? `${t("explainCalculation")} ${JSON.stringify(initial)}`
    : undefined
  return (
    <Container className="py-10">
      <AssistantCanvas locale={locale} initialPrompt={initialPrompt} />
    </Container>
  )
}
