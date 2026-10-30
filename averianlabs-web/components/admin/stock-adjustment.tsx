"use client"

import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Set the stock of one SKU, and the level at which it is flagged as low.
 *
 * Stock is adjusted by an absolute count rather than a delta: the operator
 * counts what is on the shelf and types the number in. A delta invites
 * double-application. The threshold is what the inventory panel uses to mark
 * a row as running out.
 */
export function StockAdjustment({
  vialId,
  sku,
  stockQty,
  lowStockThreshold,
  labels,
}: {
  vialId: string
  sku: string
  stockQty: number
  lowStockThreshold: number | null
  labels: {
    set: string
    threshold: string
    save: string
    saved: string
    failed: string
  }
}) {
  const router = useRouter()
  const [value, setValue] = useState(String(stockQty))
  const [threshold, setThreshold] = useState(
    lowStockThreshold === null ? "" : String(lowStockThreshold),
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const next = Number(value)
    if (!Number.isInteger(next) || next < 0) {
      setError(labels.failed)
      return
    }
    const parsedThreshold = threshold.trim() === "" ? null : Number(threshold)
    if (parsedThreshold !== null && (!Number.isInteger(parsedThreshold) || parsedThreshold < 0)) {
      setError(labels.failed)
      return
    }
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/vials/${encodeURIComponent(vialId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQty: next, lowStockThreshold: parsedThreshold }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? labels.failed)
        return
      }
      setMessage(labels.saved)
      router.refresh()
    } catch {
      setError(labels.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`stock-${vialId}`}>
        {labels.set} {sku}
      </label>
      <input
        id={`stock-${vialId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="numeric"
        className="h-8 w-16 rounded-[var(--radius-sm)] border border-line bg-surface px-2 font-mono text-xs tabular-nums outline-none focus-visible:border-accent"
      />
      <label className="sr-only" htmlFor={`threshold-${vialId}`}>
        {labels.threshold} {sku}
      </label>
      <input
        id={`threshold-${vialId}`}
        value={threshold}
        onChange={(event) => setThreshold(event.target.value)}
        placeholder={labels.threshold}
        inputMode="numeric"
        className="h-8 w-20 rounded-[var(--radius-sm)] border border-line bg-surface px-2 font-mono text-xs tabular-nums outline-none focus-visible:border-accent"
      />
      <Button size="sm" variant="outline" disabled={busy} onClick={save}>
        {labels.save}
      </Button>
      {message ? (
        <span role="status" className="text-2xs text-success">
          {message}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-2xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}
