"use client"

import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import type { BatchSummary } from "@/lib/coa/lookup"
import { ChevronRight, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useMemo, useState } from "react"

interface CoaListTableProps {
  locale: string
  rows: BatchSummary[]
}

export function CoaListTable({ locale, rows }: CoaListTableProps) {
  const t = useTranslations("coa")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.productSlug.toLowerCase().includes(q),
    )
  }, [rows, query])

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="pl-9"
            aria-label={t("filterPlaceholder")}
          />
        </div>
        <span className="text-xs text-ink-muted">
          {t("resultsCount", { count: filtered.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">{t("tableHeaders.batch")}</th>
              <th className="px-4 py-3">{t("tableHeaders.product")}</th>
              <th className="px-4 py-3">{t("tableHeaders.hplc")}</th>
              <th className="px-4 py-3">{t("tableHeaders.endotoxin")}</th>
              <th className="px-4 py-3">{t("tableHeaders.lab")}</th>
              <th className="px-4 py-3">{t("tableHeaders.status")}</th>
              <th className="px-4 py-3" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                  {t("resultsCount", { count: 0 })}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.code} className="group hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/${locale}/coa/${r.code}`}
                      className="block text-ink hover:text-accent"
                      title={t("viewDetails")}
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/coa/${r.code}`}
                      className="block font-medium text-ink hover:text-accent"
                    >
                      {r.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.hplcPurity}%</td>
                  <td className="px-4 py-3 font-mono">{r.endotoxinEUPerMg} EU/mg</td>
                  <td className="px-4 py-3 text-ink-muted">{r.lab}</td>
                  <td className="px-4 py-3">
                    <Badge tone="success">{t("passBadge")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/coa/${r.code}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100 hover:underline"
                    >
                      {t("viewDetails")}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
