export const dynamic = "force-dynamic"

import { PostCard } from "@/components/community/PostCard"
import { ReplyBox } from "@/components/community/ReplyBox"
import { DiscussionForumPostingJsonLd } from "@/components/seo/JsonLd"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import {
  getCategoryBySlug,
  getCurrentMember,
  getReactionsForPosts,
  getThreadBySlug,
  incrementViewCount,
  listPostsForThread,
} from "@/lib/community"
import { ArrowLeft, Globe2 } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const thread = await getThreadBySlug(slug).catch(() => null)
  const t = await getTranslations({ locale, namespace: "community" })
  const member = await getCurrentMember()
  if (
    !thread ||
    (!["active", "locked"].includes(thread.status) &&
      (!member || (member.id !== thread.authorId && !["admin", "moderator"].includes(member.role))))
  )
    return { title: t("notFound"), robots: { index: false, follow: false } }
  if (thread.status === "pending")
    return { title: t("pendingTitle"), robots: { index: false, follow: false } }

  return {
    title: thread.title,
    description: t("metadata", { replies: thread.replyCount, views: thread.viewCount }),
    alternates: { canonical: `/${locale}/community/thread/${slug}` },
    openGraph: {
      title: thread.title,
      type: "article",
      images: [`/api/og/thread/${slug}?locale=${locale}`],
    },
  }
}

export default async function ThreadPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const r = await getTranslations({ locale, namespace: "research" })

  const thread = await getThreadBySlug(slug).catch(() => null)
  const viewer = await getCurrentMember()
  if (
    !thread ||
    thread.status === "removed" ||
    (thread.status === "pending" &&
      (!viewer || (viewer.id !== thread.authorId && !["admin", "moderator"].includes(viewer.role))))
  )
    notFound()

  const [posts, member, cat] = await Promise.all([
    listPostsForThread(slug, thread.id, viewer?.id, viewer?.role),
    getCurrentMember(),
    thread.categorySlug ? getCategoryBySlug(thread.categorySlug) : Promise.resolve(null),
  ])

  if (thread.status !== "pending") void incrementViewCount(thread.id).catch(() => {})

  const ids = posts.map((p) => p.id)
  const reactions = await getReactionsForPosts(ids, member)
  const t = await getTranslations("community")
  const catName = cat ? t(`categories.${resolveCategoryKey(cat.nameKey)}.name` as never) : "—"

  return (
    <Container size="wide" className="py-12">
      {thread.status !== "pending" && (
        <DiscussionForumPostingJsonLd
          title={thread.title}
          url={`https://averianlabs.eu/${locale}/community/thread/${slug}`}
          datePublished={thread.lastActivityAt.toISOString()}
          authorName={thread.authorName ?? r("anonymousMember")}
          commentCount={thread.replyCount}
          locale={locale}
        />
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/community/${thread.categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {catName}
        </Link>
        <Link href={`/${locale}/community`}>
          <Badge tone="muted" size="sm">
            <Globe2 className="h-3 w-3" />
            {t("title")}
          </Badge>
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {thread.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t("threadMeta", {
            replies: thread.replyCount,
            views: thread.viewCount,
            author: thread.authorName ?? r("anonymousMember"),
          })}
        </p>
        {thread.status === "locked" ? (
          <Badge tone="warn" size="sm" className="mt-2">
            {t("locked")}
          </Badge>
        ) : null}
      </header>

      {thread.status === "pending" && (
        <div role="status" className="mb-5 rounded-xl border border-warn/30 bg-warn-soft p-5">
          <h2 className="font-semibold">{t("pendingTitle")}</h2>
          <p className="mt-2 text-sm">{t("pendingHelp")}</p>
          <Link
            className="mt-3 inline-block text-sm text-accent underline"
            href={`/${locale}/contact`}
          >
            {r("contactTitle")}
          </Link>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-line bg-surface p-6 text-center text-sm text-ink-muted">
              {t("emptyReplies")}
            </p>
          ) : (
            posts.map((p, idx) => (
              <PostCard
                key={p.id}
                post={{
                  id: p.id,
                  body: p.body,
                  status: p.status,
                  createdAt: p.createdAt,
                  authorId: p.authorId,
                  authorName: p.authorName ?? r("anonymousMember"),
                  authorReputation: p.authorReputation ?? 0,
                }}
                isOriginal={idx === 0}
                isAuthed={!!member}
                currentUserId={member?.id ?? null}
                reactions={
                  reactions.get(p.id) ?? {
                    helpful: 0,
                    insightful: 0,
                    thanks: 0,
                    mine: { helpful: false, insightful: false, thanks: false },
                  }
                }
              />
            ))
          )}

          {thread.status !== "pending" && (
            <ReplyBox
              threadSlug={thread.slug}
              isAuthed={!!member}
              signInHref={`/${locale}/account`}
              isLocked={thread.status === "locked"}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-xs text-ink-muted">
            <Badge tone="muted" size="sm" className="mb-2">
              {r("moderation")}
            </Badge>
            <p>{r("moderationBody")}</p>
          </div>
          <Link
            href={`/${locale}/community/rules`}
            className="block rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-3 text-sm text-ink hover:border-accent/30"
          >
            {t("rulesLink")} →
          </Link>
        </aside>
      </div>
    </Container>
  )
}

function resolveCategoryKey(nameKey: string): string {
  const parts = nameKey.split(".")
  return parts[parts.length - 2] ?? ""
}
