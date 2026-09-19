"use client"

import { formatScheduleDate } from "@/lib/calculator/titration"
import { cn } from "@/lib/utils/cn"
import { useLocale } from "next-intl"

interface WeeklyEntry {
  weekIndex: number
  weekLabel: string
  date: Date
  doseMcg: number
  volumePerDoseMl: number
  iuPerDose: number
}

interface DoseScheduleTableProps {
  entries: WeeklyEntry[]
  locale?: string
  className?: string
}

/**
 * `DoseScheduleTable` — weekly × dose schedule with day, week, dose, volume
 * and IU columns. Renders as a compact, monospace-feeling table that prints
 * cleanly thanks to its tabular-nums and explicit borders.
 */
export function DoseScheduleTable({ entries, className }: DoseScheduleTableProps) {
  const locale = useLocale()
  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-line bg-surface-2 p-3 text-2xs text-ink-muted">
        Adjust the inputs above to build a schedule.
      </p>
    )
  }
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius)] border border-line", className)}>
      <table className="w-full border-collapse text-xs">
        <thead className="bg-surface-2 text-ink-muted">
          <tr>
            <th className="border-b border-line px-3 py-1.5 text-left">Week</th>
            <th className="border-b border-line px-3 py-1.5 text-left">Date</th>
            <th className="border-b border-line px-3 py-1.5 text-right">mcg</th>
            <th className="border-b border-line px-3 py-1.5 text-right">mL</th>
            <th className="border-b border-line px-3 py-1.5 text-right">IU</th>
          </tr>
        </thead>
        <tbody className="font-mono text-2xs">
          {entries.map((entry, idx) => (
            <tr
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className="even:bg-surface-2/40"
            >
              <td className="px-3 py-1.5 text-ink">{entry.weekLabel}</td>
              <td className="px-3 py-1.5 text-ink-muted">{formatScheduleDate(entry.date, locale)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{entry.doseMcg}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{entry.volumePerDoseMl.toFixed(3)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-accent">{entry.iuPerDose.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
