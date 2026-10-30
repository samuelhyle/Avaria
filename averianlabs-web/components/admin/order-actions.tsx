"use client"

import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export interface OrderActionLabels {
  heading: string
  pack: string
  ship: string
  deliver: string
  refund: string
  carrier: string
  service: string
  trackingNumber: string
  saved: string
  failed: string
  refundMethod: string
  refundStripe: string
  refundCrypto: string
  refundManual: string
  refundHash: string
  refundReason: string
  refundConfirm: string
}

/**
 * Fulfilment controls for one order.
 *
 * Each button posts to the admin order API, which enforces the order status
 * machine. The panel hides the actions that do not apply to the current state
 * so the operator only ever sees a legal move.
 */
export function OrderActions({
  orderId,
  status,
  labels,
}: {
  orderId: string
  status: string
  locale: string
  labels: OrderActionLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [carrier, setCarrier] = useState("Posti")
  const [service, setService] = useState("Standard")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [refundMethod, setRefundMethod] = useState<"stripe" | "crypto" | "manual">("stripe")
  const [refundHash, setRefundHash] = useState("")
  const [refundReason, setRefundReason] = useState("")

  const canPack = status === "paid" || status === "payment_review"
  const canShip = status === "paid" || status === "packed" || status === "payment_review"
  const canDeliver = status === "shipped"
  const canRefund = ["paid", "packed", "shipped", "delivered", "payment_review"].includes(status)

  async function run(action: string, body: Record<string, unknown> = {}) {
    setBusy(action)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
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
      setBusy(null)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
        {labels.heading}
      </h2>

      {canPack ? (
        <Button
          fullWidth
          variant="outline"
          className="mb-2"
          disabled={busy !== null}
          onClick={() => run("pack")}
        >
          {labels.pack}
        </Button>
      ) : null}

      {canShip ? (
        <div className="mb-3 space-y-2 rounded-[var(--radius)] border border-line p-3">
          <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
            {labels.carrier}
            <input
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 text-sm outline-none focus-visible:border-accent"
            />
          </label>
          <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
            {labels.service}
            <input
              value={service}
              onChange={(event) => setService(event.target.value)}
              className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 text-sm outline-none focus-visible:border-accent"
            />
          </label>
          <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
            {labels.trackingNumber}
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="optional"
              className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 font-mono text-sm outline-none focus-visible:border-accent"
            />
          </label>
          <Button
            fullWidth
            disabled={busy !== null || !carrier.trim() || !service.trim()}
            onClick={() =>
              run("ship", {
                carrier: carrier.trim(),
                service: service.trim(),
                trackingNumber: trackingNumber.trim() || undefined,
              })
            }
          >
            {labels.ship}
          </Button>
        </div>
      ) : null}

      {canDeliver ? (
        <Button
          fullWidth
          variant="outline"
          className="mb-2"
          disabled={busy !== null}
          onClick={() => run("deliver")}
        >
          {labels.deliver}
        </Button>
      ) : null}

      {canRefund ? (
        <div className="mt-4 space-y-2 rounded-[var(--radius)] border border-line p-3">
          <p className="text-2xs uppercase tracking-wider text-ink-subtle">{labels.refundMethod}</p>
          <div className="space-y-1">
            {(
              [
                { id: "stripe", label: labels.refundStripe },
                { id: "crypto", label: labels.refundCrypto },
                { id: "manual", label: labels.refundManual },
              ] as const
            ).map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="refund-method"
                  value={option.id}
                  checked={refundMethod === option.id}
                  onChange={() => setRefundMethod(option.id)}
                />
                {option.label}
              </label>
            ))}
          </div>
          {refundMethod === "crypto" ? (
            <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
              {labels.refundHash}
              <input
                value={refundHash}
                onChange={(event) => setRefundHash(event.target.value)}
                placeholder="0x…"
                className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 font-mono text-xs outline-none focus-visible:border-accent"
              />
            </label>
          ) : null}
          {refundMethod === "manual" ? (
            <label className="block text-2xs uppercase tracking-wider text-ink-subtle">
              {labels.refundReason}
              <input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="settled by bank transfer"
                className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-xs outline-none focus-visible:border-accent"
              />
            </label>
          ) : null}
          <Button
            size="sm"
            variant="danger"
            fullWidth
            disabled={
              busy !== null ||
              (refundMethod === "crypto" && refundHash.trim().length < 16) ||
              (refundMethod === "manual" && refundReason.trim().length < 4)
            }
            onClick={() =>
              run("refund", {
                method: refundMethod,
                cryptoTxHash: refundMethod === "crypto" ? refundHash.trim() : undefined,
                reason: refundMethod === "manual" ? refundReason.trim() : undefined,
              })
            }
          >
            {labels.refund}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p role="status" className="mt-3 text-xs text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
