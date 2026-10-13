import { ActivityFeed } from "@/components/activity/activity-feed"
import { BrandBlock } from "@/components/home/BrandBlock"
import { Hero3D } from "@/components/home/Hero3D"
import { ProductCarousel } from "@/components/home/ProductCarousel"
import { LazyShop3DCarousel } from "@/components/three/LazyShop3DCarousel"
import { ThreeDShell } from "@/components/three/ThreeDShell"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { Reveal } from "@/components/ui/Reveal"
import { CATEGORIES } from "@/lib/products/categories"
import {
  products as allProducts,
  getFeaturedHeroProducts,
  getFeaturedProducts,
} from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { makePageMetadata } from "@/lib/seo/metadata"
import { ArrowRight, Check, Lock } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import type { CSSProperties } from "react"

export const generateMetadata = makePageMetadata("home", "/")

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "home" })

  const featured = getFeaturedProducts()
  const heroProducts = getFeaturedHeroProducts()

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-60" aria-hidden="true" />
        <Container>
          <div className="relative grid min-h-[88vh] items-center gap-8 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <BrandBlock locale={locale} />
            <Hero3D products={heroProducts} locale={locale} />
          </div>
        </Container>
      </section>

      {/* Trust-badges strip removed (UI-1, CLAIM-01, PAY-01).
          The hero now carries the only evidence-safe text strip ("Every batch is
          third-party tested", "Every COA is publicly archived", "Every order ships
          from the EU"). The detailed trust statements move to /quality and
          /lab-tests, where the actual evidence lives. The unused lucide icons
          below were retained for the calculator CTA section. */}

      <section className="border-b border-line py-24">
        <Container>
          <Reveal>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("threeDHeading")}
                </h2>
                <p className="mt-3 text-ink-muted text-pretty">{t("threeDSub")}</p>
              </div>
              <Link
                href={`/${locale}/shop?view=3d`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
              >
                {t("threeDCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <ThreeDShell className="block" size="carousel">
            <LazyShop3DCarousel products={allProducts} locale={locale} />
          </ThreeDShell>
        </Container>
      </section>

      <section className="py-24">
        <Container>
          <Reveal>
            <ProductCarousel
              products={featured}
              locale={locale as Locale}
              heading={t("featuredHeading")}
              subheading={t("featuredSub")}
            />
          </Reveal>
        </Container>
      </section>

      <section className="border-y border-line bg-surface-2/40 py-24">
        <Container>
          <Reveal>
            <div className="mb-10 max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("categoriesHeading")}
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ key, slug, icon: Icon, hue }, i) => {
              const count = allProducts.filter((p) => p.category === slug).length
              return (
                <Reveal key={key} delay={i * 50}>
                  <Link
                    href={`/${locale}/shop?category=${slug}`}
                    className="hue-tile group relative flex items-start gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-line p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                    style={{ "--cat-hue": hue } as CSSProperties}
                  >
                    {/* Hover glow */}
                    <div className="hue-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="hue-chip relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius)] transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="relative flex-1">
                      <h3 className="font-display text-lg font-semibold">
                        {t(`cat${key.charAt(0).toUpperCase() + key.slice(1)}` as never)}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {t(`cat${key.charAt(0).toUpperCase() + key.slice(1)}Desc` as never)}
                      </p>
                      <span className="mt-2 inline-block font-mono text-3xs text-ink-subtle">
                        {count} {count === 1 ? "product" : "products"}
                      </span>
                    </div>
                    <ArrowRight className="relative h-4 w-4 translate-x-0 text-ink-subtle transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" />
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div>
                <Badge tone="ice" className="mb-4">
                  <Lock className="h-3 w-3" />
                  Full lab transparency
                </Badge>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("labHeading")}
                </h2>
                <p className="mt-4 text-ink-muted text-pretty">{t("labSub")}</p>
                <Link
                  href={`/${locale}/lab-tests`}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Learn about our methodology <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="relative">
                <div
                  className="absolute inset-0 gradient-radial-blue opacity-40 blur-3xl"
                  aria-hidden="true"
                />
                <LabBatchCard featured={featured} locale={locale} />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-gradient-to-br from-accent-soft via-bg to-ice-soft py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("calcHeading")}
            </h2>
            <p className="mt-4 text-ink-muted text-pretty">{t("calcSub")}</p>
            <Button asChild size="lg">
              <Link href={`/${locale}/peptide-calculator`} className="mt-6 inline-block">
                {t("calcCta")}
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface-2/40 py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="max-w-2xl">
              <Reveal>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  From the community
                </h2>
                <p className="mt-3 text-ink-muted">
                  Threads, replies, batch updates, and shared research plans from the AverianLabs
                  community.
                </p>
              </Reveal>
            </div>
            <ActivityFeed locale={locale} />
          </div>
        </Container>
      </section>

      {/* Subscription section dropped per Plan §7 / UI-6.
          Auto-recurring purchase claims cannot ship until inventory reservations,
          batch reservation logic and cold-wallet reconciliation exist. The
          section is preserved below as a comment block for reactivation once
          those gates pass.

          <section className="border-y border-line bg-surface py-20">
            ... (removed)
          </section>
      */}

      <section className="py-24">
        <Container>
          <div className="rounded-[var(--radius-2xl)] bg-ink p-10 text-white sm:p-16">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge tone="ice" className="mb-4 border-white/20 bg-white/10 text-white">
                  For institutions
                </Badge>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("partnerHeading")}
                </h2>
                <p className="mt-4 max-w-lg text-white/70 text-pretty">{t("partnerSub")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Button asChild size="lg" className="bg-white text-ink hover:bg-white/90">
                  <Link href={`/${locale}/partner`}>{t("partnerCta")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Newsletter form removed from the homepage (UI-1, Plan §2.1.3).
          The footer now holds the single newsletter subscription surface. */}
    </>
  )
}

