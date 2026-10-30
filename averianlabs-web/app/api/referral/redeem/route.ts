import { getCurrentMember } from "@/lib/community"
import { ReferralError, redeemReferralCode } from "@/lib/referral/service"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  referralCode: z.string().min(4).max(32),
})

/**
 * Redeem somebody else's referral code.
 *
 * Returns a personal discount code for the customer's next order. The discount
 * is a promotion, so it is priced on the server and reaches the checkout
 * exactly like any other code.
 */
export async function POST(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

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

  try {
    const result = await redeemReferralCode(body.referralCode, member.id)
    return NextResponse.json({
      success: true,
      code: result.discountCode,
      discountCents: result.discountCents,
      message: "Referral applied. Use the code at checkout.",
    })
  } catch (error) {
    if (error instanceof ReferralError)
      // The same message for every failure: which codes exist is not public.
      return NextResponse.json({ error: "Invalid referral code." }, { status: 400 })
    throw error
  }
}
