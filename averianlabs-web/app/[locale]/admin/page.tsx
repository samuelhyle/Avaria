import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { documents, forumModerationEvents, forumThreads, researchPlans, users } from "@/db/schema"
import { getAdminOrNull } from "@/lib/admin"
import { db } from "@/lib/db"
import { gte, sql } from "drizzle-orm"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin · Dashboard",
    robots: { index: false, follow: false },
  }
}

interface StatCard {
  label: string
  sub: string
  value: number
  href: string
  tone: "default" | "warn" | "success" | "accent"
}

export default async function AdminDashboardPage({
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
            href={`/${locale}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Home
          </Link>
        </ForbiddenShell>
      </Container>
    )
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [pendingModRows, newThreadsRows, recentPlansRows, newMembersRows, totalDocsRows] =
    await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(forumModerationEvents)
        .where(gte(forumModerationEvents.createdAt, dayAgo)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(forumThreads)
        .where(gte(forumThreads.createdAt, dayAgo)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(researchPlans)
        .where(gte(researchPlans.createdAt, weekAgo)),
      db.select({ c: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, weekAgo)),
      db.select({ c: sql<number>`count(*)::int` }).from(documents),
    ])

  const stats: StatCard[] = [
    {
      label: t("statsPendingModeration"),
      sub: t("statsPendingModerationSub"),
      value: pendingModRows[0]?.c ?? 0,
      href: `/${locale}/admin/moderation`,
      tone: "warn",
    },
    {
      label: t("statsNewThreads"),
      sub: t("statsRecentThreadsSub"),
      value: newThreadsRows[0]?.c ?? 0,
      href: `/${locale}/community`,
      tone: "accent",
    },
    {
      label: t("statsRecentPlans"),
      sub: t("statsRecentPlansSub"),
      value: recentPlansRows[0]?.c ?? 0,
      href: `/${locale}/community/activity`,
      tone: "success",
    },
    {
      label: t("statsNewMembers"),
      sub: t("statsNewMembersSub"),
      value: newMembersRows[0]?.c ?? 0,
      href: `/${locale}/admin/audit`,
      tone: "default",
    },
    {
      label: t("statsTotalDocs"),
      sub: t("statsTotalDocsSub"),
      value: totalDocsRows[0]?.c ?? 0,
      href: `/${locale}/admin/documents`,
      tone: "default",
    },
  ]

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6">
          <Badge tone="warn" size="sm" className="mb-2">
            Admin · Dashboard
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("dashboard")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("dashboardSub")}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <p className="text-xs uppercase tracking-wider text-ink-subtle">{s.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink">
                {s.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{s.sub}</p>
              <div className="mt-3 flex items-center text-xs text-accent group-hover:underline">
                View →
              </div>
            </Link>
          ))}
        </div>
      </AdminShell>
    </Container>
  )
}
