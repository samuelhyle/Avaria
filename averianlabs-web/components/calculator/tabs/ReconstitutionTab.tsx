"use client"

import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { CalculatorField } from "@/components/calculator/ui/CalculatorField"
import { CalculatorStat } from "@/components/calculator/ui/CalculatorStat"
import { PrimaryButton } from "@/components/calculator/ui/PrimaryButton"
import { ResultRing } from "@/components/calculator/ui/ResultRing"
import { SyringeDiagram } from "@/components/calculator/ui/SyringeDiagram"
import { VialPresetGrid } from "@/components/calculator/ui/VialPresetGrid"
import { Calculator } from "lucide-react"
import { useTranslations } from "next-intl"
import { type CalculatorFormState, type DerivedResult } from "@/components/calculator/hooks/use-calculator-state"

interface Props {
  state: CalculatorFormState
  set: <K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => void
  derived: DerivedResult
}

export function ReconstitutionTab({ state, set, derived }: Props) {
  const t = useTranslations("calculator")
  const recon = derived.recon

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <CalculatorCard tone="default">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <Calculator className="h-3.5 w-3.5" />
          </span>
          {t("inputs")}
        </h3>
        <div className="space-y-4">
          <CalculatorField
            id="vialMg"
            label={t("peptideMass")}
            unit="mg"
            min={0.1}
            step={0.1}
            value={state.vialMg}
            onChange={(e) => set("vialMg", Math.max(0.1, Number(e.target.value) || 0))}
          />
          <CalculatorField
            id="solventMl"
            label={t("bacteriostaticWater")}
            unit="mL"
            min={0.1}
            step={0.1}
            value={state.solventMl}
            onChange={(e) => set("solventMl", Math.max(0.1, Number(e.target.value) || 0))}
          />
          <CalculatorField
            id="doseMcg"
            label={t("desiredDose")}
            unit="mcg"
            min={1}
            step={1}
            value={state.doseMcg}
            onChange={(e) => set("doseMcg", Math.max(1, Number(e.target.value) || 0))}
            presets={[
              { value: 100, label: "100 mcg" },
              { value: 250, label: "250 mcg" },
              { value: 500, label: "500 mcg" },
              { value: 1000, label: "1 mg" },
              { value: 2500, label: "2.5 mg" },
            ]}
          />
          <VialPresetGrid
            onSelect={(preset) => {
              set("vialMg", preset.vialMg)
              set("solventMl", preset.solventMl)
              if (preset.doseMcg) set("doseMcg", preset.doseMcg)
            }}
          />
        </div>
      </CalculatorCard>

      <CalculatorCard tone="gradient" aria-live="polite">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ice-soft text-ice">
            <Calculator className="h-3.5 w-3.5" />
          </span>
          {t("results")}
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto]">
          <dl className="space-y-3">
            <CalculatorStat
              label={t("concentration")}
              value={`${recon.concentrationMgPerMl.toFixed(2)} ${t("concentrationUnit")}`}
              secondary={`${recon.concentrationMcgPerMl.toFixed(0)} ${t("concentrationMcgUnit")}`}
              emphasis
            />
            <CalculatorStat
              label={t("volumePerDose")}
              value={`${recon.volumePerDoseMl.toFixed(3)} ${t("volumePerDoseUnit")}`}
              secondary={t("reconstitution.withSyringe", { syringe: state.syringe.label })}
            />
            <CalculatorStat
              label={t("iuOnSyringe")}
              value={`${recon.iuPerDoseSnapped.toFixed(0)} IU`}
              tone="accent"
            />
            <CalculatorStat
              label={t("totalDoses")}
              value={`${recon.totalDoses}`}
              secondary={t("dosesCalculation", { mass: state.vialMg, dose: state.doseMcg })}
            />
            <CalculatorStat
              label={t("leftoverMcg")}
              value={`${recon.leftoverMcg.toFixed(0)} ${t("leftoverMcgUnit")}`}
              tone="ice"
            />
          </dl>
          <div className="flex flex-col items-center gap-3">
            <ResultRing
              concentrationMgPerMl={recon.concentrationMgPerMl}
              productSlug={state.productSlug}
            />
            <SyringeDiagram
              syringe={state.syringe}
              volumeMl={recon.volumePerDoseMl}
              ariaLabel={t("aria.resultSummary", {
                mgPerMl: recon.concentrationMgPerMl.toFixed(2),
                mL: recon.volumePerDoseMl.toFixed(3),
                iu: recon.iuPerDoseSnapped.toFixed(0),
                syringe: state.syringe.label,
                doses: recon.totalDoses,
              })}
            />
          </div>
        </div>
        <PrimaryButton
          variant="ghost"
          className="mt-6 w-full justify-center"
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
        >
          {t("actions.share")}
        </PrimaryButton>
      </CalculatorCard>
    </div>
  )
}
