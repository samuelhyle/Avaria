import { Container } from "@/components/ui/Container"
import { ArrowRight, BookOpen, Eye, FlaskConical, Sparkles } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Layered About page. Three blocks: a hero promise, a "Why we built
 * this" mission section, a four-card "How we work" principles section
 * and an audience-card. Each section uses the project colour system
 * to maintain consistent rhythm with the home page.
 */
export async function AboutStory({ locale }: { locale: string }) {
  const t = await getTranslations("experience")
  const r = await getTranslations("research")
  const principles = [
    { icon: Eye, title: t("aboutPrinciple1Title"), body: t("aboutPrinciple1Body") },
    { icon: FlaskConical, title: t("aboutPrinciple2Title"), body: t("aboutPrinciple2Body") },
    { icon: BookOpen, title: t("aboutPrinciple3Title"), body: t("aboutPrinciple3Body") },
    { icon: Sparkles, title: t("aboutPrinciple4Title"), body: t("aboutPrinciple4Body") },
  ]
  return (
    <Container className="py-8 sm:py-12 lg:py-16">
      <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-2xs uppercase tracking-[0.18em] text-accent">
            {r("aboutTitle") || "About"}
          </p>
          <h1 className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t("aboutHero")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">{t("aboutBody")}</p>
        </div>
        <aside className="rounded-[var(--radius-lg)] border border-line bg-surface-2/50 p-6">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-subtle">
            {t("aboutAudienceTitle")}
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">{t("aboutAudienceBody")}</p>
          <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink">
            {t("aboutAudienceAudienceList")}
          </p>
        </aside>
      </header>

      <section
        aria-labelledby="about-mission"
        className="mt-16 rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8 lg:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <h2
            id="about-mission"
            className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
          >
            {t("aboutMissionTitle")}
          </h2>
          <p className="text-lg leading-relaxed text-ink-muted">{t("aboutMissionBody")}</p>
        </div>
      </section>

      <section aria-labelledby="about-principles" className="mt-16">
        <header className="mb-8 max-w-2xl">
          <h2
            id="about-principles"
            className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
          >
            {t("aboutPrincipleTitle")}
          </h2>
        </header>
        <ul className="grid gap-5 sm:grid-cols-2">
          {principles.map((p) => {
            const Icon = p.icon
            return (
              <li
                key={p.title}
                className="flex flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-6 transition-colors hover:border-accent/40"
              >
                <span
                  aria-hidden
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent-ink"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <footer className="mt-16 flex flex-wrap gap-3 border-t border-line pt-8 text-sm">
        <Link
          href={`/${locale}/shop`}
          className="inline-flex min-h-10 items-center gap-1 rounded-[var(--radius)] bg-accent px-4 font-semibold text-on-accent shadow-sm transition-colors hover:bg-accent-hover"
        >
          {r("browse")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/${locale}/documents`}
          className="inline-flex min-h-10 items-center gap-1 rounded-[var(--radius)] border border-line bg-surface px-4 font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent"
        >
          {r("documents")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/${locale}/contact`}
          className="inline-flex min-h-10 items-center gap-1 rounded-[var(--radius)] border border-line bg-surface px-4 font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent"
        >
          {r("contactTitle")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </Container>
  )
}
