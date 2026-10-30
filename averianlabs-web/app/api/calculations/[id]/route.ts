import { savedCalculations } from "@/db/schema"
import { getCurrentMember } from "@/lib/community/auth"
import { db } from "@/lib/db"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertCsrfOr403(_request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  const { id } = await params
  const items = await db
    .delete(savedCalculations)
    .where(and(eq(savedCalculations.id, id), eq(savedCalculations.ownerId, member.id)))
    .returning({ id: savedCalculations.id })
  return NextResponse.json({ deleted: items.length > 0 }, { status: items.length ? 200 : 404 })
}
