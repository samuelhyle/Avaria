import type { Batch } from "@/lib/products/types"
import { formatDate } from "@/lib/utils/format"
import { Beaker, Box, FlaskConical, Hash, Package, Truck } from "lucide-react"
import { getTranslations } from "next-intl/server"

interface TraceabilityTimelineProps {
  batch: Batch
  locale: string
}

export async function TraceabilityTimeline({ batch, locale }: TraceabilityTimelineProps) {
  const t = await getTranslations({ locale, namespace: "coa" })

  const steps = [
    {
      n: 1,
      icon: Beaker,
      titleKey: "step1Title",
      bodyKey: "step1Body",
      date: null as string | null,
    },
    {
      n: 2,
      icon: Box,
      titleKey: "step2Title",
      bodyKey: "step2Body",
      date: batch.manufacturedAt,
    },
    {
      n: 3,
      icon: Hash,
      titleKey: "step3Title",
      bodyKey: "step3Body",
      date: null,
    },
    {
      n: 4,
      icon: FlaskConical,
      titleKey: "step4Title",
      bodyKey: "step4BodyWithLab",
      date: batch.manufacturedAt,
      bodyParams: { lab: batch.lab },
    },
    {
      n: 5,
      icon: Package,
      titleKey: "step5Title",
      bodyKey: "step5Body",
      date: batch.manufacturedAt,
    },
    {
      n: 6,
      icon: Truck,
      titleKey: "step6Title",
      bodyKey: "step6Body",
      date: null,
    },
  ]

  return (
    <section className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-sm">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold">{t("traceabilityHeading")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted text-pretty">{t("traceabilitySub")}</p>
      </header>

      <ol className="relative ml-2 border-l border-line pl-6">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <li key={step.n} className="relative pb-6 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-[10px] font-mono font-semibold text-ink shadow-sm"
              >
                {step.n}
              </span>
              <div className="rounded-[var(--radius-lg)] border border-line/60 bg-surface-2/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <h3 className="font-display text-sm font-semibold">{t(step.titleKey)}</h3>
                  </div>
                  {step.date ? (
                    <span className="font-mono text-2xs text-ink-subtle">
                      {formatDate(step.date, locale)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-ink-muted text-pretty">
                  {t(step.bodyKey, step.bodyParams)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
