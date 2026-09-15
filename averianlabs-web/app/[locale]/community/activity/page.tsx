export const dynamic = "force-dynamic"

import { ThreadListItem } from "@/components/community/ThreadListItem"
import { Container } from "@/components/ui/Container"
import { listThreads } from "@/lib/community"
import { Activity, Sparkles } from "lucide-react"
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
    title: t("activityHeading"),
    description: t("activitySub"),
    alternates: { canonical: `/${locale}/community/activity` },
  }
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const threads = await listThreads({ limit: 30 })
  const t = await getTranslations("community")

  return (
    <Container className="py-12">
      <header className="mb-8 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t("activityHeading")}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">{t("activitySub")}</p>
        </div>
      </header>

      {threads.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("emptyReplies")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(
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
                t={t as never}
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
    </Container>
  )
}
