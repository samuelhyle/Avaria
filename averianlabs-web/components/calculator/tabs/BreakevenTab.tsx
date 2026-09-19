"use client"

import { useMemo, useState } from "react"
import { compareVialPlans, type VialPlanInput } from "@/lib/calculator/breakeven"
import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { CalculatorField } from "@/components/calculator/ui/CalculatorField"
import { CalculatorStat } from "@/components/calculator/ui/CalculatorStat"
import { ScaleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils/cn"

interface Props {
  vialMg: number
  doseMcg: number
  /** Optional initial plans derived from the user's recon setup. */
  defaultPlans?: VialPlanInput[]
}

export function BreakevenTab({ vialMg, doseMcg, defaultPlans }: Props) {
  const t = useTranslations("calculator")

  const initialPlans = useMemo<VialPlanInput[]>(() => {
    if (defaultPlans && defaultPlans.length > 0) return defaultPlans
    return [
      { label: `1× ${vialMg} mg vial`, vialMg, vials: 1, priceCents: 7900 },
      { label: `2× ${Math.max(1, vialMg / 2)} mg vials`, vialMg: Math.max(1, vialMg / 2), vials: 2, priceCents: 4500 },
    ]
  }, [defaultPlans, vialMg])

  const [plans, setPlans] = useState<VialPlanInput[]>(initialPlans)
  const [workingDose, setWorkingDose] = useState(doseMcg)

  const result = compareVialPlans({ plans, doseMcg: workingDose })

  const updatePlan = (idx: number, patch: Partial<VialPlanInput>) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <CalculatorCard>
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <ScaleIcon className="h-3.5 w-3.5" />
          </span>
          {t("breakeven.title")}
        </h3>
        <div className="space-y-3">
          <CalculatorField
            id="breakevenDose"
            label={t("desiredDose")}
            unit="mcg"
            value={workingDose}
            min={1}
            onChange={(e) => setWorkingDose(Math.max(1, Number(e.target.value) || 0))}
          />
          <div className="space-y-2">
            {plans.map((plan, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[var(--radius)] border border-line bg-surface p-2"
              >
                <input
                  value={plan.label}
                  onChange={(e) => updatePlan(idx, { label: e.target.value })}
                  className="rounded border border-line bg-surface-2 px-2 py-1 text-2xs text-ink"
                />
                <input
                  type="number"
                  value={plan.vialMg}
                  step={1}
                  onChange={(e) => updatePlan(idx, { vialMg: Math.max(1, Number(e.target.value) || 0) })}
                  className="w-16 rounded border border-line bg-surface-2 px-2 py-1 text-right font-mono text-2xs"
                />
                <input
                  type="number"
                  value={plan.priceCents}
                  step={100}
                  onChange={(e) => updatePlan(idx, { priceCents: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20 rounded border border-line bg-surface-2 px-2 py-1 text-right font-mono text-2xs"
                />
              </div>
            ))}
            <div className="flex justify-between gap-2 text-2xs">
              <button
                type="button"
                onClick={() =>
                  setPlans((prev) => [
                    ...prev,
                    { label: "Plan", vialMg: Math.max(1, vialMg / 2), vials: 2, priceCents: 4000 },
                  ])
                }
                className="rounded-full border border-line bg-surface px-3 py-1 hover:border-accent/40 hover:bg-accent-soft"
              >
                + {t("breakeven.addPlan")}
              </button>
              <button
                type="button"
                onClick={() => setPlans((prev) => prev.slice(0, Math.max(2, prev.length - 1)))}
                disabled={plans.length <= 2}
                className={cn(
                  "rounded-full border border-line bg-surface px-3 py-1 hover:border-danger/40 hover:bg-danger-soft",
                  plans.length <= 2 && "cursor-not-allowed opacity-50",
                )}
              >
                − {t("breakeven.removePlan")}
              </button>
            </div>
          </div>
        </div>
      </CalculatorCard>

      <CalculatorCard tone="gradient" aria-live="polite">
        <h3 className="mb-4 font-display text-base font-semibold text-ink">{t("breakeven.title")}</h3>
        <table className="w-full border-collapse text-xs">
          <thead className="text-2xs text-ink-subtle">
            <tr>
              <th className="px-3 py-1.5 text-left">{t("breakeven.plan")}</th>
              <th className="px-3 py-1.5 text-right">{t("breakeven.price")}</th>
              <th className="px-3 py-1.5 text-right">{t("breakeven.perMg")}</th>
              <th className="px-3 py-1.5 text-right">{t("breakeven.doses")}</th>
              <th className="px-3 py-1.5 text-right">{t("breakeven.leftover")}</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.map((plan, idx) => {
              const isCheapest = result.cheapest && plan.vialMg === result.cheapest.vialMg && plan.vials === result.cheapest.vials
              const isLeastWaste = result.leastWaste && plan.vialMg === result.leastWaste.vialMg && plan.vials === result.leastWaste.vials
              return (
                <tr
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  className="border-t border-line/40 bg-surface/0 even:bg-surface-2/40"
                >
                  <td className="px-3 py-1.5 text-ink">
                    {plan.label}
                    {isCheapest ? (
                      <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-2xs text-success">
                        {t("breakeven.pickCheapest")}
                      </span>
                    ) : null}
                    {isLeastWaste && !isCheapest ? (
                      <span className="ml-2 rounded-full bg-ice-soft px-2 py-0.5 text-2xs text-ice">
                        {t("breakeven.pickLeastWaste")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">€{(plan.totalCents / 100).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">€{plan.centsPerMg.toFixed(2)}/mg</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{plan.dosesCovered}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ice">{plan.leftoverMg.toFixed(2)} mg</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <CalculatorStat
            label={t("breakeven.pickCheapest")}
            value={result.cheapest ? `€${result.cheapest.centsPerMg.toFixed(2)}/mg` : "—"}
            tone="success"
          />
          <CalculatorStat
            label={t("breakeven.pickLeastWaste")}
            value={result.leastWaste ? `${result.leastWaste.leftoverMg.toFixed(2)} mg` : "—"}
            tone="ice"
          />
        </div>
      </CalculatorCard>
    </div>
  )
}
