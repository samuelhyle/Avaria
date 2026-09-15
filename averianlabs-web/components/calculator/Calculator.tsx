"use client"

import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Calculator as CalcIcon, Droplets, FlaskConical } from "lucide-react"
import { useMemo, useState } from "react"

export function Calculator() {
  const [peptideMg, setPeptideMg] = useState(10)
  const [waterMl, setWaterMl] = useState(2)
  const [doseMcg, setDoseMcg] = useState(250)

  const result = useMemo(() => {
    const totalMcg = peptideMg * 1000
    const concentrationMgPerMl = peptideMg / waterMl
    const concentrationMcgPerMl = concentrationMgPerMl * 1000
    const volumePerDoseMl = doseMcg / concentrationMcgPerMl
    const dosesTotal = Math.floor(totalMcg / doseMcg)
    const iuPerMl = 100
    const iuPerDose = volumePerDoseMl * iuPerMl
    return {
      concentrationMgPerMl,
      concentrationMcgPerMl,
      volumePerDoseMl,
      dosesTotal,
      iuPerDose,
    }
  }, [peptideMg, waterMl, doseMcg])

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <FlaskConical className="h-4 w-4 text-accent" />
          Inputs
        </h2>
        <div className="mt-5 space-y-4">
          <Input
            type="number"
            label="Peptide mass (mg)"
            value={peptideMg}
            onChange={(e) => setPeptideMg(Math.max(0.1, Number(e.target.value)))}
            min={0.1}
            step={0.1}
          />
          <Input
            type="number"
            label="Bacteriostatic water (mL)"
            value={waterMl}
            onChange={(e) => setWaterMl(Math.max(0.1, Number(e.target.value)))}
            min={0.1}
            step={0.1}
          />
          <Input
            type="number"
            label="Desired dose (mcg)"
            value={doseMcg}
            onChange={(e) => setDoseMcg(Math.max(1, Number(e.target.value)))}
            min={1}
            step={1}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-accent-soft via-bg to-ice-soft p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <CalcIcon className="h-4 w-4 text-accent" />
          Results
        </h2>

        <dl className="mt-5 space-y-3">
          <Stat
            label="Concentration"
            value={`${result.concentrationMgPerMl.toFixed(2)} mg/mL`}
            sub={`${result.concentrationMcgPerMl.toFixed(0)} mcg/mL`}
          />
          <Stat
            label="Volume per dose"
            value={`${result.volumePerDoseMl.toFixed(3)} mL`}
            sub={`${result.iuPerDose.toFixed(1)} IU on 100 IU/mL syringe`}
          />
          <Stat
            label="Total doses in vial"
            value={`${result.dosesTotal}`}
            sub={`${peptideMg} mg ÷ ${doseMcg} mcg`}
          />
        </dl>
        <p className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-3 text-xs text-ink-muted">
          <Droplets className="mr-1 inline h-3 w-3" aria-hidden />
          For research calculations only. Always verify with your protocol.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <Badge tone="ice">mcg</Badge>
          <Badge tone="accent">IU</Badge>
          <Badge tone="muted">mL</Badge>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 pb-2 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right">
        <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
        {sub ? <div className="font-mono text-2xs text-ink-subtle">{sub}</div> : null}
      </dd>
    </div>
  )
}
