"use client"

import { Badge } from "@/components/ui/Badge"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { Check, ChevronDown, FlaskConical, ShoppingBag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type CSSProperties, useEffect, useMemo } from "react"
import { toast } from "sonner"

interface CompareTableProps {
  products: Product[]
  locale: Locale | string
}

const rows: Array<{
  key: string
  label: string
  render: (p: Product, locale: string) => React.ReactNode
  mono?: boolean
}> = [
  {
    key: "category",
    label: "Category",
    render: (p) => <span className="capitalize">{p.category}</span>,
  },
  { key: "cas", label: "CAS", render: (p) => p.casNumber ?? "—", mono: true },
  { key: "formula", label: "Formula", render: (p) => p.molecularFormula ?? "—", mono: true },
  { key: "mw", label: "MW (g/mol)", render: (p) => p.molecularWeight?.toLocaleString() ?? "—" },
  { key: "sequence", label: "Sequence", render: (p) => p.sequence ?? "—", mono: true },
  {
    key: "purity",
    label: "HPLC Purity",
    render: (p) => (p.purityPercent ? `${p.purityPercent.toFixed(1)}%` : "—"),
  },
  {
    key: "sizes",
    label: "Vial sizes",
    render: (p) => p.vials.map((v) => `${v.mg} mg`).join(" · "),
  },
  { key: "storage", label: "Storage", render: (p) => p.storageTemp },
]

export function CompareTable({ products, locale }: CompareTableProps) {
  const tCommon = useTranslations("common")
  const selected = useCompare((s) => s.items)
  const toggle = useCompare((s) => s.toggle)
  const clear = useCompare((s) => s.clear)
  const max = useCompare((s) => s.max)

  const list = useMemo(
    () => products.filter((p) => selected.includes(p.slug)),
    [products, selected],
  )

  const add = useCart((s) => s.add)
  const addAll = () => {
    list.forEach((p) => {
      const min = p.vials.reduce((m, v) => (v.priceCents < m.priceCents ? v : m), p.vials[0]!)
      const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
      if (!min.contactOnly && min.priceCents > 0) {
        add({
          productSlug: p.slug,
          sku: min.sku,
          name: `${translation.name} ${min.mg}mg`,
          mg: min.mg,
          qty: 1,
          unitPriceCents: min.priceCents,
        })
      }
    })
    toast.success(`Added ${list.length} products to cart`)
  }

  return (
    <div>
      <div className="mb-6 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Choose products to compare ({selected.length}/{max})
          </p>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-ink-muted hover:text-danger"
            >
              Clear all
            </button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {products.map((p) => {
            const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
            const checked = selected.includes(p.slug)
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => toggle(p.slug)}
                disabled={!checked && selected.length >= max}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  checked
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-surface text-ink-muted hover:border-accent/40",
                )}
              >
                <FlaskConical className="h-3 w-3" />
                {translation.name}
                {checked ? <Check className="h-3 w-3" /> : null}
              </button>
            )
          })}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-16 text-center">
          <FlaskConical className="mx-auto h-10 w-10 text-ink-subtle" />
          <p className="mt-4 font-display text-lg">No products selected for comparison.</p>
          <p className="mt-2 text-sm text-ink-muted">
            Toggle products above, or tap the “Compare” button on any product card.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="sticky left-0 z-10 bg-surface-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  Attribute
                </th>
                {list.map((p) => {
                  const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
                  return (
                    <th key={p.slug} className="min-w-[180px] px-4 py-3 text-left">
                      <div
                        className="hue-dot mb-1 h-1 w-12 rounded-full"
                        style={{ "--cat-hue": p.hue } as CSSProperties}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-sm font-semibold">
                            {translation.name}
                          </div>
                          <div className="font-mono text-3xs text-ink-subtle">
                            {p.vials[0]?.sku}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(p.slug)}
                          aria-label={`${tCommon("close")} — ${translation.name}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-2 hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-surface-2/40">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                    {row.label}
                  </td>
                  {list.map((p) => (
                    <td key={p.slug} className={cn("px-4 py-3", row.mono && "font-mono text-xs")}>
                      {row.render(p, String(locale))}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  Availability
                </td>
                {list.map((p) => {
                  const total = p.vials.reduce((s, v) => s + v.stockQty, 0)
                  return (
                    <td key={p.slug} className="px-4 py-3">
                      {total === 0 ? (
                        <Badge tone="muted">Contact</Badge>
                      ) : total < 25 ? (
                        <Badge tone="warn">Low ({total})</Badge>
                      ) : (
                        <Badge tone="success">In stock ({total})</Badge>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  From price
                </td>
                {list.map((p) => {
                  const min = p.vials.reduce(
                    (m, v) => (v.priceCents < m.priceCents ? v : m),
                    p.vials[0]!,
                  )
                  const isContact = min.contactOnly === true || min.priceCents === 0
                  return (
                    <td key={p.slug} className="px-4 py-3">
                      {isContact ? (
                        <Badge tone="muted">Quote</Badge>
                      ) : (
                        <span className="font-display text-base font-semibold">
                          {formatCurrency(min.priceCents, "EUR", locale)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  Add to cart
                </td>
                {list.map((p) => {
                  const min = p.vials.reduce(
                    (m, v) => (v.priceCents < m.priceCents ? v : m),
                    p.vials[0]!,
                  )
                  const isContact = min.contactOnly === true || min.priceCents === 0
                  const oos = !isContact && min.stockQty === 0
                  return (
                    <td key={p.slug} className="px-4 py-3">
                      <Link
                        href={`/${locale}/shop/${p.slug}`}
                        className="inline-flex h-8 items-center gap-1 rounded-[var(--radius)] bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        {oos ? "Notify" : isContact ? "Quote" : "Add"}
                      </Link>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {list.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            Showing {list.length} of {max} products · saved across sessions in this browser
          </p>
          <button
            type="button"
            onClick={addAll}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            <ShoppingBag className="h-4 w-4" />
            Add all to cart
          </button>
        </div>
      ) : null}
    </div>
  )
}
