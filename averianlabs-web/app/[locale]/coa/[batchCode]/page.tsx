import { BatchCoaCard } from "@/components/coa/BatchCoaCard"
import { TraceabilityTimeline } from "@/components/coa/TraceabilityTimeline"
import { findBatchByCode } from "@/lib/coa/lookup"
import type { Locale } from "@/lib/products/types"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

// `dynamicParams = true` lets us accept unknown batch codes at request
// time even though we don't enumerate them at build time. We still need
// `generateStaticParams` to satisfy the static-export contract; returning
// an empty array means "build none, serve the rest on demand".
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: string; batchCode: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, batchCode } = await params
  const found = findBatchByCode(decodeURIComponent(batchCode))
  if (!found) {
    const t = await getTranslations({ locale, namespace: "coa" })
    return {
      title: t("notFoundTitle"),
      description: t("notFoundBody"),
    }
  }
  const t = await getTranslations({ locale, namespace: "meta" })
  const productName =
    found.product.translations?.[locale as Locale]?.name ?? found.product.defaultTranslation.name
  return {
    title: `${found.batch.code} · ${productName}`,
    description: t("coa.description"),
  }
}

export default async function BatchCoaPage({ params }: PageProps) {
  const { locale, batchCode } = await params
  setRequestLocale(locale)
  const found = findBatchByCode(decodeURIComponent(batchCode))
  if (!found) notFound()
  const productName =
    found.product.translations?.[locale as Locale]?.name ?? found.product.defaultTranslation.name

  return (
    <div className="pb-20">
      <BatchCoaCard
        product={found.product}
        batch={found.batch}
        locale={locale}
        productName={productName}
      />
      <div className="mx-auto w-full max-w-[var(--container-page)] px-6 lg:px-10">
        <TraceabilityTimeline batch={found.batch} locale={locale} />
      </div>
    </div>
  )
}
