import { listRecentDocuments } from "@/lib/documents/service"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { DocumentList } from "./DocumentList"
import { DocumentState } from "./DocumentState"
export async function DocumentAvailabilityPanel({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "research" })
  const records = await listRecentDocuments({ locale, limit: 3 }).catch(() => null)
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">{t("documentsTitle")}</h2>
      {records === null ? (
        <DocumentState locale={locale} state="unavailable" />
      ) : records.length === 0 ? (
        <DocumentState locale={locale} state="empty" />
      ) : (
        <DocumentList docs={records} locale={locale} />
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/${locale}/documents`}
          className="inline-flex min-h-11 items-center text-accent underline underline-offset-4"
        >
          {t("documentsTitle")}
        </Link>
      </div>
    </section>
  )
}
