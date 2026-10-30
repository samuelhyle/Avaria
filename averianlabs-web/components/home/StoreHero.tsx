import { ProductVisual } from "@/components/product/ProductVisual"
import { Container } from "@/components/ui/Container"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowRight, Search, ShieldCheck, Truck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Storefront hero.
 *
 * The promise sits on the left, a search field sits directly under it (so
 * people who already know what they want can skip everything else), and the
 * right side shows the three most wanted products as renders — this is what
 * makes the page read as a shop rather than as a landing page.
 */
export async function StoreHero({
  locale,
  featured,
}: {
  locale: string
  featured: Product[]
}) {
  const [t, ts] = await Promise.all([getTranslations("home"), getTranslations("shop")])
  const l = locale as Locale

  const spotlight = featured.slice(0, 3)
  const hero = spotlight[0]

  /**
   * The purity stat shows a real measured number, so it must come from a
   * product that actually has one. Lab supplies and other non-peptide
   * materials carry no HPLC result, and the first featured product is
   * frequently one of those — the stat then rendered its own label as its
   * value ("HPLC purity / HPLC purity"). Look through the spotlight for a
   * product with a published purity; if there is none, the stat is dropped
   * rather than filled with a number that was never measured.
   */
  const measuredPurity = spotlight.find((product) => product.purityPercent !== undefined)

  const stats = [
    { value: t("statVatValue"), label: t("heroStatVat"), icon: ShieldCheck },
    { value: t("statDeliveryValue"), label: t("heroStatDelivery"), icon: Truck },
    ...(measuredPurity?.purityPercent !== undefined
      ? [
          {
            value: `${measuredPurity.purityPercent}%`,
            label: t("heroStatPurity"),
            icon: ShieldCheck,
          },
        ]
      : []),
  ]

  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div aria-hidden className="gradient-mesh absolute inset-0 opacity-70" />
      <Container className="relative">
        <div className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
          {/* ── Copy ─────────────────────────────────────────────────── */}
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              {t("heroEyebrow")}
            </p>

            <h1 className="mt-5 text-balance break-words hyphens-auto font-display text-[1.9rem] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.4rem]">
              {t("heroTitle")}
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
              {t("heroSubtitle")}
            </p>

            {/* Search */}
            <form
              action={`/${locale}/shop`}
              method="get"
              className="mt-7 flex w-full max-w-lg gap-2"
            >
              <div className="relative flex-1">
                <label htmlFor="hero-search" className="sr-only">
                  {ts("search")}
                </label>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={ts("search")}
                  className="h-12 w-full rounded-[var(--radius)] border border-line bg-surface pl-10 pr-3 text-sm text-ink shadow-xs outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("ctaSearch")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </form>

            {/* CTAs */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/shop`}
                className="inline-flex h-12 items-center gap-2 rounded-[var(--radius)] bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("ctaShop")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/lab-tests`}
                className="inline-flex h-12 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-6 text-sm font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent"
              >
                {t("ctaResearch")}
              </Link>
            </div>

            {/* Stats.
                A <dl> may only group <dt>/<dd> pairs, so the visible label is
                the <dt> itself rather than a separate paragraph. The columns
                are reversed so the number still reads above its label. */}
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-xs text-ink-muted">{stat.label}</dt>
                  <dd className="text-xl font-bold tracking-tight text-ink tabular">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Product renders ──────────────────────────────────────── */}
          <div className="relative min-w-0">
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <div
                aria-hidden
                className="absolute inset-[6%] rounded-[2rem] bg-gradient-to-br from-accent-soft via-surface to-ice-soft"
              />
              <div aria-hidden className="absolute inset-[14%] rounded-full bg-white/40 blur-3xl" />

              {spotlight.map((product, index) => {
                const vial = defaultVial(product)
                const position = [
                  "left-[2%] top-[16%] h-[46%] w-[34%] z-20 -rotate-6",
                  "left-[33%] top-[4%] z-30 h-[58%] w-[42%]",
                  "right-[2%] top-[20%] z-20 h-[42%] w-[31%] rotate-6",
                ][index]
                return (
                  <Link
                    key={product.slug}
                    href={`/${locale}/shop/${product.slug}`}
                    className={`group absolute ${position} transition-transform duration-500 ease-[var(--ease-crystal)] hover:scale-105`}
                    aria-label={product.translations?.[l]?.name ?? product.defaultTranslation.name}
                  >
                    <ProductVisual product={product} sku={vial.sku} size="lg" />
                  </Link>
                )
              })}

              {/* Price card for the spotlight product */}
              {hero ? (
                <div className="absolute bottom-[2%] left-1/2 z-40 w-[86%] max-w-xs -translate-x-1/2 rounded-[var(--radius-lg)] border border-line bg-surface/95 p-3.5 shadow-[var(--shadow-lg)] backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight text-ink">
                        {hero.translations?.[l]?.name ?? hero.defaultTranslation.name}
                      </p>
                      <p className="mt-0.5 text-2xs text-ink-muted">
                        {hero.vials.map((v) => `${v.sizeValue} ${v.sizeUnit}`).join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-bold tracking-tight text-ink tabular">
                      {formatCurrency(defaultVial(hero).priceCents, "EUR", l)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
