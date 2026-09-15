import { referralRedemptions, rewardsAccounts } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  referralCode: z.string().min(4).max(32),
})

export async function POST(req: Request) {
  const member = await getCurrentMember().catch(() => null)
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`referral:redeem:${member.id}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 })
  }

  const code = body.referralCode.trim().toUpperCase()

  const referrer = await db
    .select({ userId: rewardsAccounts.userId })
    .from(rewardsAccounts)
    .where(eq(rewardsAccounts.referralCode, code))
    .limit(1)

  // Generic response — do not confirm which codes exist.
  if (!referrer[0] || referrer[0].userId === member.id) {
    return NextResponse.json({ error: "Invalid or already used referral code." }, { status: 400 })
  }

  const referrerId = referrer[0].userId

  const existing = await db
    .select({ id: referralRedemptions.id })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, member.id))
    .limit(1)

  if (existing[0]) {
    return NextResponse.json({ error: "Invalid or already used referral code." }, { status: 409 })
  }

  await db.insert(referralRedemptions).values({
    referrerId,
    referredUserId: member.id,
    referrerCreditCents: 1500,
    referredDiscountCents: 1500,
    status: "pending",
  })

  await db
    .insert(rewardsAccounts)
    .values({ userId: member.id, referredBy: referrerId })
    .onConflictDoUpdate({
      target: rewardsAccounts.userId,
      set: { referredBy: referrerId },
    })

  return NextResponse.json({
    success: true,
    message: "Referral applied. €15 discount will be applied at checkout.",
  })
}
