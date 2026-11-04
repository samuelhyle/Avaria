import { CountUp } from "@/components/ui/CountUp"
import { listBatchCertificates } from "@/lib/certificates/service"
import { formatDate, formatNumber } from "@/lib/utils/format"
import { ArrowRight, FlaskConical, Sparkles } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * The lab ledger.
 *
 * A shop says "our peptides are 99 % pure". A ledger says which lot was
 * measured, when, by whom, and where its certificate is — the same
 * information, arranged so that it can be read rather than trusted.
 *
 * Every row is a released lot with a published certificate, so every row
 * leads to a document the reader can open. Nothing here is a claim about
 * the shop; it is the shop's own record.
 */

/** How recently a lot has to have been made to count as fresh off the bench. */
const FRESH_DAYS = 21

export async function StoreLedger({ locale }: { locale: string }) {
  const [t, c] = await Promise.all([getTranslations("home"), getTranslations("certificates")])

  const { certificates, total } = await listBatchCertificates(
    { q: "", product: "", sku: "", batch: "", lab: "", minPurity: null, page: 1 },
    locale,
  )
  const recent = certificates.slice(0, 6)
  if (!recent.length) return null

  const freshBefore = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000

  return (
    <section className="border-y border-line bg-surface-2/50">
      <div className="mx-auto w-full max-w-[80rem] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.16em] text-accent">
              <FlaskConical aria-hidden className="h-3.5 w-3.5" />
              {t("ledgerEyebrow")}
            </p>
            <h2 className="mt-3 h-section">{t("ledgerTitle")}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t("ledgerSubtitle")}</p>
            {/*
              The count of published lots. It is the shop's own record rather
              than a claim, so it is worth stating plainly — and it counts up
              as the reader arrives at the ledger.
            */}
            {total > 0 ? (
              <p className="mt-4 inline-flex items-baseline gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5">
                <span className="font-display text-xl font-bold tabular text-ink">
                  <CountUp end={total} />
                </span>
                <span className="text-sm text-ink-muted">{t("ledgerCount")}</span>
              </p>
            ) : null}
          </div>
          <Link
            href={`/${locale}/certificates`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline underline-offset-4"
          >
            {t("ledgerCta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <ol className="mt-9 divide-y divide-line border-y border-line">
          {recent.map((certificate) => {
            const fresh = new Date(certificate.manufacturedAt).getTime() >= freshBefore
            return (
              <li key={certificate.batchId}>
                <Link
                  href={`/${locale}/shop/${certificate.productSlug}`}
                  className="group grid grid-cols-1 items-center gap-x-6 gap-y-1 py-4 transition-colors hover:bg-surface/70 sm:grid-cols-[7.5rem_1fr_auto] sm:px-2"
                >
                  <time
                    dateTime={certificate.manufacturedAt}
                    className="font-mono text-xs tabular text-ink-subtle"
                  >
                    {formatDate(certificate.manufacturedAt, locale)}
                  </time>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {certificate.productName}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-muted">
                      <span className="font-mono">{certificate.batchCode}</span>
                      <span aria-hidden>·</span>
                      <span>{certificate.lab}</span>
                      {fresh ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-semibold uppercase tracking-wider text-accent-ink">
                          <Sparkles aria-hidden className="h-3 w-3" />
                          {c("justReleased")}
                        </span>
                      ) : null}
                      {certificate.demonstration ? (
                        <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold uppercase tracking-wider text-warn">
                          {c("demonstration")}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="flex items-center gap-3 sm:justify-end">
                    {/*
                      A lot with no HPLC result — a solvent, a reagent — has no
                      purity to report. "0 % HPLC" would claim a measurement
                      that was never made, so the size is shown instead.
                    */}
                    {certificate.hplcPurity > 0 ? (
                      <span className="text-sm font-semibold tabular text-ink">
                        {certificate.hplcPurity}% HPLC
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-ink-muted">
                        {formatNumber(certificate.sizeValue, locale)} {certificate.sizeUnit}
                      </span>
                    )}
                    <ArrowRight
                      aria-hidden
                      className="h-4 w-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
