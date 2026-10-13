import { DocumentList } from "@/components/documents/DocumentList"
import { PdfViewer } from "@/components/documents/PdfViewer"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { getDocumentById, listRecentDocuments, resolveDocumentUrl } from "@/lib/documents/service"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; id: string }>
}
export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: "research" })
  const doc = await getDocumentById(id, locale).catch(() => null)
  return {
    title: doc?.title ?? t("documentsTitle"),
    description: t("documentsIntro"),
    alternates: { canonical: `/${locale}/documents/${id}` },
    robots: { index: false, follow: false },
  }
}
export default async function DocumentPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const member = await getCurrentMember().catch(() => null)
  const doc = await getDocumentById(id, locale, Boolean(member)).catch(() => null)
  if (!doc) notFound()
  const t = await getTranslations("research")
  const d = await getTranslations("documents")
  const fileUrl = await resolveDocumentUrl(doc)
  const related = doc.productId
    ? await listRecentDocuments({ productId: doc.productId, locale, limit: 8 }).catch(() => [])
    : []
  return (
    <Container className="py-12">
      <Link
        href={`/${locale}/documents`}
        className="text-sm text-accent underline underline-offset-4"
      >
        ← {t("documentsTitle")}
      </Link>
      <header className="mt-6 mb-8">
        <p className="text-sm text-ink-muted">{t(`docLabels.${doc.type}`)}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{doc.title}</h1>
        <dl className="mt-6 flex flex-wrap gap-8 text-sm">
          <div>
            <dt>{t("version")}</dt>
            <dd>{doc.version}</dd>
          </div>
          <div>
            <dt>{t("published")}</dt>
            <dd>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(doc.publishedAt)}
            </dd>
          </div>
          {doc.batchCode && (
            <div>
              <dt>{t("batch")}</dt>
              <dd className="font-mono">{doc.batchCode}</dd>
            </div>
          )}
          {doc.productSlug && (
            <div>
              <dt>{t("product")}</dt>
              <dd>
                <Link className="text-accent underline" href={`/${locale}/shop/${doc.productSlug}`}>
                  {doc.productName ?? doc.productSlug}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </header>
      {fileUrl ? (
        <>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-[var(--radius)] border border-line bg-surface px-4 py-2 text-sm text-accent underline underline-offset-4"
          >
            {t("download")} ↗
          </a>
          <div className="mt-6">
            <PdfViewer url={fileUrl} title={doc.title} />
          </div>
        </>
      ) : (
        <p role="status" className="rounded-[var(--radius)] border border-line p-6 text-ink-muted">
          {t("fileUnavailable")}
        </p>
      )}
      {related.some((row) => row.id !== doc.id) && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">{d("otherForProduct")}</h2>
          <DocumentList docs={related.filter((row) => row.id !== doc.id)} locale={locale} />
        </section>
      )}
    </Container>
  )
}
