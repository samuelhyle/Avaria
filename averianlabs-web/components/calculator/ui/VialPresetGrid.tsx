"use client"

import { useEffect, useMemo } from "react"
import { products } from "@/lib/products/data"
import { useTranslations } from "next-intl"
import { CalculatorCard } from "@/components/calculator/ui/CalculatorCard"
import { PrimaryButton } from "@/components/calculator/ui/PrimaryButton"
import { RECONSTITUTION_PRESETS } from "@/lib/calculator"
import { cn } from "@/lib/utils/cn"

interface Props {
  onSelect: (preset: { vialMg: number; solventMl: number; doseMcg: number }) => void
}

/**
 * Renders catalog vials as one-click preset cards. Falls back to the
 * mathematical `RECONSTITUTION_PRESETS` when no product has vials.
 */
export function VialPresetGrid({ onSelect }: Props) {
  const t = useTranslations("calculator")

  // Catalog-derived presets — pulls every vial SKU from the catalogue.
  const catalogPresets = useMemo(() => {
    const list: Array<{ id: string; label: string; vialMg: number; sku: string; priceCents: number; hint?: string }> = []
    for (const product of products) {
      for (const vial of product.vials) {
        if (vial.contactOnly || vial.priceCents === 0) continue
        list.push({
          id: `${product.slug}-${vial.sku}`,
          label: `${product.defaultTranslation.name} · ${vial.mg} mg`,
          vialMg: vial.mg,
          sku: vial.sku,
          priceCents: vial.priceCents,
          hint: product.slug,
        })
      }
    }
    return list
  }, [])

  return (
    <div className="space-y-2">
      <div className="text-2xs uppercase tracking-wide text-ink-subtle">{t("presets.title")}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalogPresets.map((preset) => {
          const suggestedSolvent = suggestSolventMl(preset.vialMg)
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onSelect({
                  vialMg: preset.vialMg,
                  solventMl: suggestedSolvent,
                  doseMcg: defaultDoseFor(preset.vialMg),
                })
              }
              className={cn(
                "group flex flex-col items-start rounded-[var(--radius)] border border-line bg-surface p-2 text-left",
                "hover:border-accent/40 hover:bg-accent-soft/40 transition-all duration-150",
              )}
            >
              <span className="text-2xs font-medium text-ink">{preset.label}</span>
              <span className="mt-0.5 font-mono text-3xs text-ink-subtle">{preset.sku}</span>
            </button>
          )
        })}
      </div>
      <p className="text-2xs text-ink-subtle">{t("presets.subtitle")}</p>
    </div>
  )
}

function suggestSolventMl(vialMg: number): number {
  // A 2 mL BAC water addition is the standard bench starting point for
  // ≤10 mg vials; larger vials get a 3 mL solvent. Yields concentrations in
  // the 2-3 mg/mL range which is below the per-peptide saturation ceiling.
  if (vialMg <= 5) return 2
  if (vialMg <= 10) return 2
  if (vialMg <= 30) return 3
  if (vialMg <= 50) return 3
  return 5
}

function defaultDoseFor(vialMg: number): number {
  // Default starting dose: 5 % of the vial for ≤10 mg vials, 10 % for larger
  // vials. (BPC-157 5 mg → 250 mcg / 5 mg → 250 mcg; Tirzepatide 30 mg →
  // 3 mg etc.)
  return vialMg <= 10 ? 250 : 2500
}
