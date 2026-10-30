import { forumDrafts } from "@/db/schema"
import { getCurrentMember } from "@/lib/community/auth"
import { db } from "@/lib/db"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
const schema = z
  .object({
    title: z.string().max(140),
    body: z.string().max(8000),
    categorySlug: z.string().max(64),
    locale: z.enum(["en", "fi"]),
  })
  .strict()
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  const [draft] = await db.select().from(forumDrafts).where(eq(forumDrafts.ownerId, member.id))
  return NextResponse.json(
    { draft: draft ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
export async function PUT(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  await db
    .insert(forumDrafts)
    .values({ ownerId: member.id, ...parsed.data })
    .onConflictDoUpdate({
      target: forumDrafts.ownerId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
  return NextResponse.json({ saved: true })
}
export async function DELETE() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  await db.delete(forumDrafts).where(eq(forumDrafts.ownerId, member.id))
  return NextResponse.json({ deleted: true })
}
