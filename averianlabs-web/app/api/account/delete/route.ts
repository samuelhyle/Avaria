import { gdprRequests } from "@/db/schema"
import { db } from "@/lib/db"
import { requireMember, softDeleteUser } from "@/lib/gdpr"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const member = await requireMember().catch(() => null)
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limit = await rateLimit(`account:delete:${member.id}`, { limit: 3, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    await softDeleteUser(member.id)
    await db.insert(gdprRequests).values({
      id: crypto.randomUUID(),
      userId: member.id,
      kind: "delete",
      status: "completed",
      completedAt: new Date(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
