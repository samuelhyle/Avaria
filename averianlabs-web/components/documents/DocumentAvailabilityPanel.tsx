import { listRecentDocuments, resolveDocumentUrl } from "@/lib/documents/service"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
export async function DocumentAvailabilityPanel({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "research" })
  let records: Array<{
    id: string
    title: string
    batchCode: string | null
    version: string
    publishedAt: Date
    url: string
  }> | null
  try {
    const docs = await listRecentDocuments({ locale, limit: 3 })
    records = []
    for (const doc of docs) {
      const url = await resolveDocumentUrl(doc)
      if (url) records.push({ ...doc, url })
    }
  } catch {
    records = null
  }
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">{t("documents")}</h2>
      {!records?.length ? (
        <p className="mt-3 text-sm text-ink-muted">
          {t(records ? "noDocuments" : "documentsUnavailable")}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {records.map((doc) => (
            <li className="py-3" key={doc.id}>
              <a
                className="text-sm text-accent underline"
                href={doc.url}
                target="_blank"
                rel="noreferrer"
              >
                {doc.title}
              </a>
              <p className="mt-1 text-xs text-ink-muted">
                {doc.batchCode} · {doc.version} ·{" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(doc.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href={`/${locale}/coa`} className="text-accent underline">
          {t("viewDocuments")}
        </Link>
        <Link href={`/${locale}/contact`} className="text-accent underline">
          {t("contactTitle")}
        </Link>
      </div>
    </section>
  )
}
