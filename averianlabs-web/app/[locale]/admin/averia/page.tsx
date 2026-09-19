/**
 * /admin/averia — Averia conversation browser.
 *
 * Server component that lists recent conversations with a search box (the
 * search input is a client island). Admin-only via `getAdminOrNull()`.
 */

import { ConversationSearch } from "@/components/admin/ConversationSearch"
import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { aiConversations } from "@/db/schema/ai"
import { getAdminOrNull } from "@/lib/admin"
import { db } from "@/lib/db"
import { and, desc, eq, ilike, or } from "drizzle-orm"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"


export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin · Averia conversations",
    robots: { index: false, follow: false },
  }
}

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; locale?: string }>
}

export default async function AdminAveriaPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { q = "", locale: localeFilter } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("admin")

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

  const filters = []
  if (localeFilter) filters.push(eq(aiConversations.locale, localeFilter))
  if (q.trim()) {
    const needle = `%${q.trim()}%`
    filters.push(
      or(
        ilike(aiConversations.title, needle),
        ilike(aiConversations.anonymousId, needle),
        ilike(aiConversations.id, needle),
      ),
    )
  }

  const rows = await db
    .select()
    .from(aiConversations)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(aiConversations.lastMessageAt))
    .limit(100)

  const conversations = rows.filter((r) => !r.deletedAt)

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6">
          <Badge tone="warn" size="sm" className="mb-2">
            Admin · Averia
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("averiaConversations")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("averiaConversationsSub")}</p>
        </header>

        <ConversationSearch initialQ={q} initialLocale={localeFilter} />

        <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50 text-left text-xs uppercase tracking-wider text-ink-subtle">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Locale</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3">Last message</th>
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    No conversations found.
                  </td>
                </tr>
              ) : (
                conversations.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line/50 last:border-b-0 hover:bg-surface-2/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/admin/averia/${c.id}`}
                        className="font-medium text-ink hover:text-accent"
                      >
                        {c.title ?? c.id.slice(0, 16)}
                      </Link>
                      <p className="font-mono text-2xs text-ink-subtle">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.locale}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.userId ? "user" : c.anonymousId ? "anon" : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.contextKind ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {new Date(c.lastMessageAt).toLocaleString(locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </Container>
  )
}
