import { CategoryCard } from "@/components/community/CategoryCard"
import { Leaderboard } from "@/components/community/Leaderboard"
import { ThreadListItem } from "@/components/community/ThreadListItem"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { listCategories, listThreads, topMembers } from "@/lib/community"
import { Plus, ScrollText } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
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
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [categories, recent, leaders] = await Promise.all([
    listCategories(),
    listThreads({ limit: 6 }),
    topMembers(5),
  ])

  const t = await getTranslations("community")

  const counts = new Map<string, number>()
  for (const th of recent) {
    const k = th.categorySlug ?? ""
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  return (
    <Container className="py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <ScrollText className="h-3 w-3" />
            Research-only · moderated
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink-muted">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/community/rules`}>{t("rulesLink")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/${locale}/community/new`}>
              <Plus className="h-4 w-4" />
              {t("newThread")}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink">{t("hubHeading")}</h2>
            <p className="mb-5 text-sm text-ink-muted">{t("hubSub")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map(
                (c: { id: string; slug: string; nameKey: string; descriptionKey: string }) => (
                  <CategoryCard
                    key={c.id}
                    slug={c.slug}
                    nameKey={c.nameKey}
                    descriptionKey={c.descriptionKey}
                    threadCount={counts.get(c.slug) ?? 0}
                    href={`/${locale}/community/${c.slug}`}
                    t={(k) =>
                      k === c.nameKey
                        ? t(`categories.${resolveCategoryKey(c.nameKey)}.name` as never)
                        : t(`categories.${resolveCategoryKey(c.nameKey)}.description` as never)
                    }
                  />
                ),
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{t("recentHeading")}</h2>
              <Link
                href={`/${locale}/community/activity`}
                className="text-sm text-accent hover:underline"
              >
                {t("activityHeading")} →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="rounded-[var(--radius)] border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-muted">
                {t("emptyThreads")}
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map(
                  (th: {
                    id: string
                    slug: string
                    title: string
                    categorySlug: string | null
                    replyCount: number
                    viewCount: number
                    lastActivityAt: Date
                    authorName: string | null
                    authorReputation: number | null
                  }) => (
                    <ThreadListItem
                      key={th.id}
                      locale={locale}
                      thread={{
                        id: th.id,
                        slug: th.slug,
                        title: th.title,
                        categorySlug: th.categorySlug ?? "",
                        replyCount: th.replyCount,
                        viewCount: th.viewCount,
                        lastActivityAt: th.lastActivityAt,
                        authorName: th.authorName ?? "Anonymous",
                        authorReputation: th.authorReputation ?? 0,
                      }}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Leaderboard
            members={leaders.map(
              (m: {
                id: string
                name: string | null
                image: string | null
                reputation: number | null
                reputationTier: string | null
              }) => ({
                id: m.id,
                name: m.name,
                image: m.image,
                reputation: m.reputation ?? 0,
                reputationTier: m.reputationTier ?? "new",
              }),
            )}
          />
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-5 text-xs text-ink-muted">
            <Badge tone="accent" size="sm" className="mb-2">
              Moderation
            </Badge>
            <p>
              Posts are checked by a lexical guard before they go live, then asynchronously reviewed
              by an LLM moderator. A human queue handles edge cases.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  )
}

function resolveCategoryKey(nameKey: string): string {
  const parts = nameKey.split(".")
  return parts[parts.length - 2] ?? ""
}
