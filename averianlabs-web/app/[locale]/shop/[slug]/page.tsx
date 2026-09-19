// Statically generate every product × locale at build time, then refresh in
// the background every 10 minutes. This is the single largest TTFB win for
// the storefront: product pages no longer hit Postgres on every request.
export const revalidate = 600
// DISABLED_FOR_DEMO_BUILD: export const dynamicParams = true

import { DocumentList } from "@/components/documents/DocumentList"
import { AskAveriaButton } from "@/components/product/AskAveriaButton"
import { FrequentlyBought } from "@/components/product/FrequentlyBought"
import { ProductCard } from "@/components/product/ProductCard"
import { ProductDetailActions } from "@/components/product/ProductDetailActions"
import { ProductFAQ } from "@/components/product/ProductFAQ"
import { ProductGallery } from "@/components/product/ProductGallery"
import { ProductTrustBadges } from "@/components/product/ProductTrustBadges"
import { RecentlyViewed } from "@/components/product/RecentlyViewed"
import { StickyDesktopAtc } from "@/components/product/StickyDesktopAtc"
import { SubscribeSave } from "@/components/product/SubscribeSave"
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { listDocumentsForProductSlug } from "@/lib/documents/service"
import { getProduct, products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { Award, ChevronRight, FlaskConical, Microscope, Sparkles, Truck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateStaticParams() {
  return products.flatMap((p) =>
    ["en", "fi", "de", "sv", "nl"].map((locale) => ({ locale, slug: p.slug })),
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const product = getProduct(slug)
  if (!product) notFound()
  const t = await getTranslations({ locale, namespace: "product" })
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const minVial = product.vials.reduce(
    (min, v) => (v.priceCents < min.priceCents ? v : min),
    product.vials[0]!,
  )
  const totalStock = product.vials.reduce((s, v) => s + v.stockQty, 0)
  const isContact = minVial.contactOnly === true || minVial.priceCents === 0

  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4)

  // Deliberately no `auth()` / member-scoped queries here: they opt the whole
  // route into dynamic rendering and would defeat the ISR config above.
  // Member-aware UI hydrates client-side (ProductDetailActions).
  const productDocs = await listDocumentsForProductSlug(product.slug).catch(() => [])

  return (
    <Container className="py-12">
      <ProductJsonLd
        product={product}
        locale={locale}
        url={`https://averianlabs.eu/${locale}/shop/${product.slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "AverianLabs", href: `/${locale}` },
          { name: "Shop", href: `/${locale}/shop` },
          { name: translation.name, href: `/${locale}/shop/${product.slug}` },
        ]}
      />

      <nav className="mb-6 flex items-center gap-1 text-xs text-ink-muted">
        <Link href={`/${locale}`} className="hover:text-ink">
          AverianLabs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/${locale}/shop`} className="hover:text-ink">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/${locale}/shop?category=${product.category}`}
          className="capitalize hover:text-ink"
        >
          {product.category}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink">{translation.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <ProductGallery product={product} />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="muted" className="mb-2 capitalize">
                {product.category}
              </Badge>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
                {translation.name}
              </h1>
              <p className="mt-1 text-ink-muted">{translation.tagline}</p>
            </div>
            {product.casNumber ? (
              <Badge tone="muted" className="font-mono shrink-0">
                {product.casNumber}
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            {isContact ? (
              <>
                <span className="font-display text-3xl font-semibold">Request quote</span>
                <span className="text-xs text-ink-subtle">Pricing on request</span>
              </>
            ) : (
              <>
                <span className="font-display text-3xl font-semibold">
                  {formatCurrency(minVial.priceCents, "EUR", locale)}
                </span>
                {product.vials.length > 1 ? (
                  <span className="text-xs text-ink-subtle">
                    from · {product.vials.length} sizes
                  </span>
                ) : null}
                <span className="text-xs text-ink-subtle">{t("vatNote")}</span>
              </>
            )}
          </div>

          <div className="mt-4">
            {isContact ? (
              <Badge tone="muted">Contact for current batch availability</Badge>
            ) : totalStock === 0 ? (
              <Badge tone="danger">{t("stockOut")}</Badge>
            ) : totalStock < 25 ? (
              <Badge tone="warn">{t("stockLow", { n: totalStock })}</Badge>
            ) : (
              <Badge tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {t("stockIn")} · ships in 24h
              </Badge>
            )}
          </div>

          <ProductDetailActions product={product} locale={locale} />

          <div className="mt-8">
            <ProductTrustBadges />
          </div>

          {/* Ask Averia CTA */}
          <AskAveriaButton productName={translation.name} />

          <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">Specifications</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {product.casNumber ? <Row k={t("specCas")} v={product.casNumber} /> : null}
              {product.molecularFormula ? (
                <Row k={t("specFormula")} v={product.molecularFormula} mono />
              ) : null}
              {product.molecularWeight ? (
                <Row k={t("specMw")} v={`${product.molecularWeight} g/mol`} />
              ) : null}
              {product.sequence ? <Row k={t("specSequence")} v={product.sequence} mono /> : null}
              <Row k={t("specStorage")} v={product.storageTemp} />
              {product.purityPercent ? (
                <Row k={t("specPurity")} v={`${product.purityPercent}% (HPLC)`} />
              ) : null}
              {product.latestBatch ? (
                <>
                  <Row k={t("batchLabel")} v={product.latestBatch.code} mono />
                  <Row k="Tested at" v={product.latestBatch.lab} />
                  <Row
                    k="Manufactured"
                    v={formatDate(product.latestBatch.manufacturedAt, locale)}
                  />
                  <Row k="Expires" v={formatDate(product.latestBatch.expiresAt, locale)} />
                  <Row
                    k="Endotoxin"
                    v={`${product.latestBatch.endotoxinEUPerMg.toFixed(2)} EU/mg`}
                  />
                </>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <FrequentlyBought product={product} locale={locale} />

        <SubscribeSave product={product} locale={locale} />

        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Microscope className="h-4 w-4 text-accent" />
              How we verify every batch
            </h2>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                {
                  icon: FlaskConical,
                  t: "HPLC purity",
                  d: "Reverse-phase HPLC against reference standard.",
                },
                {
                  icon: Microscope,
                  t: "Mass-spec identity",
                  d: "ESI-MS confirms molecular weight to 0.1 Da.",
                },
                {
                  icon: Award,
                  t: "Endotoxin panel",
                  d: "LAL kinetic chromogenic; must be <5 EU/mg.",
                },
                {
                  icon: Truck,
                  t: "Cold-chain verified",
                  d: "Temperature log attached to every shipment.",
                },
              ].map(({ icon: Icon, t: lbl, d }) => (
                <li key={lbl} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="leading-relaxed">
                    <p className="font-medium text-ink">{lbl}</p>
                    <p className="text-xs text-ink-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href={`/${locale}/lab-tests`}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Read the full methodology
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              What's in the box
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                "Lyophilized peptide vial",
                "Sterile BAC water (10 mL)",
                "Batch-specific COA",
                "Storage & handling card",
                "Reconstitution protocol",
                "Tamper-evident seal",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2 text-ink-muted">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {productDocs.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">{t("tabCoa")}</h2>
          </div>
          <DocumentList
            docs={productDocs.map((d) => ({
              id: d.id,
              type: d.type,
              title: d.title,
              version: d.version,
              publishedAt: d.publishedAt,
              productSlug: d.productSlug,
              productName: d.productName,
            }))}
            locale={locale}
          />
        </section>
      ) : null}

      <div className="mt-12">
        <ProductFAQ pageUrl={`https://averianlabs.eu/${locale}/shop/${product.slug}`} />
      </div>

      {related.length > 0 ? (
        <section className="mt-24">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">{t("relatedHeading")}</h2>
            <Link
              href={`/${locale}/shop?category=${product.category}`}
              className="hidden text-sm font-medium text-accent hover:underline sm:inline"
            >
              View all in {product.category} →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale as Locale} />
            ))}
          </div>
        </section>
      ) : null}

      <RecentlyViewed products={products} locale={locale} currentSlug={product.slug} />

      <StickyDesktopAtc product={product} locale={locale} />
    </Container>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/50 pb-2 last:border-0">
      <dt className="text-ink-muted">{k}</dt>
      <dd className={mono ? "font-mono text-xs text-right" : "font-medium text-right"}>{v}</dd>
    </div>
  )
}
