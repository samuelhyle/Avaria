import { orders, promotions, referralRedemptions, rewardsAccounts, users } from "@/db/schema"
import { db } from "@/lib/db"
import { quoteCart } from "@/lib/orders/quote"
import { createOrder } from "@/lib/orders/service"
import { getRewardsAccount, redeemReferralCode, settleReferralCredit } from "@/lib/referral/service"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { and, eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * Referrals.
 *
 * The programme promised a €15 discount for the referred customer and a €15
 * credit for the referrer. The redemption row was written and never read, so
 * neither happened.
 *
 * These tests cover the two halves of the promise: the discount reaches the
 * quote as a real promotion, and the credit is settled when the order is paid.
 */

const SKU = "QA-PEPTIDE-10"

function requireIsolatedDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
}

async function makeUser(email: string): Promise<string> {
  const id = crypto.randomUUID()
  // A unique address per run, so a failed run cannot block the next one.
  const unique = `${email.split("@")[0]}-${id.slice(0, 8)}@example.invalid`
  await db.insert(users).values({ id, email: unique, role: "customer" })
  return id
}

async function cleanupUser(id: string) {
  // The referral records reference the user, so they go first. The GDPR
  // service does the same before it deletes a user.
  await db.delete(referralRedemptions).where(eq(referralRedemptions.referrerId, id))
  await db.delete(referralRedemptions).where(eq(referralRedemptions.referredUserId, id))
  await db.delete(rewardsAccounts).where(eq(rewardsAccounts.userId, id))
  await db.delete(rewardsAccounts).where(eq(rewardsAccounts.referredBy, id))
  await db.update(orders).set({ userId: null }).where(eq(orders.userId, id))
  await db.delete(users).where(eq(users.id, id))
}

it("issues a real discount that reaches the quote", async () => {
  requireIsolatedDatabase()
  const referrerId = await makeUser("referrer@example.invalid")
  const referredId = await makeUser("referred@example.invalid")
  try {
    const { issueReferralCode } = await import("@/lib/referral/service")
    const code = await issueReferralCode(referrerId)
    expect(code).toMatch(/^[A-Z0-9]{6,}$/)

    const redemption = await redeemReferralCode(code, referredId)
    expect(redemption.discountCents).toBe(1500)
    expect(redemption.discountCode).toMatch(/^REF-/)

    // The discount is a promotion, so the ordinary pricing path applies it.
    const plain = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false)
    const discounted = await quoteCart(
      [{ sku: SKU, qty: 1 }],
      990,
      "en",
      db,
      false,
      redemption.discountCode,
    )
    expect(discounted.discountCents).toBe(1500)
    expect(discounted.totalCents).toBe(plain.totalCents - 1500)
    // The quote hash covers the discount, so a quote priced without it cannot
    // be spent with it.
    expect(discounted.hash).not.toBe(plain.hash)

    // The promotion really exists and is limited to one use.
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.code, redemption.discountCode))
    expect(promotion).toBeTruthy()
    expect(promotion.kind).toBe("fixed")
    expect(promotion.value).toBe(1500)
    expect(promotion.maxRedemptions).toBe(1)
  } finally {
    await cleanupUser(referrerId)
    await cleanupUser(referredId)
  }
})

it("credits the referrer once the referred order is paid", async () => {
  requireIsolatedDatabase()
  const referrerId = await makeUser("referrer2@example.invalid")
  const referredId = await makeUser("referred2@example.invalid")
  try {
    const { issueReferralCode } = await import("@/lib/referral/service")
    const code = await issueReferralCode(referrerId)
    const redemption = await redeemReferralCode(code, referredId)

    await withFixtureStock([SKU], async () => {
      const order = await createOrder({
        email: "referred2@example.invalid",
        userId: referredId,
        items: [{ sku: SKU, qty: 1 }],
        shippingCents: 990,
        locale: "en",
        termsAccepted: true,
        promoCode: redemption.discountCode,
        checkoutKey: crypto.randomUUID(),
      })
      try {
        // The order records the code it used.
        const [row] = await db.select().from(orders).where(eq(orders.id, order.id))
        expect(row.promoCode).toBe(redemption.discountCode)

        // Nothing is credited before the order is paid.
        expect(await settleReferralCredit(order.id)).toBeNull()
        const before = await getRewardsAccount(referrerId)
        expect(before.pointsBalance).toBe(0)

        // Once it is paid, the referrer is credited.
        await db.update(orders).set({ status: "paid" }).where(eq(orders.id, order.id))
        const settled = await settleReferralCredit(order.id)
        expect(settled?.creditCents).toBe(1500)
        const after = await getRewardsAccount(referrerId)
        expect(after.pointsBalance).toBe(1500)

        // A second settlement does not credit again.
        expect(await settleReferralCredit(order.id)).toBeNull()
        const again = await getRewardsAccount(referrerId)
        expect(again.pointsBalance).toBe(1500)

        const [record] = await db
          .select()
          .from(referralRedemptions)
          .where(eq(referralRedemptions.referredUserId, referredId))
        expect(record.status).toBe("credited")
        expect(record.orderId).toBe(order.id)
      } finally {
        await db.delete(orders).where(eq(orders.id, order.id))
      }
    })
  } finally {
    await cleanupUser(referrerId)
    await cleanupUser(referredId)
  }
})

it("refuses a self-referral and a second redemption", async () => {
  requireIsolatedDatabase()
  const userId = await makeUser("self@example.invalid")
  try {
    const { issueReferralCode } = await import("@/lib/referral/service")
    const code = await issueReferralCode(userId)
    await expect(redeemReferralCode(code, userId)).rejects.toMatchObject({
      code: "self_referral",
    })
  } finally {
    await cleanupUser(userId)
  }

  const referrerId = await makeUser("referrer3@example.invalid")
  const firstId = await makeUser("first3@example.invalid")
  const secondId = await makeUser("second3@example.invalid")
  try {
    const { issueReferralCode } = await import("@/lib/referral/service")
    const code = await issueReferralCode(referrerId)
    await redeemReferralCode(code, firstId)
    // The referrer's code is shareable: a second colleague may use it too.
    const second = await redeemReferralCode(code, secondId)
    expect(second.discountCode).toMatch(/^REF-/)
    // But one customer may only use one referral.
    await expect(redeemReferralCode(code, firstId)).rejects.toMatchObject({
      code: "already_referred",
    })
  } finally {
    await cleanupUser(referrerId)
    await cleanupUser(firstId)
    await cleanupUser(secondId)
  }
})

it("refuses an unknown code", async () => {
  requireIsolatedDatabase()
  const userId = await makeUser("unknown@example.invalid")
  try {
    await expect(redeemReferralCode("NOPE0000", userId)).rejects.toMatchObject({
      code: "invalid_code",
    })
  } finally {
    await cleanupUser(userId)
  }
})
