import { partnerApplications } from "@/db/schema"
import { db } from "@/lib/db"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  orgName: z.string().min(2).max(200),
  contactEmail: z.string().email().max(254),
  country: z.string().min(2).max(100),
  useCase: z.string().max(2000).optional(),
  volume: z.number().int().min(0).optional(),
})

export async function POST(request: Request) {
  const limit = await rateLimit(`partner:ip:${clientIp(request)}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 })
  }

  try {
    await db.insert(partnerApplications).values({
      orgName: parsed.orgName,
      contactEmail: parsed.contactEmail,
      country: parsed.country,
      useCase: parsed.useCase ?? null,
      volume: parsed.volume ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[partner] application failed", err)
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 })
  }
}
