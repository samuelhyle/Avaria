"use client"

import { useMemo, useState } from "react"
import { solveReconstitution } from "@/lib/calculator/reconstitution"
import { SYRINGE_PRESETS } from "@/lib/calculator/syringe"
import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { CalculatorField } from "@/components/calculator/ui/CalculatorField"
import { CalculatorStat } from "@/components/calculator/ui/CalculatorStat"
import { SyringeDiagram } from "@/components/calculator/ui/SyringeDiagram"
import { ColumnsIcon } from "lucide-react"
import { useTranslations } from "next-intl"

interface ProtocolDraft {
  vialMg: number
  solventMl: number
  doseMcg: number
}

interface Props {
  base: ProtocolDraft
}

/**
 * Compare two reconstitution scenarios side-by-side. Useful when the user
 * is choosing between two vial sizes or two solvents for the same dose.
 */
export function CompareTab({ base }: Props) {
  const t = useTranslations("calculator")
  const [left, setLeft] = useState<ProtocolDraft>({ ...base })
  const [right, setRight] = useState<ProtocolDraft>(() => ({
    ...base,
    vialMg: base.vialMg * 2,
    solventMl: base.solventMl * 1.5,
  }))

  const leftRecon = useMemo(
    () =>
      solveReconstitution({
        vialMg: left.vialMg,
        solventMl: left.solventMl,
        doseMcg: left.doseMcg,
        syringe: SYRINGE_PRESETS[2]!,
      }),
    [left],
  )
  const rightRecon = useMemo(
    () =>
      solveReconstitution({
        vialMg: right.vialMg,
        solventMl: right.solventMl,
        doseMcg: right.doseMcg,
        syringe: SYRINGE_PRESETS[2]!,
      }),
    [right],
  )

  return (
    <CalculatorCard>
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
          <ColumnsIcon className="h-3.5 w-3.5" />
        </span>
        {t("compare.title")}
      </h3>
      <p className="mb-4 text-sm text-ink-muted">{t("compare.subtitle")}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <ProtocolColumn
          label={t("compare.left")}
          value={left}
          onChange={setLeft}
          recon={leftRecon}
        />
        <ProtocolColumn
          label={t("compare.right")}
          value={right}
          onChange={setRight}
          recon={rightRecon}
        />
      </div>
    </CalculatorCard>
  )
}

interface ColumnProps {
  label: string
  value: ProtocolDraft
  onChange: (draft: ProtocolDraft) => void
  recon: ReturnType<typeof solveReconstitution>
}

function ProtocolColumn({ label, value, onChange, recon }: ColumnProps) {
  const t = useTranslations("calculator")
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="text-2xs uppercase tracking-wide text-ink-subtle">{label}</div>
      <CalculatorField
        id={`${label}-vial`}
        label={t("peptideMass")}
        unit="mg"
        value={value.vialMg}
        onChange={(e) => onChange({ ...value, vialMg: Number(e.target.value) || 0 })}
      />
      <CalculatorField
        id={`${label}-solvent`}
        label={t("bacteriostaticWater")}
        unit="mL"
        value={value.solventMl}
        onChange={(e) => onChange({ ...value, solventMl: Number(e.target.value) || 0 })}
      />
      <CalculatorField
        id={`${label}-dose`}
        label={t("desiredDose")}
        unit="mcg"
        value={value.doseMcg}
        onChange={(e) => onChange({ ...value, doseMcg: Number(e.target.value) || 0 })}
      />
      <dl className="space-y-3 pt-2">
        <CalculatorStat
          label={t("concentration")}
          value={`${recon.concentrationMgPerMl.toFixed(2)} mg/mL`}
          secondary={`${recon.concentrationMcgPerMl.toFixed(0)} mcg/mL`}
          emphasis
        />
        <CalculatorStat
          label={t("volumePerDose")}
          value={`${recon.volumePerDoseMl.toFixed(3)} mL`}
          secondary={`${recon.iuPerDoseSnapped.toFixed(0)} IU on 100 IU/mL syringe`}
        />
        <CalculatorStat
          label={t("totalDoses")}
          value={`${recon.totalDoses}`}
          tone="ice"
        />
      </dl>
      <SyringeDiagram volumeMl={recon.volumePerDoseMl} compact />
    </div>
  )
}
