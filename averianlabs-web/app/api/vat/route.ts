import { logger } from "@/lib/logger"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { validateVatId } from "@/lib/vat"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  vatId: z.string().min(5).max(20),
})

export async function POST(request: Request) {
  const limit = await rateLimit(`vat:ip:${clientIp(request)}`, { limit: 30, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid VAT ID." }, { status: 400 })
  }

  try {
    const result = await validateVatId(parsed.vatId)
    return NextResponse.json(result)
  } catch (err) {
    logger.error("[vat] validation failed", err)
    return NextResponse.json({ error: "VAT validation unavailable." }, { status: 502 })
  }
}
