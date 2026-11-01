export const dynamic = "force-dynamic"

import { AiMemoryPanel } from "@/components/account/AIMemoryPanel"
import { GdprPanel } from "@/components/account/GdprPanel"
import { ReferralPanel } from "@/components/account/referral-panel"
import { LoginForm } from "@/components/auth/LoginForm"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { safeReturnPath } from "@/lib/auth/return-path"
import { getCurrentMember } from "@/lib/community"
import { listOrdersForUser } from "@/lib/orders"
import { getRewardsAccount } from "@/lib/referral/service"
import { listPlansForOwner } from "@/lib/research-plans"
import { BookmarkPlus, ChevronRight, FileText, Heart, Package, Settings } from "lucide-react"
import type { Route } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("account")
  const r = await getTranslations("research")
  const tAuth = await getTranslations("auth")
  const member = await getCurrentMember()
  const query = await searchParams
  const returnTo = safeReturnPath(query.returnTo, locale)
  const [plans, orders, rewards] = await Promise.all([
    member ? listPlansForOwner(member.id, locale).catch(() => []) : Promise.resolve([]),
    member ? listOrdersForUser(member.id).catch(() => []) : Promise.resolve([]),
    member ? getRewardsAccount(member.id).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="accent" className="mb-3">
            {t("title")}
          </Badge>
          <h1 className="h-page">
            {member ? `${t("welcome")}, ${member.name ?? ""}` : tAuth("signInTitle")}
          </h1>
          {!member ? (
            <p className="mt-2 max-w-md text-sm text-ink-muted">{tAuth("signInSubtitle")}</p>
          ) : null}
        </div>
        {member ? <SignOutButton locale={locale} /> : null}
      </header>

      {!member ? (
        <div className="max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
          <LoginForm locale={locale} returnTo={returnTo} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Package,
                label: t("orders"),
                count: orders.length,
                href: `/${locale}/account/orders` as Route,
              },
              {
                icon: FileText,
                label: r("documents"),
                count: null,
                href: `/${locale}/documents` as Route,
              },
              {
                icon: Heart,
                label: r("wishlist"),
                count: null,
                href: `/${locale}/wishlist` as Route,
              },
              {
                icon: Settings,
                label: r("notifications"),
                count: null,
                href: `/${locale}/account/notifications` as Route,
              },
            ].map(({ icon: Icon, label, count, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm transition-all hover:border-accent/40 hover:-translate-y-0.5"
              >
                <Icon className="h-5 w-5 text-accent" />
                <p className="mt-3 font-display text-lg font-semibold">{label}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {count !== null ? r("itemsCount", { count }) : ""}
                </p>
              </Link>
            ))}
          </div>

          <section className="mt-12 rounded-[var(--radius-xl)] border border-line bg-surface p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{t("sectionResearchPlans")}</h2>
              <Link
                href={`/${locale}/account/plans`}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                {t("viewPlans")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {plans.length === 0 ? (
              <div className="mt-6 flex items-center justify-between rounded-[var(--radius)] border border-dashed border-line bg-surface-2 p-6">
                <div>
                  <p className="text-sm text-ink-muted">{t("noPlans")}</p>
                  <p className="mt-1 text-xs text-ink-subtle">{r("plansIntro")}</p>
                </div>
                <BookmarkPlus className="h-5 w-5 text-accent" />
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plans.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/${locale}/account/plans/${p.id}`}
                    className="rounded-[var(--radius)] border border-line bg-surface-2 p-4 transition-colors hover:border-accent/40"
                  >
                    <p className="font-medium text-ink">{p.title || r("untitledPlan")}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {r("itemsCount", { count: p.items.length })} ·{" "}
                      {r(p.isPublic ? "publicPlan" : "privatePlan")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-semibold">{t("sectionReferral")}</h2>
            <ReferralPanel
              referralCode={rewards?.referralCode ?? null}
              pointsCents={rewards?.pointsBalance ?? 0}
            />
          </section>

          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-semibold">{t("sectionAi")}</h2>
            <AiMemoryPanel />
          </section>

          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-semibold">{t("sectionGdpr")}</h2>
            <GdprPanel />
          </section>
        </>
      )}
    </Container>
  )
}
