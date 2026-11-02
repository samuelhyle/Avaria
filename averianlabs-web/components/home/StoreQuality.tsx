import { Section } from "@/components/ui/Section"
import { listBatchCertificates } from "@/lib/certificates/service"
import { buttonClasses } from "@/lib/ui/button-styles"
import { formatDate, formatNumber, formatPercent } from "@/lib/utils/format"
import { ArrowRight, BadgeCheck, FileText } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Quality section.
 *
 * The right-hand column shows a real certificate when one has been published:
 * the lot code, the purity that lot actually measured and the laboratory that
 * measured it. A shopper can then see what the paperwork looks like before
 * they trust the shop with the order — and the numbers on the front page are
 * numbers we can point at.
 *
 * When nothing has been published yet the column shows the layout of a
 * certificate instead, labelled as an example. It never invents a lot.
 */
export async function StoreQuality({ locale }: { locale: string }) {
  const t = await getTranslations("home")
  const r = await getTranslations("research")
  const ce = await getTranslations("certificates")

  const latest = await listBatchCertificates(
    { q: "", product: "", sku: "", batch: "", lab: "", minPurity: null, page: 1 },
    locale,
  )
    .then((result) => result.certificates[0] ?? null)
    .catch(() => null)

  // The laboratory that runs the assay is the owner's to name, not the
  // layout's. Until it is set, the section says what it can defend.
  const labName = process.env.NEXT_PUBLIC_LAB_NAME ?? t("qualityLab")

  const rows = latest
    ? ([
        { label: t("qualityHplc"), value: formatPercent(latest.hplcPurity, locale) },
        {
          label: t("qualityMassSpec"),
          value: latest.msConfirmed ? r("labMassSpecConfirmed") : ce("msNotConfirmed"),
        },
        {
          label: t("qualityEndotoxin"),
          value: `${formatNumber(latest.endotoxinEUPerMg, locale)} EU/mg`,
        },
        { label: t("qualityTestedAt"), value: latest.lab },
      ] as const)
    : ([
        { label: t("qualityHplc"), value: "≥ 98.0 %" },
        { label: t("qualityMassSpec"), value: r("labMassSpecConfirmed") },
        { label: t("qualityEndotoxin"), value: "≤ 2.4 EU/mg" },
        { label: t("qualityTestedAt"), value: labName },
      ] as const)

  return (
    <Section aria-labelledby="quality-title" tone="sunken">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <p className="eyebrow">{t("labEyebrow")}</p>
          <h2 id="quality-title" className="h-section mt-2">
            {t("labTitle")}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
            {t("labSubtitle")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/certificates`} className={buttonClasses({ variant: "navy" })}>
              <FileText aria-hidden className="h-4 w-4" />
              {t("labCta")}
            </Link>
            <Link href={`/${locale}/lab-tests`} className={buttonClasses({ variant: "outline" })}>
              <BadgeCheck aria-hidden className="h-4 w-4" />
              {r("methodology")}
            </Link>
          </div>
        </div>

        {/* The certificate */}
        <div className="relative min-w-0">
          <div className="min-w-0 rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-[var(--shadow-lg)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
              <div className="min-w-0">
                <p className="break-words font-mono text-2xs uppercase tracking-[0.18em] text-ink-subtle">
                  {latest ? t("latestCertificate") : t("exampleCertificate")}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-ink">
                  {latest ? latest.batchCode : "BPC157-10-2026-08-A"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-2xs font-semibold text-success">
                <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
                {r("labPass")}
              </span>
            </div>
            <dl className="mt-4 divide-y divide-line">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                >
                  <dt className="min-w-0 break-words text-xs text-ink-muted">{row.label}</dt>
                  <dd className="text-sm font-medium tabular text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[var(--radius)] bg-surface-2 px-3.5 py-3">
              <p className="min-w-0 flex-1 text-2xs text-ink-muted">
                {latest ? (
                  <>
                    {latest.productName} · {formatDate(latest.manufacturedAt, locale)}
                  </>
                ) : (
                  r("labPurityMeta")
                )}
              </p>
              <Link
                href={`/${locale}/certificates`}
                className="text-xs font-semibold text-accent hover:underline underline-offset-4"
              >
                {t("labCta")}
                <ArrowRight aria-hidden className="ml-1 inline h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
