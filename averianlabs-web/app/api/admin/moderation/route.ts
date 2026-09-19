import { logAudit } from "@/lib/audit/log"
import { getCurrentMember, moderatorVerdict, resolveReport } from "@/lib/community"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["event", "report"]).default("event"),
  action: z.enum(["allow", "keep", "remove", "dismiss"]),
})

export async function POST(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  const member = await getCurrentMember()
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }
  if (member.role !== "admin" && member.role !== "moderator") {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }

  const { id, kind, action } = parsed.data

  if (kind === "report") {
    if (action !== "dismiss" && action !== "remove") {
      return NextResponse.json({ error: "Reports accept dismiss or remove." }, { status: 400 })
    }
    const result = await resolveReport({
      reportId: id,
      action,
      actorId: member.id,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 })
    }
    await logAudit({
      actor: member,
      action: `report.${action}`,
      entity: "forumReport",
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "dismiss") {
    return NextResponse.json(
      { error: "Moderation events accept allow, keep or remove." },
      { status: 400 },
    )
  }

  try {
    await moderatorVerdict({
      eventId: id,
      action,
      actorId: member.id,
    })
    await logAudit({
      actor: member,
      action: "moderation.verdict",
      entity: "forumModerationEvent",
      entityId: id,
      metadata: { verdict: action },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to record verdict." }, { status: 500 })
  }
}
