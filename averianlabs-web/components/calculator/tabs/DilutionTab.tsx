"use client"

import { designDilution } from "@/lib/calculator/dilution"
import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { CalculatorField } from "@/components/calculator/ui/CalculatorField"
import { CalculatorStat } from "@/components/calculator/ui/CalculatorStat"
import { Beaker } from "lucide-react"
import { useTranslations } from "next-intl"
import { type CalculatorFormState, type DerivedResult } from "@/components/calculator/hooks/use-calculator-state"

interface Props {
  state: CalculatorFormState
  set: <K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => void
  derived: DerivedResult
}

export function DilutionTab({ state, set, derived }: Props) {
  const t = useTranslations("calculator")
  const recon = derived.recon
  const plan = designDilution({
    vialMg: state.vialMg,
    solventMl: state.solventMl,
    doseMcg: state.doseMcg,
    syringe: state.syringe,
    minPracticalDrawMl: state.minPracticalDrawMl,
  })

  const noDilution = plan.warning === "no_dilution_needed"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <CalculatorCard>
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ice-soft text-ice">
            <Beaker className="h-3.5 w-3.5" />
          </span>
          {t("dilution.title")}
        </h3>
        <div className="space-y-4">
          <CalculatorField
            id="minDraw"
            label={t("dilution.minDraw")}
            unit="mL"
            min={0.01}
            max={0.5}
            step={0.01}
            value={state.minPracticalDrawMl}
            onChange={(e) => set("minPracticalDrawMl", Math.max(0.01, Number(e.target.value) || 0))}
            hint={t("validation.drawTooSmall")}
          />
          <CalculatorStat
            label={t("dilution.rawVolume")}
            value={`${recon.volumePerDoseMl.toFixed(4)} mL`}
            tone={noDilution ? "success" : "warn"}
          />
        </div>
      </CalculatorCard>

      <CalculatorCard tone="ice" aria-live="polite">
        <h3 className="mb-4 font-display text-base font-semibold text-ink">{t("dilution.subtitle")}</h3>
        {noDilution ? (
          <p className="rounded-[var(--radius)] border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            {t("dilution.step1")} — the draw volume is already above your minimum comfortable pipette volume.
          </p>
        ) : plan.warning === "impossible" ? (
          <p className="rounded-[var(--radius)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            Inputs invalid.
          </p>
        ) : (
          <ol className="space-y-3 text-sm">
            {plan.steps.map((step) => (
              <li
                // eslint-disable-next-line react/no-array-index-key
                key={step.index}
                className="rounded-[var(--radius)] border border-line bg-surface p-3"
              >
                <div className="text-2xs uppercase tracking-wide text-ink-subtle">
                  {step.label}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-3 font-mono text-2xs">
                  <span>
                    <span className="block text-ink-subtle">Source</span>
                    <span className="text-ink">{step.sourceMl.toFixed(2)} mL</span>
                  </span>
                  <span>
                    <span className="block text-ink-subtle">Diluent</span>
                    <span className="text-ink">{step.diluentMl.toFixed(2)} mL</span>
                  </span>
                  <span>
                    <span className="block text-ink-subtle">{t("dilution.working")}</span>
                    <span className="text-ink">{step.concentrationMcgPerMl.toFixed(2)} mcg/mL</span>
                  </span>
                </div>
                {step.index === 2 ? (
                  <p className="mt-2 text-2xs text-ink-muted">
                    {t("dilution.step2Detail", { sourceMl: step.sourceMl.toFixed(2), diluentMl: step.diluentMl.toFixed(2) })}
                  </p>
                ) : null}
              </li>
            ))}
            <li className="rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-3 py-2 text-2xs text-accent-ink">
              {t("dilution.factor")}: <strong>1:{plan.totalDilutionFactor}</strong>
              {plan.warning === "excessive_dilution" ? " — exceeds practical limit. Verify CoA." : ""}
            </li>
          </ol>
        )}
      </CalculatorCard>
    </div>
  )
}
