export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { type ModerationItem, ModerationQueue } from "@/components/admin/moderation-queue"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { forumModerationEvents, forumPosts, forumThreads, users } from "@/db/schema"
import { getAdminOrNull } from "@/lib/admin"
import { listOpenReports } from "@/lib/community"
import { db } from "@/lib/db"
import { and, desc as descFn, inArray, ne } from "drizzle-orm"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Moderation queue · Admin",
    robots: { index: false, follow: false },
  }
}

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")

  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell>
          <Link
            href={`/${locale}/community`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Back to community
          </Link>
        </ForbiddenShell>
      </Container>
    )
  }

  const events = await db
    .select()
    .from(forumModerationEvents)
    .where(
      and(
        inArray(forumModerationEvents.verdict, ["warn", "remove"]),
        // Human verdicts are terminal — reviewed content leaves the queue.
        ne(forumModerationEvents.layer, "human"),
        // Blocked-before-publish entries are audit records, not actionable.
        ne(forumModerationEvents.targetId, "blocked"),
      ),
    )
    .orderBy(descFn(forumModerationEvents.createdAt))
    .limit(100)

  const reports = await listOpenReports(100)

  const postIds = Array.from(
    new Set([
      ...events.filter((e) => e.targetType === "post").map((e) => e.targetId),
      ...reports.map((r) => r.postId),
    ]),
  )
  const posts =
    postIds.length === 0
      ? []
      : await db
          .select({
            id: forumPosts.id,
            body: forumPosts.body,
            threadId: forumPosts.threadId,
            authorId: forumPosts.authorId,
          })
          .from(forumPosts)
          .where(inArray(forumPosts.id, postIds))

  const authorIds = Array.from(
    new Set(posts.map((p) => p.authorId).filter((id): id is string => Boolean(id))),
  )
  const authors =
    authorIds.length === 0
      ? []
      : await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, authorIds))
  const authorById = new Map(authors.map((a) => [a.id, a.name]))

  const threadIds = Array.from(
    new Set([
      ...posts.map((p) => p.threadId),
      ...events.filter((e) => e.targetType === "thread").map((e) => e.targetId),
    ]),
  )
  const threads =
    threadIds.length === 0
      ? []
      : await db
          .select({ id: forumThreads.id, slug: forumThreads.slug, title: forumThreads.title })
          .from(forumThreads)
          .where(inArray(forumThreads.id, threadIds))

  const postById = new Map(posts.map((p) => [p.id, p]))
  const threadById = new Map(threads.map((th) => [th.id, th]))

  const eventItems: ModerationItem[] = events.map((e) => {
    const post = e.targetType === "post" ? postById.get(e.targetId) : null
    const thread =
      e.targetType === "thread"
        ? threadById.get(e.targetId)
        : post
          ? threadById.get(post.threadId)
          : null
    return {
      id: e.id,
      kind: "event",
      targetType: e.targetType,
      targetId: e.targetId,
      layer: e.layer,
      verdict: e.verdict,
      ruleCodes: e.ruleCodes,
      note: e.note,
      createdAt: e.createdAt,
      body: post?.body ?? (e.targetType === "thread" ? (thread?.title ?? null) : null),
      threadSlug: thread?.slug ?? null,
      authorName: post?.authorId ? (authorById.get(post.authorId) ?? null) : null,
    }
  })

  const reportItems: ModerationItem[] = reports.map((r) => {
    const post = postById.get(r.postId)
    const thread = post ? threadById.get(post.threadId) : null
    return {
      id: r.id,
      kind: "report",
      targetType: "post",
      targetId: r.postId,
      layer: "report",
      verdict: "open",
      ruleCodes: null,
      note: r.detail ? `${r.reason} — ${r.detail}` : r.reason,
      createdAt: r.createdAt,
      body: post?.body ?? null,
      threadSlug: thread?.slug ?? null,
      authorName: post?.authorId ? (authorById.get(post.authorId) ?? null) : null,
    }
  })

  const items = [...reportItems, ...eventItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6">
          <Badge tone="warn" size="sm" className="mb-2">
            Admin · Moderation
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("moderation")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Member reports first, then posts flagged by the lexical guard or the LLM moderator.
            Newest first. Click <em>View</em> to inspect the full post body.
          </p>
        </header>

        <ModerationQueue items={items} />
      </AdminShell>
    </Container>
  )
}
