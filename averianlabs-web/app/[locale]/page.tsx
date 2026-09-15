import { ActivityFeed } from "@/components/activity/activity-feed"
import { NewsletterForm } from "@/components/home/NewsletterForm"
import { NewsletterModal } from "@/components/home/NewsletterModal"
import { ProductCarousel } from "@/components/home/ProductCarousel"
import { PeptideTorusHero } from "@/components/three/PeptideTorusHero"
import { Shop3DCarousel } from "@/components/three/Shop3DCarousel"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { CountUp } from "@/components/ui/CountUp"
import { Reveal } from "@/components/ui/Reveal"
import { CATEGORIES } from "@/lib/products/categories"
import { products as allProducts, getFeaturedProducts } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { makePageMetadata } from "@/lib/seo/metadata"
import {
  ArrowRight,
  Award,
  Check,
  FlaskConical,
  Lock,
  RefreshCw,
  Shield,
  Truck,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import type { CSSProperties } from "react"

export const generateMetadata = makePageMetadata("home", "/")

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "home" })

  const featured = getFeaturedProducts()

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-70" aria-hidden="true" />
        <Container>
          <div className="relative grid min-h-[88vh] items-center gap-8 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div className="relative z-10">
              <Badge tone="accent" size="md" className="mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {t("heroEyebrow")}
              </Badge>
              <h1 className="font-display text-5xl font-semibold tracking-tight text-ink text-balance sm:text-6xl lg:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-muted text-pretty">
                {t("heroSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={`/${locale}/shop`}>
                    {t("ctaShop")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={`/${locale}/blog`}>{t("ctaResearch")}</Link>
                </Button>
              </div>

              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line pt-8">
                {[
                  { k: 98.9, decimals: 1, suffix: "%", v: "Average purity", hue: 214 },
                  { k: 2400, decimals: 0, suffix: "+", v: "Verified labs", hue: 152 },
                  { k: 24, decimals: 0, suffix: "h", v: "EU dispatch", hue: 196 },
                ].map((s) => (
                  <div key={s.v} className="relative">
                    <dt className="relative font-display text-2xl font-semibold text-ink tabular-nums">
                      <span
                        className="hue-dot absolute -top-px left-0 h-0.5 w-8 rounded-full"
                        style={{ "--cat-hue": s.hue } as CSSProperties}
                        aria-hidden
                      />
                      <CountUp end={s.k} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
                    </dt>
                    <dd className="mt-1 text-xs text-ink-muted">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative h-[420px] sm:h-[520px] lg:h-[640px]">
              <PeptideTorusHero products={featured} locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      <section aria-label="trust" className="border-y border-line bg-surface-2/60 py-6">
        <Container>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: t("trustBadge1"), icon: Truck },
              { label: t("trustBadge2"), icon: FlaskConical },
              { label: t("trustBadge3"), icon: Shield },
              { label: t("trustBadge4"), icon: Award },
              { label: t("trustBadge5"), icon: Lock },
              { label: t("trustBadge6"), icon: Check },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 text-ink-muted">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

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
          <Shop3DCarousel products={allProducts} locale={locale} />
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
                <div className="relative rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-lg">
                  <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
                    <div>
                      <div className="font-mono text-xs text-ink-subtle">COA · BPC-2026-04-A</div>
                      <div className="font-display text-lg font-semibold">
                        Certificate of Analysis
                      </div>
                    </div>
                    <Badge tone="success">PASS</Badge>
                  </div>

                  {/* Purity gauge */}
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
                          strokeDasharray={`${99.4 * 0.942} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-accent">99.4</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold">HPLC Purity</p>
                      <p className="text-xs text-ink-muted">Exceeds 98% minimum threshold</p>
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm">
                    {[
                      ["HPLC purity", "99.4%"],
                      ["Endotoxin", "2.1 EU/mg"],
                      ["Mass spec", "Confirmed"],
                      ["Tested at", "Eurofins Biolab"],
                      ["Manufactured", "2026-04-12"],
                      ["Expires", "2028-04-12"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt className="text-ink-muted">{k}</dt>
                        <dd className="font-mono font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <Button asChild variant="outline" fullWidth className="mt-6">
                    <Link href={`/${locale}/lab-tests`}>View full PDF</Link>
                  </Button>
                </div>
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

      <section className="border-y border-line bg-surface py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Badge tone="accent" className="mb-3">
                <RefreshCw className="h-3 w-3" />
                New: subscribe & save
              </Badge>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
                Lock in your batch, save 10%, never run out.
              </h2>
              <p className="mt-3 max-w-2xl text-ink-muted text-pretty">
                Pick any peptide, set a delivery cadence, and we'll reserve the current batch for
                you — dispatched automatically every 4, 8 or 12 weeks. Pause or cancel from your
                account, anytime.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "Priority EU dispatch on every shipment",
                  "Lock-in current batch number",
                  "10% off every vial, no minimum",
                  "Mix and match across the catalog",
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {line}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg">
                <Link href={`/${locale}/shop`} className="mt-6 inline-block">
                  Start a subscription
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-ice-soft p-6">
              <p className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                Example subscription
              </p>
              <p className="mt-2 font-display text-xl font-semibold">
                BPC-157 · 10mg · every 8 weeks
              </p>
              <div className="mt-4 flex items-baseline justify-between border-t border-accent/20 pt-4">
                <span className="text-sm text-ink-muted">Per shipment</span>
                <div className="text-right">
                  <p className="text-xs text-ink-subtle line-through">€48.00</p>
                  <p className="font-display text-2xl font-semibold">€43.20</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-accent/20 pt-3">
                <span className="text-sm text-ink-muted">Annual savings</span>
                <p className="font-display text-base font-semibold text-success">€23.04 / year</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

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

      <section className="pb-32">
        <Container>
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-ice-soft p-10 shadow-sm sm:p-12">
            {/* Decorative gradient */}
            <div
              className="gradient-radial-blue pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("newsletterHeading")}
                </h2>
                <p className="mt-2 text-sm text-ink-muted">{t("newsletterSub")}</p>
              </div>
              <NewsletterForm
                placeholder={t("newsletterPlaceholder")}
                ctaLabel={t("newsletterCta")}
                size="lg"
              />
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
