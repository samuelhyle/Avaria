import { documents } from "@/db/schema"
import { logAudit } from "@/lib/audit/log"
import { requireRole } from "@/lib/community/auth"
import { db } from "@/lib/db"
import { DOCUMENT_TYPES } from "@/lib/documents"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  type: z.enum(DOCUMENT_TYPES),
  productId: z.string().min(1).max(64).optional().nullable(),
  batchId: z.string().min(1).max(64).optional().nullable(),
  title: z.string().min(3).max(200),
  version: z.string().min(1).max(20).optional(),
  fileR2Key: z.string().max(500).optional().nullable(),
  externalUrl: z.string().url().max(1000).optional().nullable(),
})

export async function POST(req: Request) {
  const member = await requireRole(["admin", "moderator"]).catch(() => null)
  if (!member) {
    return NextResponse.json({ ok: false, reason: "Insufficient permissions." }, { status: 403 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "Invalid input." }, { status: 400 })
  }

  try {
    const id = crypto.randomUUID()
    await db.insert(documents).values({
      id,
      type: parsed.data.type,
      productId: parsed.data.productId ?? null,
      batchId: parsed.data.batchId ?? null,
      title: parsed.data.title,
      version: parsed.data.version ?? "1.0",
      fileR2Key: parsed.data.fileR2Key ?? null,
      externalUrl: parsed.data.externalUrl ?? null,
    })
    await logAudit({
      actor: member,
      action: "document.create",
      entity: "documents",
      entityId: id,
      metadata: { type: parsed.data.type, title: parsed.data.title },
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}
