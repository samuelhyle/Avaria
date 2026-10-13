import { Container } from "@/components/ui/Container"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export async function ResearchInfoPage({
  locale,
  prefix,
  sections,
}: { locale: string; prefix: string; sections: string[] }) {
  const t = await getTranslations({ locale, namespace: "research" })
  return (
    <Container className="py-16">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold">{t(`${prefix}Title`)}</h1>
        <p className="mt-5 text-ink-muted leading-relaxed">{t(`${prefix}Intro`)}</p>
        {sections.map((key) => (
          <section key={key} className="mt-10">
            <h2 className="font-display text-2xl font-semibold">{t(`${prefix}${key}Title`)}</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{t(`${prefix}${key}Body`)}</p>
          </section>
        ))}
        <div className="mt-10 flex flex-wrap gap-5">
          <Link href={`/${locale}/coa`} className="text-accent underline">
            {t("viewDocuments")}
          </Link>
          <Link href={`/${locale}/contact`} className="text-accent underline">
            {t("quote")}
          </Link>
        </div>
      </div>
    </Container>
  )
}
