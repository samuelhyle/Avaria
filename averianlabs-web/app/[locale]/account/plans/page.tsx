export const dynamic = "force-dynamic"

import { CreatePlanDialog } from "@/components/research-plans/CreatePlanDialog"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { listPlansForOwner } from "@/lib/research-plans"
import { BookmarkPlus, Calendar, Globe2, Lock, Plus } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "plans" })
  return {
    title: t("title"),
    alternates: { canonical: `/${locale}/account/plans` },
    robots: { index: false, follow: false },
  }
}

export default async function PlansListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const member = await getCurrentMember()
  const plans = member ? await listPlansForOwner(member.id) : []
  const t = await getTranslations("plans")

  return (
    <Container className="py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge tone="muted" size="sm" className="mb-2">
            {t("account.title") ?? "Account"}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        {member ? <CreatePlanDialog locale={locale} /> : null}
      </header>

      {!member ? (
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
          <Lock className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">Sign in to create research plans.</p>
          <Link
            href={`/${locale}/account`}
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Sign in →
          </Link>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center">
          <BookmarkPlus className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/account/plans/${p.id}`}
              className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-base font-semibold text-ink group-hover:text-accent">
                  {p.title || t("untitled")}
                </h3>
                {p.isPublic ? (
                  <Badge tone="success" size="sm">
                    <Globe2 className="h-3 w-3" />
                    {t("publicBadge")}
                  </Badge>
                ) : (
                  <Badge tone="muted" size="sm">
                    <Lock className="h-3 w-3" />
                    {t("privateBadge")}
                  </Badge>
                )}
              </div>
              {p.notes ? <p className="line-clamp-2 text-xs text-ink-muted">{p.notes}</p> : null}
              <div className="mt-auto flex items-center justify-between text-xs text-ink-subtle">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
                <span>{t("itemsCount", { count: p.items.length })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  )
}
