import { Container } from "@/components/ui/Container"
import { listDocumentsByType, resolveDocumentUrl } from "@/lib/documents/service"
import { makePageMetadata } from "@/lib/seo/metadata"
import { formatDate } from "@/lib/utils/format"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const generateMetadata = makePageMetadata("coa", "/coa")
export default async function Page({
  params,
  searchParams,
}: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "research" })
  const { q = "" } = await searchParams
  const query = q.trim().toLocaleLowerCase(locale)
  const documents = await listDocumentsByType(["coa"], locale).catch(() => [])
  const rows = (
    await Promise.all(documents.map(async (doc) => ({ doc, url: await resolveDocumentUrl(doc) })))
  ).filter(
    ({ doc, url }) =>
      url &&
      (!query ||
        `${doc.batchCode ?? ""} ${doc.productName ?? ""} ${doc.title}`
          .toLocaleLowerCase(locale)
          .includes(query)),
  )
  return (
    <Container className="py-16">
      <h1 className="font-display text-4xl font-semibold">{t("coaTitle")}</h1>
      <p className="mt-4 max-w-3xl text-ink-muted">{t("coaIntro")}</p>
      <form className="my-8 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          aria-label={t("searchPlaceholder")}
          placeholder={t("searchPlaceholder")}
          className="h-11 min-w-0 flex-1 rounded border border-line bg-surface px-3"
        />
        <button type="submit" className="rounded bg-accent px-4 text-white">
          {t("documents")}
        </button>
      </form>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map(({ doc, url }) => (
            <li key={doc.id} className="rounded border border-line bg-surface p-5">
              <h2 className="font-semibold">{doc.title}</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {doc.productName} · {t("batch")}:{" "}
                <span className="font-mono">{doc.batchCode ?? "—"}</span> ·{" "}
                {formatDate(doc.publishedAt, locale)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4">
                <Link className="text-accent underline" href={`/${locale}/documents/${doc.id}`}>
                  {t("viewDocuments")}
                </Link>
                <a className="text-accent underline" href={url!} target="_blank" rel="noreferrer">
                  {t("download")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded border border-line bg-surface p-6 text-ink-muted">
          {t("noDocuments")}
        </p>
      )}
    </Container>
  )
}
