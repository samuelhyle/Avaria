import { documents } from "@/db/schema"
import { logAudit } from "@/lib/audit/log"
import { requireRole } from "@/lib/community/auth"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const Patch = z.object({
  title: z.string().min(3).max(200).optional(),
  version: z.string().min(1).max(20).optional(),
  fileR2Key: z.string().max(500).nullable().optional(),
  externalUrl: z.string().url().max(1000).nullable().optional(),
})

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await requireRole(["admin", "moderator"]).catch(() => null)
  if (!member) {
    return NextResponse.json({ ok: false, reason: "Insufficient permissions." }, { status: 403 })
  }
  const { id } = await ctx.params
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Patch.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "Invalid input." }, { status: 400 })
  }

  try {
    await db
      .update(documents)
      .set({
        ...parsed.data,
        ...(parsed.data.fileR2Key === undefined ? {} : { fileR2Key: parsed.data.fileR2Key }),
        ...(parsed.data.externalUrl === undefined ? {} : { externalUrl: parsed.data.externalUrl }),
      })
      .where(eq(documents.id, id))
    await logAudit({
      actor: member,
      action: "document.update",
      entity: "documents",
      entityId: id,
      metadata: parsed.data,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await requireRole(["admin", "moderator"]).catch(() => null)
  if (!member) {
    return NextResponse.json({ ok: false, reason: "Insufficient permissions." }, { status: 403 })
  }
  const { id } = await ctx.params
  try {
    await db.delete(documents).where(eq(documents.id, id))
    await logAudit({
      actor: member,
      action: "document.delete",
      entity: "documents",
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}
