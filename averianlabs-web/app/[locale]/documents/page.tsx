import { DocumentList } from "@/components/documents/DocumentList"
import { Container } from "@/components/ui/Container"
import { listRecentDocuments } from "@/lib/documents/service"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "documents" })
  return {
    title: t("title"),
    description: "All COA, SDS, HPLC, METHOD, NMR, SPEC documents across the catalog.",
    alternates: { canonical: `/${locale}/documents` },
  }
}

export default async function DocumentsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("documents")
  const docs = await listRecentDocuments({ limit: 100 })

  return (
    <Container className="py-12">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-subtle">{t("title")}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          All documents
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-muted">
          COAs, SDSs, HPLC traces, method statements, and product specifications — one place to look
          up what's been published across the catalog.
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
          {t("empty")}
        </div>
      ) : (
        <DocumentList
          docs={docs.map((d) => ({
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
      )}
    </Container>
  )
}
