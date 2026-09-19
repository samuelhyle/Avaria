"use client"

/**
 * Bulk discount badge + next-tier nudge for the cart and product pages.
 *
 * Uses the same `tierFor` / `nextBulkTier` rules from
 * `lib/pricing/bulk-discount.ts` so the UI and the server can't drift.
 */

import {
  type BulkDiscountLine,
  type BulkTier,
  computeBulkDiscount,
  nextBulkTier,
  tierFor,
} from "@/lib/pricing/bulk-discount"
import { useTranslations } from "next-intl"

const TIER_COLOR: Record<string, string> = {
  "-10%": "border-accent/30 bg-accent-soft text-accent-ink",
  "-15%": "border-success/30 bg-success-soft text-success",
  "-20%": "border-warning/30 bg-warning-soft text-warning",
}

/** Single-line pill: shows the buyer's current savings for one SKU. */
export function BulkDiscountBadge({ line }: { line: BulkDiscountLine }) {
  if (line.percent === 0) return null
  const label = `−${Math.round(line.percent * 100)}%`
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-3xs font-semibold ${TIER_COLOR[label] ?? "border-accent/30 bg-accent-soft text-accent-ink"}`}
    >
      {label} bulk
    </span>
  )
}

/**
 * "Add N more vials to unlock −15%" nudge. Returns `null` when the buyer
 * is already at the top tier (21+) so the cart doesn't show stale copy.
 */
export function BulkDiscountNudge({
  qty,
  skuName,
  className,
}: {
  qty: number
  skuName?: string
  className?: string
}) {
  const t = useTranslations("checkout")
  const next = nextBulkTier(qty)
  if (!next) return null
  const pct = Math.round(next.tier.percent * 100)
  const label = `−${pct}%`
  // Pick the `_plural` form when the buyer needs more than one vial so the
  // German / Dutch / Finnish plurals resolve correctly. `next-intl`'s
  // plural rule requires the value to be passed under the `count` key, so
  // we look up the right string ourselves rather than relying on a plural
  // ICU expression.
  const baseKey = `bulkNudge${pct}` as "bulkNudge10" | "bulkNudge15" | "bulkNudge20"
  const key = next.unitsAway === 1 ? baseKey : (`${baseKey}_plural` as `${typeof baseKey}_plural`)
  return (
    <p className={`text-3xs text-ink-subtle ${className ?? ""}`}>
      {t(key, { units: next.unitsAway })} <span className="font-mono text-ink-muted">{label}</span>
      {skuName ? <> · {skuName}</> : null}
    </p>
  )
}

/** Compact per-tier summary used on the homepage trust block. */
export function BulkDiscountTierList() {
  const t = useTranslations("checkout")
  const tiers: BulkTier[] = [
    { minQty: 21, percent: 0.2, label: "−20%" },
    { minQty: 11, percent: 0.15, label: "−15%" },
    { minQty: 5, percent: 0.1, label: "−10%" },
  ]
  return (
    <ul className="space-y-1 text-sm text-ink-muted">
      {tiers.map((tier) => (
        <li key={tier.minQty} className="flex items-center justify-between gap-3">
          <span className="font-mono text-2xs font-semibold text-accent">{tier.label}</span>
          <span className="flex-1 border-b border-dashed border-line/60" aria-hidden />
          <span className="text-2xs uppercase tracking-wider text-ink-subtle">
            {t(
              `bulkTier${Math.round(tier.percent * 100)}` as
                | "bulkTier10"
                | "bulkTier15"
                | "bulkTier20",
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Inline total-discount summary used by CheckoutSummary when at least one
 * line crossed the threshold. Keeps the parent render tree uncluttered.
 */
export function BulkDiscountSummary({
  items,
  className,
}: {
  items: Array<{ sku: string; qty: number; unitPriceCents: number }>
  className?: string
}) {
  const t = useTranslations("checkout")
  const result = computeBulkDiscount(items)
  if (!result.hasBulkTier) return null
  return (
    <div
      className={`rounded-[var(--radius)] border border-success/30 bg-success-soft p-3 text-xs ${className ?? ""}`}
    >
      <p className="font-medium text-success">
        {t("bulkDiscountLabel")} ·{" "}
        <span className="font-mono">
          −{Math.round((result.discountCents / result.originalSubtotalCents) * 100)}%
        </span>
      </p>
      <p className="mt-0.5 text-2xs text-success/80">
        {result.lines
          .filter((l) => l.percent > 0)
          .map((l) => `${l.sku} ×${l.qty}`)
          .join(" · ")}
      </p>
    </div>
  )
}

export { tierFor }
