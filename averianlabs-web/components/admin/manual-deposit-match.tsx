"use client"

import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Attach an unmatched deposit to an invoice by hand.
 *
 * The automatic matcher covers the ordinary case. This is the escape hatch for
 * a deposit that is short, a deposit to an address that is no longer in use,
 * or a payment that arrived after its order was closed. The operator reads the
 * transaction hash from the customer's message and types it in.
 */
export function ManualDepositMatch({
  sessionId,
  chain,
  labels,
}: {
  sessionId: string
  chain: string
  labels: {
    heading: string
    hint: string
    txHash: string
    assign: string
    saved: string
    failed: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function assign() {
    if (!txHash.trim() || busy) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/admin/crypto/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, txHash: txHash.trim(), sessionId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? labels.failed)
        return
      }
      setMessage(labels.saved)
      setTxHash("")
      setOpen(false)
      router.refresh()
    } catch {
      setError(labels.failed)
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => setOpen(true)}
      >
        {labels.heading}
      </Button>
    )

  return (
    <div className="mt-4 space-y-2 rounded-[var(--radius)] border border-line bg-surface-2/50 p-3">
      <p className="text-2xs text-ink-muted">{labels.hint}</p>
      <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
        {labels.txHash}
        <input
          value={txHash}
          onChange={(event) => setTxHash(event.target.value)}
          placeholder="0x… or a transaction hash"
          className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 font-mono text-xs outline-none focus-visible:border-accent"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !txHash.trim()} onClick={assign}>
          {labels.assign}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          ✕
        </Button>
      </div>
      {message ? (
        <p role="status" className="text-xs text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
