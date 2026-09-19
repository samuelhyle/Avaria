import { getCurrentMember } from "@/lib/community"
import { isDatabaseConfigured } from "@/lib/db"
import { updatePreferences } from "@/lib/notifications"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  replyEnabled: z.boolean().optional(),
  reactionEnabled: z.boolean().optional(),
  mentionEnabled: z.boolean().optional(),
  planSharedEnabled: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
})

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Preferences are offline." }, { status: 503 })
  }
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

  try {
    const result = await updatePreferences(member.id, parsed.data)
    return NextResponse.json({ ok: true, preferences: result })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
