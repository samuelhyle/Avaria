import { HeroStage } from "@/components/home/HeroStage"
import { ProductVisual } from "@/components/product/ProductVisual"
import { Container } from "@/components/ui/Container"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { buttonClasses } from "@/lib/ui/button-styles"
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
   * The price the hero quotes.
   *
   * A product whose price is not published has no price — its catalogue
   * entry carries zero, which is not the same thing. Rendering that zero
   * would put "€0.00" under the store's flagship product, so a product
   * without a published price says that the price is on request instead.
   */
  const heroVial = hero ? defaultVial(hero) : undefined
  const heroPrice =
    heroVial && heroVial.purchaseMode === "direct" && heroVial.priceCents > 0
      ? formatCurrency(heroVial.priceCents, "EUR", l)
      : null

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
            {/* The dot is aligned to the first line rather than the middle of
                the block: on a narrow screen the label wraps to two lines, and
                a centred dot then floats between them. */}
            <p className="inline-flex items-start gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
              <span
                aria-hidden
                className="mt-[0.45em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              {t("heroEyebrow")}
            </p>

            <h1 className="h-display mt-5">{t("heroTitle")}</h1>

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
                  placeholder={ts("searchShort")}
                  className="h-12 w-full rounded-[var(--radius)] border border-line bg-surface pl-10 pr-3 text-sm text-ink shadow-xs outline-none transition-colors placeholder:text-ink-subtle focus:border-accent"
                />
              </div>
              <button type="submit" className={buttonClasses({ variant: "primary", size: "lg" })}>
                {t("ctaSearch")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </form>

            {/* CTAs */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/shop`}
                className={buttonClasses({ variant: "navy", size: "lg" })}
              >
                {t("ctaShop")}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/lab-tests`}
                className={buttonClasses({ variant: "outline", size: "lg" })}
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
            {/* The frame was a square with the renders filling its top half
                and a price card floating in the empty bottom. It is a little
                shorter now and the renders fill it. */}
            <HeroStage className="relative mx-auto aspect-[5/6] w-full max-w-[520px] sm:aspect-square">
              <div
                aria-hidden
                className="absolute inset-[6%] rounded-[2rem] bg-gradient-to-br from-accent-soft via-surface to-ice-soft"
              />
              <div aria-hidden className="absolute inset-[14%] rounded-full bg-white/40 blur-3xl" />

              {spotlight.map((product, index) => {
                const vial = defaultVial(product)
                const position = [
                  "left-[1%] top-[14%] h-[50%] w-[36%] z-20 -rotate-6",
                  "left-[32%] top-[3%] z-30 h-[62%] w-[44%]",
                  "right-[1%] top-[18%] h-[46%] w-[33%] z-20 rotate-6",
                ][index]
                return (
                  <Link
                    key={product.slug}
                    href={`/${locale}/shop/${product.slug}`}
                    className={`store-rise store-stage-item group absolute ${position} transition-transform duration-500 ease-[var(--ease-crystal)] hover:scale-105`}
                    style={
                      {
                        animationDelay: `${140 + index * 130}ms`,
                        // The middle vial sits closest to the viewer and moves
                        // least; the outer two carry the movement.
                        "--stage-depth": index === 1 ? 0.45 : 1.15,
                      } as React.CSSProperties
                    }
                    aria-label={product.translations?.[l]?.name ?? product.defaultTranslation.name}
                  >
                    <ProductVisual product={product} sku={vial.sku} size="lg" />
                  </Link>
                )
              })}

              {/* Price card for the spotlight product */}
              {hero ? (
                <div
                  className="store-rise absolute bottom-0 left-1/2 z-40 w-[86%] max-w-xs -translate-x-1/2 rounded-[var(--radius-lg)] border border-line bg-surface/95 p-3.5 shadow-[var(--shadow-lg)] backdrop-blur-md"
                  style={{ animationDelay: "560ms" }}
                >
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
                      {heroPrice ?? ts("pricingOnRequest")}
                    </p>
                  </div>
                </div>
              ) : null}
            </HeroStage>
          </div>
        </div>
      </Container>
    </section>
  )
}
