import { DocumentRetry } from "@/components/documents/DocumentRetry"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export async function DocumentState({
  locale,
  state,
  clearHref,
}: {
  locale: string
  state: "empty" | "noMatch" | "unavailable" | "fileUnavailable" | "restricted"
  clearHref?: string
}) {
  const t = await getTranslations({ locale, namespace: "documentLibrary" })
  return (
    <section
      role="status"
      className="rounded-xl border border-dashed border-line bg-surface p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-ink">{t(`${state}Title`)}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{t(`${state}Body`)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {(state === "unavailable" || state === "fileUnavailable") && <DocumentRetry />}
        {clearHref && (
          <a
            href={clearHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
          >
            {t("clear")}
          </a>
        )}
        <Link
          href={`/${locale}/contact`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
        >
          {t("enquiry")}
        </Link>
      </div>
    </section>
  )
}
