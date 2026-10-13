"use client"

import { Input } from "@/components/ui/Input"
import { calculateAliquots } from "@/lib/calculations"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

export function Calculator() {
  const t = useTranslations("research")
  const locale = useLocale()
  const [mass, setMass] = useState("10")
  const [volume, setVolume] = useState("2")
  const [aliquot, setAliquot] = useState("250")
  const result = calculateAliquots(Number(mass), Number(volume), Number(aliquot))
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(value)
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">{t("inputs")}</h2>
        <div className="mt-5 space-y-4">
          <Input
            type="number"
            label={t("mass")}
            value={mass}
            onChange={(e) => setMass(e.target.value)}
            min="0.000001"
            step="any"
          />
          <Input
            type="number"
            label={t("volume")}
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            min="0.000001"
            step="any"
          />
          <Input
            type="number"
            label={t("aliquotMass")}
            value={aliquot}
            onChange={(e) => setAliquot(e.target.value)}
            min="0.000001"
            step="any"
          />
        </div>
      </section>
      <section
        className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-6"
        aria-live="polite"
      >
        <h2 className="font-display text-lg font-semibold">{t("results")}</h2>
        {result ? (
          <dl className="mt-5 space-y-4">
            <Stat
              label={t("concentration")}
              value={`${number(result.concentrationMgPerMl)} mg/mL`}
              sub={`${number(result.concentrationMcgPerMl)} µg/mL`}
            />
            <Stat
              label={t("aliquotVolume")}
              value={`${number(result.aliquotVolumeMl)} mL`}
              sub={`${number(result.aliquotVolumeUl)} µL`}
            />
            <Stat label={t("aliquotCount")} value={number(result.aliquotCount)} />
          </dl>
        ) : (
          <p role="status" className="mt-5 text-sm text-danger">
            {t("invalidCalculation")}
          </p>
        )}
        <p className="mt-6 text-sm text-ink-muted">{t("calculatorNotice")}</p>
      </section>
    </div>
  )
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right font-mono">
        <div>{value}</div>
        {sub && <div className="text-xs text-ink-muted">{sub}</div>}
      </dd>
    </div>
  )
}
