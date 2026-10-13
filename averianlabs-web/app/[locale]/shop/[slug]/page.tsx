import { DocumentList } from "@/components/documents/DocumentList"
import { ProductCard } from "@/components/product/ProductCard"
import { ProductDetailActions } from "@/components/product/ProductDetailActions"
import { ProductFAQ } from "@/components/product/ProductFAQ"
import { ProductGallery } from "@/components/product/ProductGallery"
import { ProductTrustBadges } from "@/components/product/ProductTrustBadges"
import { Container } from "@/components/ui/Container"
import { listDocumentsForProductSlug } from "@/lib/documents/service"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { Locale } from "@/lib/products/types"
import { formatNumber } from "@/lib/utils/format"
import { locales } from "@/lib/i18n/config"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const product = (await getStorefrontCatalogue()).find((p) => p.slug === slug)
  if (!product) return {}
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  return { title: translation.name, description: translation.description, alternates: { canonical: `/${locale}/shop/${slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/shop/${slug}`])) } }
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const catalogue = await getStorefrontCatalogue()
  const product = catalogue.find((p) => p.slug === slug)
  if (!product) notFound()
  const t = await getTranslations({ locale, namespace: "research" })
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const productDocs = await listDocumentsForProductSlug(slug).catch(() => [])
  const related = catalogue.filter((p) => p.category === product.category && p.slug !== slug).slice(0, 4)
  return <Container className="py-12"><nav aria-label={t("browse")} className="mb-6 flex flex-wrap gap-2 text-sm text-ink-muted"><Link href={`/${locale}/shop`} className="underline">{t("browse")}</Link><span aria-hidden>›</span><Link href={`/${locale}/shop?category=${product.category}`} className="underline">{t(`categories.${product.category}`)}</Link><span aria-hidden>›</span><span>{translation.name}</span></nav><div className="grid gap-10 lg:grid-cols-2"><ProductGallery product={product} /><div><p className="text-sm text-ink-muted">{t(`categories.${product.category}`)}</p><h1 className="mt-2 font-display text-4xl font-semibold">{translation.name}</h1><p className="mt-4 text-ink-muted">{translation.description}</p>{product.dataSource === "reference" ? <p role="status" className="mt-4 rounded border border-line bg-surface-2 p-4 text-sm">{t("referenceNotice")}</p> : null}<ProductDetailActions product={product} locale={locale} /><div className="mt-8"><ProductTrustBadges /></div></div></div><section className="mt-12 rounded-[var(--radius-lg)] border border-line bg-surface p-6"><h2 className="font-display text-2xl font-semibold">{t("specifications")}</h2>{product.specificationsVerified ? <dl className="mt-5 grid gap-3 sm:grid-cols-2">{[["CAS", product.casNumber], [t("formula"), product.molecularFormula], [t("molecularWeight"), product.molecularWeight ? formatNumber(product.molecularWeight, locale) : undefined], [t("sequence"), product.sequence], [t("storage"), product.storageTemp || t("storagePending")]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0 border-b border-line pb-3"><dt className="text-sm text-ink-muted">{label}</dt><dd className="mt-1 break-words font-mono text-sm">{value}</dd></div>)}</dl> : <p className="mt-4 text-ink-muted">{t("specPending")}</p>}</section><section className="mt-12"><h2 className="mb-5 font-display text-2xl font-semibold">{t("documents")}</h2>{productDocs.length ? <DocumentList docs={productDocs.map((d) => ({ id: d.id, type: d.type, title: d.title, version: d.version, publishedAt: d.publishedAt, productSlug: d.productSlug, productName: d.productName }))} locale={locale} /> : <p className="text-ink-muted">{t("noDocuments")}</p>}<Link href={`/${locale}/lab-tests`} className="mt-5 inline-block text-accent underline">{t("methodology")}</Link></section><div className="mt-12"><ProductFAQ pageUrl={`https://averianlabs.eu/${locale}/shop/${slug}`} /></div>{related.length ? <section className="mt-16"><h2 className="mb-6 font-display text-2xl font-semibold">{t("browse")}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.slug} product={p} locale={locale as Locale} />)}</div></section> : null}</Container>
}
