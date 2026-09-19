"use client"

import { titrationLadder, type TitrationStep } from "@/lib/calculator/titration"
import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { CalculatorField } from "@/components/calculator/ui/CalculatorField"
import { CalculatorStat } from "@/components/calculator/ui/CalculatorStat"
import { TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"
import { type CalculatorFormState, type DerivedResult } from "@/components/calculator/hooks/use-calculator-state"

interface Props {
  state: CalculatorFormState
  set: <K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => void
  derived: DerivedResult
}

export function TitrationTab({ state, set, derived }: Props) {
  const t = useTranslations("calculator")
  const ladder = titrationLadder({
    vialMg: state.vialMg,
    solventMl: state.solventMl,
    startMcg: state.startMcg,
    endMcg: state.endMcg,
    steps: state.steps,
    syringe: state.syringe,
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <CalculatorCard>
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          {t("titration.title")}
        </h3>
        <div className="space-y-4">
          <CalculatorField
            id="startMcg"
            label={t("titration.startDose")}
            unit="mcg"
            value={state.startMcg}
            min={1}
            onChange={(e) => set("startMcg", Number(e.target.value) || 0)}
          />
          <CalculatorField
            id="endMcg"
            label={t("titration.endDose")}
            unit="mcg"
            value={state.endMcg}
            min={1}
            onChange={(e) => set("endMcg", Number(e.target.value) || 0)}
          />
          <CalculatorField
            id="steps"
            label={t("titration.steps")}
            unit=""
            min={2}
            max={24}
            value={state.steps}
            onChange={(e) => set("steps", Math.max(2, Math.min(24, Number(e.target.value) || 0)))}
          />
        </div>
      </CalculatorCard>

      <CalculatorCard tone="ice" aria-live="polite">
        <h3 className="mb-4 font-display text-base font-semibold text-ink">{t("titration.subtitle")}</h3>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <CalculatorStat
            label={t("titration.totalConsumed")}
            value={`${ladder.totalConsumedMg.toFixed(2)} mg`}
            tone="ice"
          />
          <CalculatorStat
            label={t("totalDoses")}
            value={`${ladder.steps.length}`}
            secondary={ladder.requiresMultipleVials ? t("titration.exceedsVial", { vials: 2 }) : "1 vial"}
          />
        </div>
        <DoseLadderStrip steps={ladder.steps} />
      </CalculatorCard>
    </div>
  )
}

interface StripProps {
  steps: TitrationStep[]
}

function DoseLadderStrip({ steps }: StripProps) {
  if (steps.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-line bg-surface p-3 text-2xs text-ink-muted">
        Adjust the inputs above to render the ladder.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      {steps.map((step) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={step.index}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 py-2"
        >
          <span className="font-mono text-2xs text-ink-subtle">{step.label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-ice"
              style={{ width: `${Math.min(100, (step.doseMcg / steps[steps.length - 1]!.doseMcg) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-2xs text-ink">
            {step.doseMcg} mcg <span className="ml-2 text-ink-subtle">{step.iuPerDose.toFixed(0)} IU</span>
          </span>
        </div>
      ))}
    </div>
  )
}
