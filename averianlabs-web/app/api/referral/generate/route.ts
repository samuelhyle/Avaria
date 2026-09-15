import { randomBytes } from "node:crypto"
import { rewardsAccounts } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

function nanoid(size = 12): string {
  return randomBytes(size).toString("base64url").slice(0, size)
}

export async function POST() {
  const member = await getCurrentMember().catch(() => null)
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`referral:generate:${member.id}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const existing = await db
    .select({ referralCode: rewardsAccounts.referralCode })
    .from(rewardsAccounts)
    .where(eq(rewardsAccounts.userId, member.id))
    .limit(1)

  if (existing[0]?.referralCode) {
    return NextResponse.json({ code: existing[0].referralCode })
  }

  const code = nanoid(8).toUpperCase()

  await db
    .insert(rewardsAccounts)
    .values({ userId: member.id, referralCode: code })
    .onConflictDoUpdate({
      target: rewardsAccounts.userId,
      set: { referralCode: code },
    })

  return NextResponse.json({ code })
}
