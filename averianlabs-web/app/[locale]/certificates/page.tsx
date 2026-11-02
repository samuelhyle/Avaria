import { CertificateCard } from "@/components/certificates/CertificateCard"
import { Container } from "@/components/ui/Container"
import { EmptyState } from "@/components/ui/EmptyState"
import {
  CERTIFICATE_PAGE_SIZE,
  certificateLibraryHref,
  hasCertificateFilters,
  readCertificateFilters,
} from "@/lib/certificates/library"
import { listBatchCertificates, listCertificateLabs } from "@/lib/certificates/service"
import { makePageMetadata } from "@/lib/seo/metadata"
import { FileSearch } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const dynamic = "force-dynamic"

export const generateMetadata = makePageMetadata("certificates", "/certificates")

export default async function CertificatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "certificates" })
  const filters = readCertificateFilters(await searchParams)

  const [result, labs] = await Promise.all([
    listBatchCertificates(filters, locale).then(
      (value) => ({ ok: true as const, ...value }),
      () => ({ ok: false as const, certificates: [], total: 0 }),
    ),
    listCertificateLabs(locale).catch(() => [] as string[]),
  ])

  const hasFilters = hasCertificateFilters(filters)
  const start = (filters.page - 1) * CERTIFICATE_PAGE_SIZE
  const shown = result.certificates.slice(start, start + CERTIFICATE_PAGE_SIZE)

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-7 max-w-3xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">{t("intro")}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-subtle">{t("scope")}</p>
      </header>

      <form
        action={`/${locale}/certificates`}
        className="mb-8 rounded-xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-2">
            <span className="text-sm font-medium">{t("filterq")}</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              maxLength={150}
              placeholder={t("placeholderq")}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("filterproduct")}</span>
            <input
              type="search"
              name="product"
              defaultValue={filters.product}
              maxLength={150}
              placeholder={t("placeholderproduct")}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("filtersku")}</span>
            <input
              type="search"
              name="sku"
              defaultValue={filters.sku}
              maxLength={150}
              placeholder={t("placeholdersku")}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("filterbatch")}</span>
            <input
              type="search"
              name="batch"
              defaultValue={filters.batch}
              maxLength={150}
              placeholder={t("placeholderbatch")}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("filterlab")}</span>
            <select
              name="lab"
              defaultValue={filters.lab}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            >
              <option value="">{t("anyLab")}</option>
              {labs.map((lab) => (
                <option key={lab} value={lab}>
                  {lab}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t("filterpurity")}</span>
            <input
              type="number"
              name="minPurity"
              min={0}
              max={100}
              step={0.1}
              defaultValue={filters.minPurity ?? ""}
              placeholder={t("placeholderpurity")}
              className="mt-2 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent"
          >
            {t("search")}
          </button>
          {hasFilters ? (
            <Link
              href={`/${locale}/certificates`}
              className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
            >
              {t("clear")}
            </Link>
          ) : null}
          <p className="text-sm leading-relaxed text-ink-muted">{t("publicScope")}</p>
        </div>
      </form>

      {!result.ok ? (
        <EmptyState
          icon={FileSearch}
          title={t("unavailableTitle")}
          description={t("unavailableBody")}
        />
      ) : result.certificates.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={hasFilters ? t("noMatchTitle") : t("emptyTitle")}
          description={hasFilters ? t("noMatchBody") : t("emptyBody")}
          action={
            hasFilters ? (
              <Link
                href={`/${locale}/certificates`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink"
              >
                {t("clear")}
              </Link>
            ) : (
              <Link
                href={`/${locale}/contact`}
                className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent"
              >
                {t("requestOne")}
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-muted">{t("resultCount", { count: result.total })}</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
            {shown.map((certificate) => (
              <li key={certificate.batchId} className="min-w-0">
                <CertificateCard certificate={certificate} locale={locale} />
              </li>
            ))}
          </ul>
          <nav
            aria-label={t("pagination")}
            className="mt-8 flex items-center justify-between gap-4 text-sm"
          >
            {filters.page > 1 ? (
              <Link
                href={certificateLibraryHref(locale, filters, filters.page - 1)}
                className="inline-flex min-h-11 items-center text-accent underline"
              >
                {t("previous")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-muted">{t("page", { page: filters.page })}</span>
            {result.certificates.length > start + CERTIFICATE_PAGE_SIZE ? (
              <Link
                href={certificateLibraryHref(locale, filters, filters.page + 1)}
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
