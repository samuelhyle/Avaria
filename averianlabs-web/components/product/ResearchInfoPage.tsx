import { DocumentAvailabilityPanel } from "@/components/documents/DocumentAvailabilityPanel"
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
    <Container className="py-8 sm:py-12">
      <div className="max-w-5xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t(`${prefix}Title`)}</h1>
        <p className="mt-5 text-ink-muted leading-relaxed">{t(`${prefix}Intro`)}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {sections.map((key) => (
            <section key={key} className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-semibold">{t(`${prefix}${key}Title`)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {t(`${prefix}${key}Body`)}
              </p>
            </section>
          ))}
        </div>
        {["quality", "lab"].includes(prefix) && <DocumentAvailabilityPanel locale={locale} />}
        <div className="mt-6 flex flex-wrap gap-5">
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
