import { DocumentList } from "@/components/documents/DocumentList"
import { DocumentState } from "@/components/documents/DocumentState"
import { Container } from "@/components/ui/Container"
import { DOCUMENT_TYPES } from "@/lib/documents/constants"
import {
  type DocumentSearchParams,
  documentLibraryHref,
  hasDocumentFilters,
  readDocumentFilters,
} from "@/lib/documents/library"
import { listPublicDocumentLibrary } from "@/lib/documents/service"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const dynamic = "force-dynamic"
export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "research" })
  return {
    title: t("documentsTitle"),
    description: t("documentsIntro"),
    alternates: { canonical: `/${locale}/documents` },
  }
}

export default async function DocumentsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<DocumentSearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const r = await getTranslations("research")
  const t = await getTranslations("documentLibrary")
  const query = await searchParams
  const filters = readDocumentFilters(query)
  const result = await listPublicDocumentLibrary(filters, locale).then(
    (docs) => ({ ok: true as const, docs }),
    () => ({ ok: false as const, docs: [] }),
  )
  const hasFilters = hasDocumentFilters(filters)
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-7 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{r("documentsTitle")}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">{r("documentsIntro")}</p>
        <Link
          href={`/${locale}/lab-tests`}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
        >
          {r("methodology")}
        </Link>
      </header>
      <form
        action={`/${locale}/documents`}
        className="mb-7 rounded-xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["q", "product", "sku", "batch"] as const).map((key) => (
            <label
              key={key}
              className={key === "q" ? "block sm:col-span-2 lg:col-span-2" : "block"}
            >
              <span className="text-sm font-medium">{t(`filter${key}`)}</span>
              <input
                type="search"
                name={key}
                defaultValue={filters[key]}
                maxLength={150}
                placeholder={t(`placeholder${key}`)}
                className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-medium">{t("filtertype")}</span>
            <select
              name="type"
              defaultValue={filters.type ?? ""}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            >
              <option value="">{t("allTypes")}</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {r(`docLabels.${type}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent"
          >
            {t("search")}
          </button>
          {hasFilters && (
            <a
              href={`/${locale}/documents`}
              className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
            >
              {t("clear")}
            </a>
          )}
          <p className="text-sm leading-relaxed text-ink-muted">{t("publicScope")}</p>
        </div>
      </form>
      {!result.ok ? (
        <DocumentState locale={locale} state="unavailable" />
      ) : result.docs.length === 0 ? (
        <DocumentState
          locale={locale}
          state={hasFilters || filters.page > 1 ? "noMatch" : "empty"}
          clearHref={hasFilters || filters.page > 1 ? `/${locale}/documents` : undefined}
        />
      ) : (
        <>
          <DocumentList docs={result.docs.slice(0, 20)} locale={locale} />
          <nav
            aria-label={t("pagination")}
            className="mt-6 flex items-center justify-between gap-4 text-sm"
          >
            {filters.page > 1 ? (
              <Link
                href={documentLibraryHref(locale, filters, filters.page - 1)}
                className="inline-flex min-h-11 items-center text-accent underline"
              >
                {t("previous")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-muted">{t("page", { page: filters.page })}</span>
            {result.docs.length > 20 ? (
              <Link
                href={documentLibraryHref(locale, filters, filters.page + 1)}
                className="inline-flex min-h-11 items-center text-accent underline"
              >
                {t("next")}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </Container>
  )
}
