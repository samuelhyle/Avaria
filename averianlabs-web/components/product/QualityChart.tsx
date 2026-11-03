import {
  type AssayReading,
  assayLimitPosition,
  assayPosition,
  orderAssays,
  readAssays,
} from "@/lib/certificates/assay"
import type { BatchCertificate } from "@/lib/certificates/types"
import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"

/**
 * A lot's assay results, drawn against the specification they were measured
 * to.
 *
 * A number on its own ("99.4 %") says almost nothing — any supplier can
 * print one. What makes it checkable is the specification beside it and the
 * method that produced it, so each row here carries all three: the
 * measurement, the limit it is measured against, and the method. The bar is
 * drawn over the range the comparison happens in, which is why a purity of
 * 99.4 % against a limit of 98 % is a bar that is nearly full rather than
 * one that is 99.4 % full.
 *
 * Nothing is drawn that the lot does not report. A row whose specification
 * cannot be read is shown as text, with no bar.
 */
export function QualityChart({
  certificate,
  className,
}: {
  certificate: BatchCertificate | null | undefined
  className?: string
}) {
  const readings = certificate ? orderAssays(readAssays(certificate.tests)) : []
  if (!certificate || readings.length === 0) return null

  return (
    <div className={cn("w-full", className)}>
      <dl className="space-y-5">
        {readings.map((reading) => (
          <Reading key={reading.id} reading={reading} />
        ))}
      </dl>
    </div>
  )
}

function Reading({ reading }: { reading: AssayReading }) {
  const t = useTranslations("certificates")
  const position = assayPosition(reading)
  const limit = assayLimitPosition(reading)

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-sm font-medium text-ink">{reading.name}</dt>
        <dd className="font-mono text-sm tabular text-ink">{reading.result}</dd>
      </div>

      {reading.method ? <p className="mt-0.5 text-2xs text-ink-subtle">{reading.method}</p> : null}

      {position !== null && reading.scale ? (
        <div
          className="relative mt-2.5 h-2 rounded-full bg-surface-3"
          role="img"
          aria-label={t("assayLabel", {
            name: reading.name,
            result: reading.result,
            spec: reading.spec ?? "",
          })}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${Math.max(position * 100, 2)}%` }}
          />
          {limit !== null ? (
            <div
              className="absolute -top-1 bottom-[-4px] w-[2px] rounded-full bg-brand-navy"
              style={{ left: `${limit * 100}%` }}
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {reading.spec ? (
          <span className="font-mono text-2xs text-ink-muted">{reading.spec}</span>
        ) : null}
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider",
            reading.pass ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {reading.pass ? t("pass") : t("fail")}
        </span>
      </div>
    </div>
  )
}
