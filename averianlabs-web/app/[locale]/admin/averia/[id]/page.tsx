/**
 * /admin/averia/[id] — full transcript view + draft-reply helper.
 *
 * Server-rendered shell + client island for the draft-reply form. Admin-only.
 */

import { DraftReplyPanel } from "@/components/admin/DraftReplyPanel"
import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { aiConversations, aiMessages } from "@/db/schema/ai"
import { getAdminOrNull } from "@/lib/admin"
import { db } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"


export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin · Averia transcript",
    robots: { index: false, follow: false },
  }
}

export default async function AveriaTranscriptPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  setRequestLocale(locale)
  const _t = await getTranslations("admin")

  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Home
          </Link>
        </ForbiddenShell>
      </Container>
    )
  }

  const convRows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, id))
    .limit(1)
  const conversation = convRows[0]
  if (!conversation) {
    return (
      <Container className="py-10">
        <AdminShell member={member}>
          <p className="text-sm text-ink-muted">Conversation not found.</p>
          <Link
            href={`/${locale}/admin/averia`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Back to list
          </Link>
        </AdminShell>
      </Container>
    )
  }

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt))

  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const draftSubject = conversation.title ?? lastUser?.content.slice(0, 80) ?? "Support request"

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <Link href={`/${locale}/admin/averia`} className="text-sm text-ink-muted hover:text-ink">
            ← All conversations
          </Link>
          <Badge tone="warn" size="sm">
            Admin · Transcript
          </Badge>
          <span className="font-mono text-2xs text-ink-subtle">{conversation.id}</span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
              Transcript · {messages.length} messages
            </h2>
            <ol className="space-y-4">
              {messages.map((m) => {
                const meta = m.metadata as {
                  toolTrace?: unknown[]
                  proposedActions?: unknown[]
                  citations?: unknown[]
                } | null
                return (
                  <li key={m.id} className="border-b border-line/50 pb-3 last:border-b-0">
                    <div className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          m.role === "user"
                            ? "bg-accent"
                            : m.role === "assistant"
                              ? "bg-success"
                              : "bg-ink-subtle"
                        }`}
                        aria-hidden
                      />
                      <span className="font-medium uppercase tracking-wider">{m.role}</span>
                      <span>·</span>
                      <span>{new Date(m.createdAt).toLocaleString(locale)}</span>
                      {m.latencyMs > 0 ? (
                        <>
                          <span>·</span>
                          <span>{m.latencyMs}ms</span>
                        </>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-ink">{m.content}</p>
                    {meta?.toolTrace &&
                    Array.isArray(meta.toolTrace) &&
                    meta.toolTrace.length > 0 ? (
                      <details className="mt-2 text-xs text-ink-muted">
                        <summary className="cursor-pointer text-accent">
                          {meta.toolTrace.length} tool call(s)
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-2xs">
                          {JSON.stringify(meta.toolTrace, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                    {meta?.proposedActions &&
                    Array.isArray(meta.proposedActions) &&
                    meta.proposedActions.length > 0 ? (
                      <details className="mt-2 text-xs text-ink-muted">
                        <summary className="cursor-pointer text-accent">
                          {meta.proposedActions.length} proposed action(s)
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-2xs">
                          {JSON.stringify(meta.proposedActions, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>

          <aside>
            <DraftReplyPanel
              ticketId={conversation.id}
              locale={locale}
              subject={draftSubject}
              body={lastUser?.content ?? ""}
              transcript={messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }))}
            />
          </aside>
        </div>
      </AdminShell>
    </Container>
  )
}
