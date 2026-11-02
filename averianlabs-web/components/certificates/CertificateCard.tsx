import { Badge } from "@/components/ui/Badge"
import type { BatchCertificate } from "@/lib/certificates/types"
import { cn } from "@/lib/utils/cn"
import { formatDate, formatNumber, formatPercent } from "@/lib/utils/format"
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Fragment } from "react"

/**
 * One published batch certificate.
 *
 * The card leads with the lot, because the lot is what a reader has to check:
 * the batch code on the vial has to match the batch code on the certificate.
 * The assay sits beside it, so the number can be read against the method that
 * produced it and the specification it was measured against — without the two
 * halves fighting each other for the width.
 */
export async function CertificateCard({
  certificate,
  locale,
  showProduct = true,
  className,
}: {
  certificate: BatchCertificate
  locale: string
  showProduct?: boolean
  className?: string
}) {
  const t = await getTranslations({ locale, namespace: "certificates" })

  return (
    <article
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-[var(--radius-lg)] border border-line bg-surface p-5 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 xl:block">
          <div className="min-w-0">
            {showProduct ? (
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-accent">
                {certificate.category ?? certificate.productType ?? ""}
              </p>
            ) : null}
            <h3 className="mt-1 text-base font-semibold leading-snug tracking-tight text-ink">
              {showProduct ? (
                <Link
                  href={`/${locale}/shop/${certificate.productSlug}`}
                  className="hover:text-accent hover:underline underline-offset-4"
                >
                  {certificate.productName}
                </Link>
              ) : (
                certificate.productName
              )}
            </h3>
            <p className="mt-1 font-mono text-xs text-ink-muted">{certificate.batchCode}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 xl:mt-3">
            <Badge tone="success" size="md">
              {formatPercent(certificate.hplcPurity, locale)} HPLC
            </Badge>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 xl:grid-cols-1 xl:gap-y-2.5">
          <div className="min-w-0">
            <dt className="text-2xs uppercase tracking-wider text-ink-subtle">{t("size")}</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">
              {formatNumber(certificate.sizeValue, locale)} {certificate.sizeUnit}
              <span className="ml-2 text-2xs text-ink-subtle">{certificate.sku}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs uppercase tracking-wider text-ink-subtle">{t("lab")}</dt>
            <dd className="mt-0.5 text-sm text-ink" title={certificate.lab}>
              {certificate.lab}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs uppercase tracking-wider text-ink-subtle">{t("tested")}</dt>
            <dd className="mt-0.5 text-sm text-ink">
              {formatDate(certificate.manufacturedAt, locale)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-2xs uppercase tracking-wider text-ink-subtle">{t("expires")}</dt>
            <dd className="mt-0.5 text-sm text-ink">{formatDate(certificate.expiresAt, locale)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={certificate.msConfirmed ? "accent" : "muted"}>
            {certificate.msConfirmed ? t("msConfirmed") : t("msNotConfirmed")}
          </Badge>
          <Badge tone="muted">
            {t("endotoxin")} {formatNumber(certificate.endotoxinEUPerMg, locale)} EU/mg
          </Badge>
          {certificate.demonstration ? <Badge tone="warn">{t("demonstration")}</Badge> : null}
        </div>

        {certificate.documentUrl ? (
          <a
            href={certificate.documentUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline underline-offset-4"
          >
            <FlaskConical aria-hidden className="h-4 w-4" />
            {t("openCertificate")}
          </a>
        ) : null}
      </div>

      {certificate.tests.length ? (
        <div className="min-w-0 border-t border-line pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          {/*
            The assay is a table on a wide screen and a stacked list on a
            narrow one. It is one set of values either way: the four columns
            below `sm` are hidden rather than repeated, and the narrow layout
            carries the same four fields with their labels.
          */}
          <div
            aria-hidden
            className="hidden gap-x-4 border-b border-line pb-2 text-2xs uppercase tracking-wider text-ink-subtle sm:grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <span className="pr-4 font-medium">{t("test")}</span>
            <span className="pr-4 font-medium">{t("method")}</span>
            <span className="pr-4 font-medium">{t("result")}</span>
            <span className="font-medium">{t("spec")}</span>
          </div>
          <dl className="grid gap-y-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-y-0">
            {certificate.tests.map((test) => (
              <Fragment key={test.id}>
                <dt className="text-sm font-medium text-ink sm:border-b sm:border-line/60 sm:py-2.5 sm:pr-4">
                  {test.name}
                  {/* The narrow layout carries the same fields under the name. */}
                  <span className="mt-1 block space-y-0.5 text-xs font-normal leading-relaxed text-ink-muted sm:hidden">
                    <span className="block">
                      <span className="sr-only">{t("method")}: </span>
                      <span className="font-mono">{test.method}</span>
                    </span>
                    <span className="block">
                      <span className="sr-only">{t("result")}: </span>
                      <span className="font-mono text-ink">{test.result}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="sr-only">{t("spec")}: </span>
                      {test.spec ? <span className="font-mono">{test.spec}</span> : null}
                      {test.pass ? (
                        <CheckCircle2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <XCircle aria-hidden className="h-3.5 w-3.5 shrink-0 text-danger" />
                      )}
                      <span className="sr-only">{test.pass ? t("pass") : t("fail")}</span>
                    </span>
                  </span>
                </dt>
                <dd className="hidden text-xs leading-relaxed text-ink-muted sm:border-b sm:border-line/60 sm:py-2.5 sm:pr-4 sm:font-mono">
                  {test.method}
                </dd>
                <dd className="hidden text-xs leading-relaxed text-ink sm:border-b sm:border-line/60 sm:py-2.5 sm:pr-4 sm:font-mono">
                  {test.result}
                </dd>
                <dd className="hidden text-xs text-ink-muted sm:border-b sm:border-line/60 sm:py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    {test.spec ? <span className="font-mono">{test.spec}</span> : null}
                    {test.pass ? (
                      <CheckCircle2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle aria-hidden className="h-3.5 w-3.5 shrink-0 text-danger" />
                    )}
                    <span className="sr-only">{test.pass ? t("pass") : t("fail")}</span>
                  </span>
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ) : null}
    </article>
  )
}
