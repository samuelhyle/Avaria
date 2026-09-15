export const dynamic = "force-dynamic"

import { PlanDetailActions } from "@/components/research-plans/PlanDetailActions"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { getPlanForOwner } from "@/lib/research-plans"
import { ArrowLeft, ExternalLink, Globe2, Lock, X } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const member = await getCurrentMember()
  const plan = member ? await getPlanForOwner(id, member.id).catch(() => null) : null
  if (!plan) return { title: "Plan not found", robots: { index: false, follow: false } }
  return {
    title: plan.title,
    alternates: { canonical: `/${locale}/account/plans/${id}` },
    robots: { index: false, follow: false },
  }
}

export default async function PlanDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const member = await getCurrentMember()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
          <Lock className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">Sign in to view your research plan.</p>
          <Link
            href={`/${locale}/account`}
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </Container>
    )
  }

  const plan = await getPlanForOwner(id, member.id)
  if (!plan) notFound()
  const t = await getTranslations("plans")

  return (
    <Container size="wide" className="py-10">
      <div className="mb-6">
        <Link
          href={`/${locale}/account/plans`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("title")}
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {plan.title || t("untitled")}
            </h1>
            {plan.isPublic ? (
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
          {plan.notes ? (
            <p className="max-w-2xl whitespace-pre-wrap text-sm text-ink-muted">{plan.notes}</p>
          ) : null}
        </div>
        <PlanDetailActions
          planId={plan.id}
          shareSlug={plan.shareSlug}
          isPublic={plan.isPublic}
          title={plan.title}
          locale={locale}
        />
      </header>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
        {t("items")}
      </h2>
      {plan.items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
          {t("noItems")}
        </div>
      ) : (
        <ul className="space-y-2">
          {plan.items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/shop/${it.productSlug}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  {it.productName}
                </Link>
                {it.productTagline ? (
                  <p className="text-xs text-ink-muted">{it.productTagline}</p>
                ) : null}
              </div>
              <Link
                href={`/${locale}/shop/${it.productSlug}`}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                {t("viewOriginal")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
