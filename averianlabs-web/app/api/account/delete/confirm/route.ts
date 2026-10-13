import { gdprRequests } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { confirmDeleteRequest } from "@/lib/gdpr/service"
import { and, eq, gt } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
export async function POST(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ code: "unauthorized" }, { status: 401 })
  const parsed = z
    .object({ token: z.string().min(20).max(256) })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "invalid" }, { status: 400 })
  const [row] = await db
    .select()
    .from(gdprRequests)
    .where(
      and(
        eq(gdprRequests.token, parsed.data.token),
        eq(gdprRequests.userId, member.id),
        eq(gdprRequests.kind, "delete"),
        eq(gdprRequests.status, "pending"),
        gt(gdprRequests.tokenExpiresAt, new Date()),
      ),
    )
  if (!row) return NextResponse.json({ code: "expired" }, { status: 410 })
  const ok = await confirmDeleteRequest(row.id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 })
}
