import { getCurrentMember, toggleReaction } from "@/lib/community"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  postId: z.string().min(1).max(64),
  kind: z.enum(["helpful", "insightful", "thanks"]),
})

export async function POST(req: Request) {
  const member = await getCurrentMember()
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`forum:reaction:${member.id}`, { limit: 60, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many reactions." }, { status: 429 })
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

  try {
    const result = await toggleReaction(parsed.data.postId, parsed.data.kind)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed."
    if (msg.includes("own post")) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to toggle reaction." }, { status: 500 })
  }
}
