import { AssistantCanvas } from "@/components/ai/AssistantCanvas"
import { Container } from "@/components/ui/Container"
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
    description:
      "Ask Averia, our AI research concierge, about catalog products, COAs, reconstitution, and orders.",
    alternates: { canonical: `/${locale}/assistant` },
  }
}

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-10">
      <AssistantCanvas locale={locale} />
    </Container>
  )
}
