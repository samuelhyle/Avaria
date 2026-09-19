import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import type { Batch, Product } from "@/lib/products/types"
import { formatDate } from "@/lib/utils/format"
import { CalendarClock, FileCheck2, FlaskConical, ShieldCheck } from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import Link from "next/link"
import { ChromatogramPlaceholder } from "./ChromatogramPlaceholder"
import { TestRow } from "./TestRow"

interface BatchCoaCardProps {
  product: Product
  batch: Batch
  locale: string
  productName: string
}

export async function BatchCoaCard({ product, batch, locale, productName }: BatchCoaCardProps) {
  const t = await getTranslations({ locale, namespace: "coa" })
  const format = await getFormatter({ locale })

  return (
    <Container className="py-12">
      <Link
        href={`/${locale}/coa`}
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
      >
        {t("backToList")}
      </Link>

      <header className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="accent" className="mb-3">
              <FileCheck2 className="h-3 w-3" />
              {t("batchTitle")}
            </Badge>
            <p className="font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {batch.code}
            </p>
            <p className="mt-1 font-display text-lg text-ink-muted">{productName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" />
              {t("passBadge")}
            </Badge>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-ink-muted text-pretty">{t("batchSubtitle")}</p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">{t("testsHeading")}</h2>
        <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-ink-subtle">
              <tr>
                <th className="px-4 py-3">{t("testsHeaders.test")}</th>
                <th className="px-4 py-3">{t("testsHeaders.result")}</th>
                <th className="px-4 py-3">{t("testsHeaders.method")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <TestRow
                test={t("testHplcPurity")}
                result={format.number(batch.hplcPurity, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })}
                unit="%"
                method={t("testHplcMethod")}
              />
              <TestRow
                test={t("testEndotoxin")}
                result={format.number(batch.endotoxinEUPerMg, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })}
                unit="EU/mg"
                method={t("testEndotoxinMethod")}
              />
              <TestRow
                test={t("testIdentity")}
                result={batch.msConfirmed ? t("testIdentityResult") : "—"}
                method={t("testIdentityMethod")}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <CalendarClock className="h-4 w-4 text-accent" />
            {t("manufacturingHeading")}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Meta
              label={t("manufacturedAt")}
              value={formatDate(batch.manufacturedAt, locale)}
              mono
            />
            <Meta label={t("expiresAt")} value={formatDate(batch.expiresAt, locale)} mono />
            <Meta label={t("testStorage")} value={product.storageTemp} />
          </dl>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <FlaskConical className="h-4 w-4 text-accent" />
            {t("labHeading")}
          </h2>
          <p className="mt-4 font-display text-base font-medium">{batch.lab}</p>
          <p className="mt-1 font-mono text-2xs text-ink-subtle">
            {t("step4BodyWithLab", { lab: batch.lab })}
          </p>
          <a
            href={`/${locale}/lab-tests`}
            className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-4 py-2 text-xs font-medium text-accent-ink transition hover:bg-accent/15"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            {t("viewFullPdf")}
          </a>
          <p className="mt-3 text-2xs text-ink-subtle">{t("pdfUnavailableNote")}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">{t("chromatogramHeading")}</h2>
        <ChromatogramPlaceholder locale={locale} />
      </section>
    </Container>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/50 pb-2 last:border-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-right" : "text-right font-medium"}>{value}</dd>
    </div>
  )
}
