import { randomBytes } from "node:crypto"
import { orders, promotions, referralRedemptions, rewardsAccounts } from "@/db/schema"
import { db } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"

/**
 * Referrals.
 *
 * The programme promised two things that nothing delivered: a €15 discount for
 * the person who was referred, and a €15 credit for the person who referred
 * them. The redemption row was written and never read; the discount never
 * reached the checkout and the credit was never settled.
 *
 * Both are now real:
 *
 *   - The discount is a promotion. Redeeming a referral issues a personal
 *     promotion code, and the customer types it into the cart like any other
 *     code. That means the discount is priced by the same engine as every
 *     other discount, is inside the quote hash, and cannot be tampered with.
 *
 *   - The credit is settled when the referred order is paid. The order records
 *     the promotion code it used, the redemption is found by that code, and the
 *     referrer's points balance is credited once.
 */

export const REFERRAL_DISCOUNT_CENTS = 1500
export const REFERRAL_CREDIT_CENTS = 1500

/** The order states in which the money has arrived. */
const PAID_STATES = ["paid", "packed", "shipped", "delivered"] as const

export class ReferralError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_code"
      | "already_referred"
      | "self_referral"
      | "already_credited"
      | "not_found",
  ) {
    super(message)
    this.name = "ReferralError"
  }
}

function referralCode(size = 8): string {
  return randomBytes(size)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, size)
    .toUpperCase()
}

/** The customer's own shareable code, created on first use. */
export async function issueReferralCode(userId: string): Promise<string> {
  const existing = await db
    .select()
    .from(rewardsAccounts)
    .where(eq(rewardsAccounts.userId, userId))
    .limit(1)
  if (existing[0]?.referralCode) return existing[0].referralCode
  const code = referralCode()
  await db
    .insert(rewardsAccounts)
    .values({ userId, referralCode: code })
    .onConflictDoUpdate({ target: rewardsAccounts.userId, set: { referralCode: code } })
  return code
}

/**
 * Redeem somebody else's code.
 *
 * Issues a personal discount code for the referred customer and records the
 * redemption so the referrer can be credited when the order is paid.
 */
export async function redeemReferralCode(
  code: string,
  userId: string,
): Promise<{ discountCode: string; discountCents: number }> {
  const normalised = code.trim().toUpperCase()
  const referrers = await db
    .select({ userId: rewardsAccounts.userId })
    .from(rewardsAccounts)
    .where(eq(rewardsAccounts.referralCode, normalised))
    .limit(1)
  const referrer = referrers[0]
  if (!referrer) throw new ReferralError("Invalid referral code.", "invalid_code")
  if (referrer.userId === userId)
    throw new ReferralError("You cannot use your own referral code.", "self_referral")

  const existing = await db
    .select({ id: referralRedemptions.id })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, userId))
    .limit(1)
  if (existing[0])
    throw new ReferralError("You have already used a referral code.", "already_referred")

  // A personal code for the referred customer, so the discount applies to
  // their next order whichever way they check out — as a guest or signed in.
  const discountCode = `REF-${referralCode(10)}`
  const inserted = await db
    .insert(referralRedemptions)
    .values({
      referrerId: referrer.userId,
      referredUserId: userId,
      referrerCreditCents: REFERRAL_CREDIT_CENTS,
      referredDiscountCents: REFERRAL_DISCOUNT_CENTS,
      promotionCode: discountCode,
      status: "pending",
    })
    .returning({ id: referralRedemptions.id })
  if (!inserted[0]) throw new ReferralError("The referral could not be recorded.", "not_found")

  await db
    .insert(promotions)
    .values({
      code: discountCode,
      kind: "fixed",
      value: REFERRAL_DISCOUNT_CENTS,
      minSubtotalCents: 0,
      maxRedemptions: 1,
      label: "Referral discount",
    })
    .onConflictDoNothing({ target: promotions.code })

  await db
    .insert(rewardsAccounts)
    .values({ userId, referredBy: referrer.userId })
    .onConflictDoUpdate({
      target: rewardsAccounts.userId,
      set: { referredBy: referrer.userId },
    })

  return { discountCode, discountCents: REFERRAL_DISCOUNT_CENTS }
}

/**
 * Credit the referrer when the referred order is paid.
 *
 * Runs once per order: the redemption moves to `credited` and the points
 * balance goes up. A second call for the same order finds the redemption
 * already credited and does nothing.
 */
export async function settleReferralCredit(orderId: string): Promise<{
  referrerId: string
  creditCents: number
} | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order?.promoCode) return null
  // The credit is earned when the money arrives, not when the order is placed.
  if (!(PAID_STATES as readonly string[]).includes(order.status)) return null
  const found = await db
    .select()
    .from(referralRedemptions)
    .where(
      and(
        eq(referralRedemptions.promotionCode, order.promoCode),
        eq(referralRedemptions.status, "pending"),
      ),
    )
    .limit(1)
  const redemption = found[0]
  if (!redemption) return null

  const claimed = await db
    .update(referralRedemptions)
    .set({ status: "credited", orderId })
    .where(
      and(eq(referralRedemptions.id, redemption.id), eq(referralRedemptions.status, "pending")),
    )
    .returning({ id: referralRedemptions.id })
  if (!claimed.length) return null

  await db
    .insert(rewardsAccounts)
    .values({
      userId: redemption.referrerId,
      pointsBalance: redemption.referrerCreditCents,
    })
    .onConflictDoUpdate({
      target: rewardsAccounts.userId,
      set: {
        pointsBalance: sql`${rewardsAccounts.pointsBalance} + ${redemption.referrerCreditCents}`,
      },
    })

  return {
    referrerId: redemption.referrerId,
    creditCents: redemption.referrerCreditCents,
  }
}

/** The customer's points balance and referral code. */
export async function getRewardsAccount(userId: string) {
  const rows = await db
    .select()
    .from(rewardsAccounts)
    .where(eq(rewardsAccounts.userId, userId))
    .limit(1)
  const row = rows[0]
  if (!row) return { referralCode: null, pointsBalance: 0, creditedCents: 0 }
  const credited = await db
    .select({ total: referralRedemptions.referrerCreditCents })
    .from(referralRedemptions)
    .where(
      and(eq(referralRedemptions.referrerId, userId), eq(referralRedemptions.status, "credited")),
    )
  return {
    referralCode: row.referralCode,
    pointsBalance: row.pointsBalance,
    creditedCents: credited.reduce((sum, entry) => sum + entry.total, 0),
  }
}
