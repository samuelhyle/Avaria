import { vials } from "@/db/schema"
import { adminErrorStatus, requireAdmin } from "@/lib/admin/guard"
import { logAudit } from "@/lib/audit/log"
import { db } from "@/lib/db"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const Patch = z.object({
  /** The absolute new count. Stock is never adjusted by a delta. */
  stockQty: z.number().int().min(0).max(1_000_000),
  /** The level at which the inventory panel flags the SKU. `null` clears it. */
  lowStockThreshold: z.number().int().min(0).max(1_000_000).nullable().optional(),
})

/**
 * Set the stock of one SKU.
 *
 * The stock a vial holds is the stock the store will sell. A wrong number
 * here either oversells a batch that does not exist or hides one that does.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ vialId: string }> }) {
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
  const { vialId } = await params
  const body = await request.json().catch(() => null)
  const parsed = Patch.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

  const [row] = await db
    .update(vials)
    .set({
      stockQty: parsed.data.stockQty,
      ...(parsed.data.lowStockThreshold !== undefined
        ? { lowStockThreshold: parsed.data.lowStockThreshold }
        : {}),
    })
    .where(eq(vials.id, vialId))
    .returning({
      id: vials.id,
      sku: vials.sku,
      stockQty: vials.stockQty,
      lowStockThreshold: vials.lowStockThreshold,
    })
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 })
  await logAudit({
    actor: member,
    action: "vial.stock",
    entity: "vial",
    entityId: vialId,
    metadata: {
      sku: row.sku,
      stockQty: row.stockQty,
      lowStockThreshold: row.lowStockThreshold,
    },
  })
  return NextResponse.json({ ok: true, vial: row })
}
