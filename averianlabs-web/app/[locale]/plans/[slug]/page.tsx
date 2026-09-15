export const revalidate = 300

// Demo builds skip DB-backed dynamic routes; production runs them on-demand.
export const generateStaticParams = () => []

import { ItemListJsonLd } from "@/components/seo/JsonLd"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getPlanByShareSlug } from "@/lib/research-plans"
import { ArrowLeft, Calendar, ExternalLink, Globe2 } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const plan = await getPlanByShareSlug(slug).catch(() => null)
  if (!plan) return { title: "Plan not found" }
  const t = await getTranslations({ locale, namespace: "plans" })
  return {
    title: t("sharedPlanTitle", { title: plan.title }),
    description: t("sharedPlanSubtitle"),
    alternates: { canonical: `/${locale}/plans/${slug}` },
    openGraph: {
      title: t("sharedPlanTitle", { title: plan.title }),
      description: t("sharedPlanSubtitle"),
      type: "article",
      images: [`/api/og/plan/${slug}`],
    },
  }
}

export default async function PublicPlanPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const plan = await getPlanByShareSlug(slug)
  if (!plan) notFound()
  const t = await getTranslations("plans")

  return (
    <Container size="wide" className="py-10">
      <ItemListJsonLd
        name={plan.title}
        url={`https://averianlabs.eu/${locale}/plans/${slug}`}
        locale={locale}
        items={plan.items.map((it, idx) => ({
          name: it.productName,
          url: `https://averianlabs.eu/${locale}/shop/${it.productSlug}`,
          position: idx + 1,
        }))}
      />
      <div className="mb-6">
        <Link
          href={`/${locale}/community`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("sharedBy")}
        </Link>
      </div>

      <header className="mb-8">
        <Badge tone="success" size="sm" className="mb-3">
          <Globe2 className="h-3 w-3" />
          {t("publicBadge")}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {plan.title || t("untitled")}
        </h1>
        {plan.notes ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-ink-muted">{plan.notes}</p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
          <Calendar className="h-3 w-3" />
          {t("sharedOn", { date: new Date(plan.createdAt).toLocaleDateString() })}
        </p>
      </header>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
        {t("items")}
      </h2>
      {plan.items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("noItems")}</p>
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
