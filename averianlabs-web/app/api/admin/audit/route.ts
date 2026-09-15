import { AdminAccessError, adminErrorStatus, getAdminOrNull } from "@/lib/admin"
import { listAuditEvents } from "@/lib/audit/log"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const member = await getAdminOrNull()
    if (!member) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    const url = new URL(req.url)
    const entity = url.searchParams.get("entity") ?? undefined
    const actorId = url.searchParams.get("actorId") ?? undefined
    const rawLimit = Number(url.searchParams.get("limit") ?? "100")
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 500) : 100
    const events = await listAuditEvents({
      entity: entity || undefined,
      actorId: actorId || undefined,
      limit,
    })
    return NextResponse.json({ events })
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: adminErrorStatus(e) })
    }
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
