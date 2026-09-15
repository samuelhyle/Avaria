import { DocumentList } from "@/components/documents/DocumentList"
import { PdfViewer } from "@/components/documents/PdfViewer"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { DOCUMENT_TYPE_DESCRIPTIONS, DOCUMENT_TYPE_LABELS } from "@/lib/documents"
import { getDocumentById, listRecentDocuments, resolveDocumentUrl } from "@/lib/documents/service"
import {
  Activity,
  ArrowLeft,
  Atom,
  Calendar,
  Download,
  ExternalLink,
  FileWarning,
  FlaskConical,
  ListChecks,
  Microscope,
  ShieldAlert,
} from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; id: string }>
}

const TYPE_ICON: Record<string, typeof FlaskConical> = {
  coa: FlaskConical,
  sds: ShieldAlert,
  hplc: Activity,
  method: ListChecks,
  nmr: Atom,
  spec: Microscope,
  msds: FileWarning,
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const doc = await getDocumentById(id).catch(() => null)
  if (!doc) return { title: "Document not found" }
  return {
    title: `${doc.title} (${DOCUMENT_TYPE_LABELS[doc.type]})`,
    description: `${DOCUMENT_TYPE_LABELS[doc.type]} · ${doc.title}`,
    alternates: { canonical: `/${locale}/documents/${id}` },
    robots: { index: false, follow: false },
    openGraph: {
      title: doc.title,
      description: `${DOCUMENT_TYPE_LABELS[doc.type]} · ${doc.title}`,
      type: "article",
      images: [`/api/og/document/${id}`],
    },
  }
}

export default async function DocumentPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const doc = await getDocumentById(id)
  if (!doc) notFound()
  const t = await getTranslations("documents")
  const fileUrl = resolveDocumentUrl(doc)
  const Icon = TYPE_ICON[doc.type] ?? FileWarning

  const sameProduct = doc.productId
    ? await listRecentDocuments({ productId: doc.productId, limit: 8 }).catch(() => [])
    : []
  const otherDocs = sameProduct.filter((d) => d.id !== doc.id)

  return (
    <Container size="wide" className="py-10">
      <div className="mb-6">
        <Link
          href={`/${locale}/lab-tests`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="muted" size="sm" className="mb-2">
            <Icon className="h-3 w-3" />
            {DOCUMENT_TYPE_LABELS[doc.type]}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {doc.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {DOCUMENT_TYPE_DESCRIPTIONS[doc.type]}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-ink-subtle">Version</dt>
              <dd className="mt-0.5 font-mono text-ink">{doc.version}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Published</dt>
              <dd className="mt-0.5 font-mono text-ink">
                {doc.publishedAt.toISOString().slice(0, 10)}
              </dd>
            </div>
            {doc.productSlug ? (
              <div>
                <dt className="text-ink-subtle">Product</dt>
                <dd className="mt-0.5">
                  <Link
                    href={`/${locale}/shop/${doc.productSlug}`}
                    className="text-accent hover:underline"
                  >
                    {doc.productName ?? doc.productSlug}
                  </Link>
                </dd>
              </div>
            ) : null}
            {doc.batchCode ? (
              <div>
                <dt className="text-ink-subtle">Batch</dt>
                <dd className="mt-0.5 font-mono text-ink">{doc.batchCode}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex items-center gap-2">
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("openOriginal")}
              </Button>
            </a>
          ) : null}
          {fileUrl ? (
            <a href={fileUrl} download>
              <Button size="sm">
                <Download className="h-3.5 w-3.5" />
                {t("download")}
              </Button>
            </a>
          ) : (
            <Badge tone="warn" size="sm">
              <FileWarning className="h-3 w-3" />
              File unavailable
            </Badge>
          )}
        </div>
      </header>

      {fileUrl ? (
        <PdfViewer url={fileUrl} title={doc.title} />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-12 text-center text-sm text-ink-muted">
          <FileWarning className="mx-auto mb-3 h-6 w-6 text-warn" />
          This document's file is not currently available. Metadata shown above.
        </div>
      )}

      {otherDocs.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("otherForProduct")}
          </h2>
          <DocumentList docs={otherDocs} locale={locale} />
        </section>
      ) : null}
    </Container>
  )
}