/**
 * Renders the COA summary card from the first featured product that has a
 * real (non-zero purity) active batch. If no featured product carries a real
 * batch, renders an empty state pointing to the Lab Tests page.
 *
 * Previously this card hard-coded a fake BPC-157 batch with "99.4%" purity
 * and "Eurofins Biolab" — superseded by real data per Plan §5 / DATA-01.
 */
async function LabBatchCard({
  featured,
  locale,
}: {
  featured: ReturnType<typeof getFeaturedProducts>
  locale: string
}) {
  const t = await getTranslations({ locale, namespace: "home" })
  const withBatch = featured.find((p) => p.latestBatch && p.latestBatch.hplcPurity > 0)
  if (!withBatch || !withBatch.latestBatch) {
    return (
      <div className="relative rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-lg">
        <div className="font-mono text-xs text-ink-subtle">{t("labBatchCode")}</div>
        <div className="mt-2 font-display text-lg font-semibold">{t("labEmptyTitle")}</div>
        <p className="mt-3 text-sm text-ink-muted">{t("labEmptyBody")}</p>
        <Button asChild variant="outline" fullWidth className="mt-6">
          <Link href={`/${locale}/lab-tests`}>{t("labViewCta")}</Link>
        </Button>
      </div>
    )
  }

  const batch = withBatch.latestBatch
  const translation = withBatch.translations?.[locale as Locale] ?? withBatch.defaultTranslation
  const purity = batch.hplcPurity

  return (
    <div className="relative rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-lg">
      <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
        <div>
          <div className="font-mono text-xs text-ink-subtle">
            {t("labBatchCode")} · {batch.code}
          </div>
          <div className="font-display text-lg font-semibold">{translation.name}</div>
        </div>
        <Badge tone="success">{purity >= 98 ? t("labPass") : t("labReview")}</Badge>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-[var(--radius)] bg-surface-2/60 p-4">
        <div className="relative h-16 w-16">
          <svg
            viewBox="0 0 36 36"
            className="h-16 w-16 -rotate-90"
            aria-hidden="true"
            focusable="false"
          >
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeDasharray={`${(purity / 100) * 94.2} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-sm font-bold text-accent">{purity.toFixed(1)}</span>
          </div>
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{t("labPurityLabel")}</p>
          <p className="text-xs text-ink-muted">
            {purity >= 98 ? t("labPurityMeta") : t("labPurityBelow")}
          </p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <Row k={t("labRowHplc")} v={`${purity.toFixed(1)}%`} />
        <Row k={t("labRowEndotoxin")} v={`${batch.endotoxinEUPerMg.toFixed(1)} EU/mg`} />
        <Row
          k={t("labRowMassSpec")}
          v={batch.msConfirmed ? t("labMassSpecConfirmed") : t("labMassSpecPending")}
        />
        <Row k={t("labRowTested")} v={batch.lab} />
        <Row k={t("labRowManufactured")} v={batch.manufacturedAt} />
        <Row k={t("labRowExpires")} v={batch.expiresAt} />
      </dl>
      <Button asChild variant="outline" fullWidth className="mt-6">
        <Link href={`/${locale}/lab-tests`}>{t("labViewCta")}</Link>
      </Button>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="font-mono font-medium">{v}</dd>
    </div>
  )
}
