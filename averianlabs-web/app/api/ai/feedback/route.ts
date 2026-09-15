/**
 * POST /api/ai/feedback
 *
 * Persists thumbs up/down feedback on a message. Body: { messageId, feedback: "up" | "down" }
 */

import { aiMessages } from "@/db/schema/ai"
import { db } from "@/lib/db"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const bodySchema = z.object({
  messageId: z.string().min(1).max(128),
  feedback: z.enum(["up", "down"]),
})

export async function POST(request: Request): Promise<NextResponse> {
  const limit = await rateLimit(`ai:feedback:${clientIp(request)}`, {
    limit: 30,
    window: "1 m",
  })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  // Verify the message exists. Return 404 for clearly-bogus IDs so callers
  // can distinguish "no such message" from "feedback stored" without
  // silently swallowing errors.
  const msg = await db
    .select({ id: aiMessages.id })
    .from(aiMessages)
    .where(eq(aiMessages.id, body.messageId))
    .limit(1)
  if (!msg[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  await db
    .update(aiMessages)
    .set({ feedback: body.feedback })
    .where(eq(aiMessages.id, body.messageId))

  return NextResponse.json({ ok: true, messageId: body.messageId, feedback: body.feedback })
}
