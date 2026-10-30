import { DocumentList } from "@/components/documents/DocumentList"
import { DocumentState } from "@/components/documents/DocumentState"
import { ProductCard } from "@/components/product/ProductCard"
import { ProductDetailActions } from "@/components/product/ProductDetailActions"
import { ProductFAQ } from "@/components/product/ProductFAQ"
import { ProductGallery } from "@/components/product/ProductGallery"
import { ProductTabs } from "@/components/product/ProductTabs"
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd"
import { ResearchNotice } from "@/components/store/ResearchNotice"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { documentAppliesToSku } from "@/lib/documents/library"
import { listDocumentsForProductSlug } from "@/lib/documents/service"
import { locales } from "@/lib/i18n/config"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { toClientCatalogue } from "@/lib/products/client-catalogue"
import { defaultVial } from "@/lib/products/selection"
import type { Locale } from "@/lib/products/types"
import { listPlansForOwner } from "@/lib/research-plans"
import { siteOrigin } from "@/lib/seo/site-origin"
import { formatNumber, formatSize } from "@/lib/utils/format"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const product = (await getStorefrontCatalogue()).find((p) => p.slug === slug)
  if (!product) return {}
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  return {
    title: translation.name,
    description: translation.description,
    alternates: {
      canonical: `/${locale}/shop/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/shop/${slug}`])),
    },
  }
}

/**
 * The sections a shared link can open.
 *
 * The keys are what a reader writes in the URL; the values are the tab ids on
 * the product page. "documents" and "records" both mean the batch reports.
 */
