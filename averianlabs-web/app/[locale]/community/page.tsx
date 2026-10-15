export const dynamic = "force-dynamic"
import { ThreadListItem } from "@/components/community/ThreadListItem"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { categoryThreadCounts, listCategories, listThreads } from "@/lib/community/service"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "community" })
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/community` },
  }
}
export default async function CommunityHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, r, query, categories, counts] = await Promise.all([
    getTranslations("community"),
    getTranslations("research"),
    searchParams,
    listCategories(),
    categoryThreadCounts(),
  ])
  const text = typeof query.q === "string" ? query.q.slice(0, 200) : ""
  const category = typeof query.category === "string" ? query.category : ""
  const language = query.language === "fi" || query.language === "en" ? query.language : undefined
  const page = Math.min(500, Math.max(1, Number(query.page) || 1))
  const offset = (Math.trunc(page) - 1) * 20
  const hasFilters = Boolean(text || category || language || query.unanswered === "true")
  const threads = await listThreads({
    query: text,
    categorySlug: category || undefined,
    locale: language,
    unanswered: query.unanswered === "true",
    limit: 21,
    offset,
  })
  const pageLink = (next: number) => {
    const p = new URLSearchParams()
    if (text) p.set("q", text)
    if (category) p.set("category", category)
    if (language) p.set("language", language)
    if (query.unanswered === "true") p.set("unanswered", "true")
    p.set("page", String(next))
    return `/${locale}/community?${p}`
  }
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
            {t("evidenceHeading")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          href={`/${locale}/community/new`}
        >
          {t("newThread")}
        </Link>
      </header>
      <form
        className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_160px_auto]"
        action={`/${locale}/community`}
      >
        <label className="block text-sm font-medium text-ink-muted">
          {t("search")}
          <input
            type="search"
            name="q"
            defaultValue={text}
            placeholder={t("searchPlaceholder")}
            className="mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink"
          />
        </label>
        <label className="block text-sm font-medium text-ink-muted">
          {t("fieldCategory")}
          <select
            name="category"
            defaultValue={category}
            className="mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink"
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option value={c.slug} key={c.id}>
                {t(`${c.nameKey.replace("community.", "")}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-ink-muted">
          {t("language")}
          <select
            name="language"
            defaultValue={language ?? ""}
            className="mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink"
          >
            <option value="">{t("allLanguages")}</option>
            <option value="fi">Suomi</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="unanswered"
              value="true"
              defaultChecked={query.unanswered === "true"}
            />
            {t("unanswered")}
          </label>
          <Button type="submit" size="sm" className="min-h-11">
            {t("search")}
          </Button>
        </div>
      </form>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("recentHeading")}</h2>
          {threads.length ? (
            <div className="space-y-2">
              {threads.slice(0, 20).map((th) => (
                <ThreadListItem
                  key={th.id}
                  locale={locale}
                  t={t as never}
                  thread={{
                    ...th,
                    categorySlug: th.categorySlug ?? "",
                    authorName: th.authorName ?? r("anonymousMember"),
                    authorReputation: th.authorReputation ?? 0,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10">
              <h3 className="text-lg font-semibold">
                {t(hasFilters ? "noResults" : "emptyHeading")}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
                {t(hasFilters ? "noResultsHelp" : "emptyGuide")}
              </p>
              {hasFilters ? (
                <Link
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent underline"
                  href={`/${locale}/community`}
                >
                  {t("clearFilters")}
                </Link>
              ) : (
                <div className="mt-6 border-t border-line pt-5">
                  <h4 className="text-sm font-semibold">{t("questionIdeas")}</h4>
                  <ul className="mt-3 space-y-4 text-sm leading-relaxed text-ink-muted">
                    {(["question", "methods", "document"] as const).map((kind) => (
                      <li key={kind}>
                        <span className="block font-medium text-ink">
                          {t(`type${kind}` as never)}
                        </span>
                        {t(`emptyIdea.${kind}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                className="mt-4 inline-block text-sm text-accent underline"
                href={`/${locale}/community/rules`}
              >
                {t("rulesLink")}
              </Link>
            </div>
          )}
          <nav className="mt-5 flex justify-between gap-3" aria-label={t("pagination")}>
            {page > 1 ? (
              <Link className="text-sm text-accent underline" href={pageLink(page - 1)}>
                {t("previous")}
              </Link>
            ) : (
              <span />
            )}
            {threads.length > 20 && (
              <Link className="text-sm text-accent underline" href={pageLink(page + 1)}>
                {t("next")}
              </Link>
            )}
          </nav>
        </section>
        <aside className="space-y-4">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-base font-semibold">{t("hubHeading")}</h2>
            <ul className="divide-y divide-line">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/${locale}/community?category=${c.slug}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent"
                  >
                    <span>{t(c.nameKey.replace("community.", "") as never)}</span>
                    {(counts.get(c.id) ?? 0) > 0 && (
                      <span className="font-mono text-xs text-ink-muted">{counts.get(c.id)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">{t("evidenceHeading")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r("moderationBody")}</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-accent">
              <Link href={`/${locale}/community/rules`}>{t("rulesLink")} →</Link>
              <Link href={`/${locale}/lab-tests`}>{r("methodology")} →</Link>
              <Link href={`/${locale}/coa`}>{r("viewDocuments")} →</Link>
            </div>
          </section>
        </aside>
      </div>
    </Container>
  )
}
