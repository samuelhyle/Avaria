import { users } from "@/db/schema"
import { consumeToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { hash } from "argon2"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email().max(254),
  token: z.string().min(16).max(200),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  const limit = await rateLimit(`reset:ip:${ip}`, { limit: 10, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const valid = await consumeToken(tokenIdentifiers.passwordReset(email), parsed.data.token)
  if (!valid) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    )
  }

  const passwordHash = await hash(parsed.data.password)
  const updated = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.email, email))
    .returning({ id: users.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
