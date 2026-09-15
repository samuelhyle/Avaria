import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { Input } from "@/components/ui/Input"
import {
  CATEGORY_LABELS,
  type GlossaryCategory,
  getGlossaryTermsByCategory,
  listGlossaryTerms,
} from "@/lib/glossary"
import { BookText, Search } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "glossary" })
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/glossary` },
  }
}

export default async function GlossaryIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("glossary")

  const [grouped, all] = await Promise.all([getGlossaryTermsByCategory(), listGlossaryTerms()])

  const totalCount = all.length
  const categories = Object.keys(grouped) as GlossaryCategory[]

  return (
    <Container className="py-12">
      <header className="mb-10 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <BookText className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">{t("subtitle")}</p>
          <p className="mt-2 text-xs text-ink-subtle">
            {totalCount} {totalCount === 1 ? "term" : "terms"}
          </p>
        </div>
      </header>

      {totalCount === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <aside className="space-y-2 text-sm md:sticky md:top-20 md:self-start">
            {categories.map((cat) =>
              grouped[cat].length === 0 ? null : (
                <a
                  key={cat}
                  href={`#cat-${cat}`}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <span className="font-medium text-ink">{CATEGORY_LABELS[cat]}</span>
                  <Badge tone="muted" size="sm">
                    {grouped[cat].length}
                  </Badge>
                </a>
              ),
            )}
          </aside>

          <div className="space-y-10">
            {categories.map((cat) =>
              grouped[cat].length === 0 ? null : (
                <section key={cat} id={`cat-${cat}`}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {grouped[cat].map((term) => (
                      <Link
                        key={term._id}
                        href={`/${locale}/glossary/${term.slug}`}
                        className="group rounded-[var(--radius)] border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-ink group-hover:text-accent">
                            {term.term}
                          </h3>
                          {term.synonyms && term.synonyms.length > 0 ? (
                            <span className="font-mono text-3xs text-ink-subtle">
                              {term.synonyms.slice(0, 2).join(" · ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                          {term.shortDefinition}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        </div>
      )}
    </Container>
  )
}
