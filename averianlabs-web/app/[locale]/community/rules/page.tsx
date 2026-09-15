import { Container } from "@/components/ui/Container"
import { Scale } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "community" })
  return {
    title: t("rulesTitle"),
    description: t("rulesSub"),
    alternates: { canonical: `/${locale}/community/rules` },
  }
}

const RULE_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const

export default async function RulesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("community")

  return (
    <Container size="narrow" className="py-12">
      <header className="mb-8 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t("rulesTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">{t("rulesSub")}</p>
        </div>
      </header>

      <ol className="space-y-3">
        {RULE_KEYS.map((k) => (
          <li key={k} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-ink">{t(`rule${k}` as never)}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t(`rule${k}Body` as never)}</p>
          </li>
        ))}
      </ol>
    </Container>
  )
}
