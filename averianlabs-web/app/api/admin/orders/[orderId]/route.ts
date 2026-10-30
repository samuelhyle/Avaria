import { adminErrorStatus, requireAdmin } from "@/lib/admin/guard"
import { getAdminOrderDetail } from "@/lib/admin/orders"
import { logAudit } from "@/lib/audit/log"
import { RefundError, refundOrder } from "@/lib/orders/refund"
import { markOrderDelivered, markOrderPacked, markOrderShipped } from "@/lib/orders/service"
import { InvalidOrderTransition } from "@/lib/orders/status"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { NextResponse } from "next/server"
import { z } from "zod"

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pack") }),
  z.object({
    action: z.literal("ship"),
    carrier: z.string().trim().min(1).max(64),
    service: z.string().trim().min(1).max(64),
    trackingNumber: z.string().trim().max(120).optional(),
    labelUrl: z.string().url().max(500).optional(),
  }),
  z.object({ action: z.literal("deliver") }),
  z.object({
    action: z.literal("refund"),
    /** How the money goes back. `crypto` and `manual` need their own detail. */
    method: z.enum(["stripe", "crypto", "manual"]).default("stripe"),
    cryptoTxHash: z.string().trim().max(200).optional(),
    reason: z.string().trim().max(500).optional(),
  }),
])

/** Order detail, including the items and the shipment records. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireAdmin()
  } catch (error) {
    const status =
      error instanceof Error && error.name === "AdminAccessError"
        ? adminErrorStatus(error as never)
        : 401
    return NextResponse.json({ error: "Not permitted." }, { status })
  }
  const { orderId } = await params
  const order = await getAdminOrderDetail(orderId)
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } })
}

/**
 * Fulfilment actions.
 *
 * Every mutation goes through `lib/orders/service.ts`, which enforces the
 * status machine and records the shipment row, so the customer-facing state
 * and the operations state can never disagree.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  let member: Awaited<ReturnType<typeof requireAdmin>>
  try {
    member = await requireAdmin()
  } catch (error) {
    const status =
      error instanceof Error && error.name === "AdminAccessError"
        ? adminErrorStatus(error as never)
        : 401
    return NextResponse.json({ error: "Not permitted." }, { status })
  }
  const { orderId } = await params
  const body = await request.json().catch(() => null)
  const parsed = Patch.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

  try {
    switch (parsed.data.action) {
      case "pack": {
        const ok = await markOrderPacked(orderId)
        if (!ok)
          return NextResponse.json({ error: "This order cannot be packed." }, { status: 409 })
        break
      }
      case "ship": {
        await markOrderShipped(orderId, {
          carrier: parsed.data.carrier,
          service: parsed.data.service,
          trackingNumber: parsed.data.trackingNumber ?? null,
          labelUrl: parsed.data.labelUrl ?? null,
        })
        break
      }
      case "deliver": {
        const ok = await markOrderDelivered(orderId)
        if (!ok)
          return NextResponse.json({ error: "This order cannot be delivered." }, { status: 409 })
        break
      }
      case "refund": {
        // The refund moves the money. Flipping the status alone would tell
        // the operator the customer had been paid back when they had not.
        const result = await refundOrder({
          orderId,
          method: parsed.data.method,
          cryptoTxHash: parsed.data.cryptoTxHash,
          reason: parsed.data.reason,
          actorId: member.id,
        })
        await logAudit({
          actor: member,
          action: "order.refund",
          entity: "order",
          entityId: orderId,
          metadata: {
            method: result.method,
            reference: result.reference,
            alreadyRefunded: result.alreadyRefunded,
          },
        })
        const refunded = await getAdminOrderDetail(orderId)
        return NextResponse.json({ ok: true, refund: result, order: refunded })
      }
    }
    await logAudit({
      actor: member,
      action: `order.${parsed.data.action}`,
      entity: "order",
      entityId: orderId,
    })
    const order = await getAdminOrderDetail(orderId)
    return NextResponse.json({ ok: true, order })
  } catch (error) {
    if (error instanceof InvalidOrderTransition)
      return NextResponse.json({ error: error.message }, { status: 409 })
    if (error instanceof RefundError)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 })
    return NextResponse.json({ error: "The action could not be applied." }, { status: 500 })
  }
}
