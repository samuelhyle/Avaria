import { DocumentList } from "@/components/documents/DocumentList"
import { DocumentState } from "@/components/documents/DocumentState"
import { PdfViewer } from "@/components/documents/PdfViewer"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { getDocumentById, listRecentDocuments, resolveDocumentUrl } from "@/lib/documents/service"
import { socialImagePath } from "@/lib/seo/site-origin"
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
    openGraph: { images: [socialImagePath("document", locale, id)] },
  }
}
export default async function DocumentPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const member = await getCurrentMember().catch(() => null)
  const t = await getTranslations("research")
  const d = await getTranslations("documents")
  const l = await getTranslations("documentLibrary")
  const loaded = await getDocumentById(id, locale, Boolean(member)).then(
    (doc) => ({ ok: true as const, doc }),
    () => ({ ok: false as const, doc: null }),
  )
  if (!loaded.ok)
    return (
      <Container className="py-8 sm:py-12">
        <h1 className="mb-6 text-3xl font-semibold">{t("documentsTitle")}</h1>
        <DocumentState locale={locale} state="unavailable" />
      </Container>
    )
  const doc = loaded.doc
  // Unauthenticated requests do not discover private metadata or whether a private ID exists.
  if (!doc) notFound()
  const fileUrl = await resolveDocumentUrl(doc).catch(() => null)
  const related = doc.productId
    ? await listRecentDocuments({ productId: doc.productId, locale, limit: 8 }).catch(() => null)
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
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-muted">
          {l("originalNotice")}
        </p>
        <dl className="mt-6 grid gap-5 rounded-xl border border-line bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-muted">{l("scope")}</dt>
            <dd className="mt-1 font-medium">
              {l(doc.batchId ? "batchScope" : doc.productId ? "productScope" : "generalScope")}
            </dd>
          </div>
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
          {doc.batchSku && (
            <div>
              <dt className="text-ink-muted">{l("filtersku")}</dt>
              <dd className="mt-1 font-mono">{doc.batchSku}</dd>
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
        <DocumentState locale={locale} state="fileUnavailable" />
      )}
      {related === null ? (
        <div className="mt-10">
          <DocumentState locale={locale} state="unavailable" />
        </div>
      ) : (
        related.some((row) => row.id !== doc.id) && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">{d("otherForProduct")}</h2>
            <DocumentList docs={related.filter((row) => row.id !== doc.id)} locale={locale} />
          </section>
        )
      )}
    </Container>
  )
}
