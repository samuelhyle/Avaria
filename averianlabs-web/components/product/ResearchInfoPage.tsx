import { DocumentAvailabilityPanel } from "@/components/documents/DocumentAvailabilityPanel"
import { RecordsScopeDiagram } from "@/components/media/ResearchDiagrams"
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
        <p className="mt-5 max-w-3xl text-base text-ink-muted leading-relaxed">
          {t(`${prefix}Intro`)}
        </p>
        <div
          className={`mt-8 grid gap-5 ${sections.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}
        >
          {sections.map((key) => (
            <section key={key} className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-semibold">{t(`${prefix}${key}Title`)}</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                {t(`${prefix}${key}Body`)}
              </p>
            </section>
          ))}
        </div>
        {prefix === "quality" && <RecordsScopeDiagram locale={locale} className="mt-8" />}
        {["quality", "lab"].includes(prefix) && <DocumentAvailabilityPanel locale={locale} />}
        <div className="mt-6 flex flex-wrap gap-5">
          {!["quality", "lab"].includes(prefix) && (
            <Link
              href={`/${locale}/documents`}
              className="inline-flex min-h-11 items-center text-accent underline underline-offset-4"
            >
              {t("documentsTitle")}
            </Link>
          )}
          <Link
            href={`/${locale}/contact`}
            className="inline-flex min-h-11 items-center text-accent underline underline-offset-4"
          >
            {t("contactTitle")}
          </Link>
        </div>
      </div>
    </Container>
  )
}
