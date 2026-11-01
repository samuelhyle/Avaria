import { DocumentAvailabilityPanel } from "@/components/documents/DocumentAvailabilityPanel"
import {
  FinalVolumeDiagram,
  NominalContentDiagram,
  RecordsScopeDiagram,
} from "@/components/media/ResearchDiagrams"
import { Container } from "@/components/ui/Container"
import { buttonClasses } from "@/lib/ui/button-styles"
import { ArrowRight, Beaker, FileCheck2, FlaskConical, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Expanded Quality page. Organises the existing quality narrative into
 * four labeled sections with diagrams, an FAQ pattern, and a tight
 * footer that points readers into the methodology page, the document
 * library and contact.
 *
 * Localized copy now lives under the `experience.*` namespace alongside
 * other editorial surfaces.
 */
export async function QualityStory({ locale }: { locale: string }) {
  const t = await getTranslations("experience")
  const r = await getTranslations("research")
  const sections = [
    {
      key: "identity",
      icon: ShieldCheck,
      title: t("qualitySection1Title"),
      lead: t("qualitySection1Lead"),
      body: t("qualitySection1Body"),
    },
    {
      key: "report",
      icon: FileCheck2,
      title: t("qualitySection2Title"),
      lead: t("qualitySection2Lead"),
      body: t("qualitySection2Body"),
    },
    {
      key: "method",
      icon: FlaskConical,
      title: t("qualitySection3Title"),
      lead: t("qualitySection3Lead"),
      body: t("qualitySection3Body"),
    },
    {
      key: "handling",
      icon: Beaker,
      title: t("qualitySection4Title"),
      lead: t("qualitySection4Lead"),
      body: t("qualitySection4Body"),
    },
  ]
  const faqs = [
    { q: t("qualityFaq1Q"), a: t("qualityFaq1A") },
    { q: t("qualityFaq2Q"), a: t("qualityFaq2A") },
    { q: t("qualityFaq3Q"), a: t("qualityFaq3A") },
    { q: t("qualityFaq4Q"), a: t("qualityFaq4A") },
  ]
  return (
    <Container className="py-8 sm:py-12 lg:py-16">
      <header className="max-w-3xl">
        <p className="mb-3 font-mono text-2xs uppercase tracking-[0.18em] text-accent">
          {r("quality")}
        </p>
        <h1 className="h-sub">{r("qualityTitle")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">{t("qualityHero")}</p>
      </header>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <article
              key={s.key}
              className="flex flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-7"
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent-ink"
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">{s.title}</h2>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-accent">
                {s.lead}
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">{s.body}</p>
            </article>
          )
        })}
      </div>

      <section aria-label={t("referenceDiagrams")} className="mt-14">
        <div className="grid gap-5 lg:grid-cols-3">
          <FinalVolumeDiagram locale={locale} compact />
          <NominalContentDiagram locale={locale} compact />
          <RecordsScopeDiagram locale={locale} compact />
        </div>
      </section>

      <section
        aria-labelledby="quality-faq"
        className="mt-14 rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-6 sm:p-8"
      >
        <header className="mb-6">
          <h2 id="quality-faq" className="text-2xl font-semibold tracking-tight text-ink">
            {t("qualityFaqTitle")}
          </h2>
        </header>
        <dl className="divide-y divide-line">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8"
            >
              <dt className="text-base font-semibold text-ink">{f.q}</dt>
              <dd className="text-base leading-relaxed text-ink-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <DocumentAvailabilityPanel locale={locale} />
      </section>

      <footer className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-sm">
        <Link
          href={`/${locale}/lab-tests`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          {r("methodology")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/${locale}/documents`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          {r("documents")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/${locale}/contact`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          {r("contactTitle")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </Container>
  )
}
