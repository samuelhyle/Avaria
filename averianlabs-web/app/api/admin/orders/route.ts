import { adminErrorStatus, requireAdmin } from "@/lib/admin/guard"
import { listAdminOrders } from "@/lib/admin/orders"
import { NextResponse } from "next/server"

/**
 * Admin order list. Read-only.
 *
 * `?status=` `?paymentMethod=` `?query=` `?from=` `?to=` `?limit=` `?offset=`
 */
export async function GET(request: Request) {
  try {
    await requireAdmin()
  } catch (error) {
    const status =
      error instanceof Error && error.name === "AdminAccessError"
        ? adminErrorStatus(error as never)
        : 401
    return NextResponse.json({ error: "Not permitted." }, { status })
  }
  const url = new URL(request.url)
  const params = url.searchParams
  const result = await listAdminOrders({
    status: params.get("status") ?? undefined,
    paymentMethod: params.get("paymentMethod") ?? undefined,
    query: params.get("query") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
    offset: params.get("offset") ? Number(params.get("offset")) : undefined,
  })
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
}