const REVIEW_TABS: Record<string, string> = {
  overview: "overview",
  specs: "specs",
  documents: "lab",
  records: "lab",
  coa: "lab",
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ sku?: string | string[]; review?: string | string[] }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const catalogue = await getStorefrontCatalogue()
  const product = catalogue.find((p) => p.slug === slug)
  if (!product) notFound()

  const [t, p, c] = await Promise.all([
    getTranslations({ locale, namespace: "research" }),
    getTranslations({ locale, namespace: "product" }),
    getTranslations({ locale, namespace: "shop" }),
  ])
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const query = await searchParams
  const selectedSku =
    product.vials.find((vial) => vial.sku === query.sku)?.sku ?? defaultVial(product).sku
  const member = await getCurrentMember().catch(() => null)
  const plans = member ? await listPlansForOwner(member.id, locale).catch(() => []) : []
  const productDocs = await listDocumentsForProductSlug(slug, locale).catch(() => null)
  const selectedDocs = productDocs?.filter((doc) => documentAppliesToSku(doc, selectedSku))
  // Related cards are client components, so they are trimmed to the fields a
  // card actually renders before they are serialised into the page payload.
  const related = toClientCatalogue(
    catalogue.filter((p) => p.category === product.category && p.slug !== slug).slice(0, 4),
    locale as Locale,
  )

  /* ── Overview tab ─────────────────────────────────────────────────── */
  const overview = (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{p("overviewTitle")}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">
            {translation.description}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{p("useTitle")}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{p("useBody")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{p("supplyTitle")}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{p("supplyBody")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{p("storageTitle")}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{p("storageBody")}</p>
          {product.storageTemp ? (
            <p className="mt-2 inline-flex items-center rounded-[var(--radius)] bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink">
              {product.storageTemp}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2/60 p-5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{p("purityTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p("purityBody")}</p>
          {product.purityPercent ? (
            <p className="mt-3 text-2xl font-bold tabular tracking-tight text-ink">
              {product.purityPercent}%
              <span className="ml-2 text-xs font-medium text-ink-muted">HPLC</span>
            </p>
          ) : null}
        </div>

        <ResearchNotice variant="block" locale={locale} />

        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{p("sizeTitle")}</h2>
          <ul className="mt-3 space-y-2">
            {product.vials.map((vial) => (
              <li key={vial.sku} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{formatSize(vial, locale)}</span>
                <span className="font-mono text-xs text-ink-muted">{vial.sku}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-ink-subtle">{p("sizeHelper")}</p>
        </div>
      </aside>
    </div>
  )

  /* ── Specifications tab ───────────────────────────────────────────── */
  const specs = product.specificationsVerified ? (
    <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
      {[
        [p("specCas"), product.casNumber],
        [p("specFormula"), product.molecularFormula],
        [
          p("specMw"),
          product.molecularWeight ? formatNumber(product.molecularWeight, locale) : undefined,
        ],
        [p("specSequence"), product.sequence],
        [p("specStorage"), product.storageTemp || t("storagePending")],
        [p("specPurity"), product.purityPercent ? `${product.purityPercent}% HPLC` : undefined],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="min-w-0 border-b border-line pb-3">
            <dt className="text-xs uppercase tracking-wider text-ink-subtle">{label}</dt>
            <dd className="mt-1 break-words font-mono text-sm text-ink">{value}</dd>
          </div>
        ))}
    </dl>
  ) : (
    <p className="text-sm text-ink-muted">{p("specPending")}</p>
  )

  /* ── Lab results tab ──────────────────────────────────────────────── */
  const labResults = (
    <div className="space-y-5">
      {/* The anchor a shared ?review=documents#records link points at. */}
      <div id="records" className="scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{p("batchTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{p("batchBody")}</p>
      </div>
      {productDocs === null ? (
        <DocumentState locale={locale} state="unavailable" />
      ) : selectedDocs?.length ? (
        <DocumentList docs={selectedDocs} locale={locale} />
      ) : (
        <DocumentState locale={locale} state="empty" />
      )}
      <Link
        href={`/${locale}/lab-tests`}
        className="inline-block text-sm font-medium text-accent underline underline-offset-4"
      >
        {t("methodology")}
      </Link>
    </div>
  )

  const tabs = [
    { id: "overview", label: p("tabDescription"), content: overview },
    { id: "specs", label: p("tabSpecs"), content: specs },
    { id: "lab", label: p("tabCoa"), content: labResults },
  ]

  /**
   * A shared link can point at one section of the product page.
   *
   * `?review=documents` opens the panel that carries the certificates rather
   * than the first tab, so a link sent to a colleague lands on the evidence
   * they were asked to look at.
   */
  const reviewTarget = Array.isArray(query.review) ? query.review[0] : query.review
  const reviewTab = REVIEW_TABS[reviewTarget?.toLowerCase() ?? ""]

  return (
    <Container className="py-6 sm:py-10">
      <ProductJsonLd
        product={product}
        locale={locale}
        url={`${siteOrigin()}/${locale}/shop/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: c("title"), href: `/${locale}/shop` },
          {
            name: c(`categories.${product.category}`),
            href: `/${locale}/shop?category=${product.category}`,
          },
          { name: translation.name, href: `/${locale}/shop/${slug}` },
        ]}
      />

      <nav
        aria-label={c("title")}
        className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-muted"
      >
        <Link href={`/${locale}/shop`} className="hover:text-accent hover:underline">
          {c("title")}
        </Link>
        <span aria-hidden className="text-line-strong">
          ›
        </span>
        <Link
          href={`/${locale}/shop?category=${product.category}`}
          className="hover:text-accent hover:underline"
        >
          {c(`categories.${product.category}`)}
        </Link>
        <span aria-hidden className="text-line-strong">
          ›
        </span>
        <span className="text-ink">{translation.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} selectedSku={selectedSku} />
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">
            {c(`categories.${product.category}`)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {translation.name}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">{translation.tagline}</p>

          {product.dataSource === "reference" ? (
            <p
              role="status"
              className="mt-4 rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-sm text-ink-muted"
            >
              {t("referenceNotice")}
            </p>
          ) : null}

          <ProductDetailActions
            product={product}
            locale={locale}
            isAuthed={Boolean(member)}
            plans={plans.map((plan) => ({ id: plan.id, title: plan.title }))}
            initialSku={selectedSku}
          />
        </div>
      </div>

      <div className="mt-14">
        <ProductTabs tabs={tabs} initialTab={reviewTab} />
      </div>

      {!product.checkoutTest ? (
        <div className="mt-14">
          <ProductFAQ pageUrl={`${siteOrigin()}/${locale}/shop/${slug}`} />
        </div>
      ) : null}

      {related.length ? (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-ink">
            {p("relatedHeading")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.slug}>
                <ProductCard product={item} locale={locale as Locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
