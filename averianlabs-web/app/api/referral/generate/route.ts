import { randomBytes } from "node:crypto"
import { rewardsAccounts } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

function nanoid(size = 12): string {
  return randomBytes(size).toString("base64url").slice(0, size)
}

export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  // Auth provider outages become "no user" with this .catch — surface them
  // to monitoring instead of silently treating them as 401.
  const member = await getCurrentMember().catch((err) => {
    logger.error("[referral:generate] auth lookup failed", err)
    return null
  })
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`referral:generate:${member.id}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
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
  } catch (err) {
    logger.error("[referral:generate] DB operation failed", err)
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
