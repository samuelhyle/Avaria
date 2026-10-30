import { getCurrentMember } from "@/lib/community"
import { issueReferralCode } from "@/lib/referral/service"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

/**
 * The customer's own shareable referral code.
 *
 * Created on first use and stable afterwards, so a link the customer has
 * already shared keeps working.
 */
export async function POST() {
  const member = await getCurrentMember().catch(() => null)
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`referral:generate:${member.id}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const code = await issueReferralCode(member.id)
  return NextResponse.json({ code })
}
