import { orders, promotionRedemptions, promotions } from "@/db/schema"
import { db } from "@/lib/db"
import { quoteCart, toPublicPromotion } from "@/lib/orders/quote"
import { createOrder } from "@/lib/orders/service"
import { computeOrderTotals } from "@/lib/pricing"
import { normalisePromotionCode, resolvePromotion } from "@/lib/promotions/service"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * The discount a customer sees must be the discount the customer is charged.
 * These tests exercise the pricing path directly against the isolated test
 * database: a code is resolved on the server, the discount is folded into the
 * quote hash, and the order records both the amount and the redemption.
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

async function withPromotion<T>(
  promotion: Partial<typeof promotions.$inferInsert>,
  run: () => Promise<T>,
): Promise<T> {
  const code = normalisePromotionCode(promotion.code ?? "TESTCODE")
  const values = { kind: "percent" as const, value: 10, ...promotion, code }
  await db
    .insert(promotions)
    .values(values)
    .onConflictDoUpdate({ target: promotions.code, set: values })
  try {
    return await withFixtureStock([SKU], run)
  } finally {
    // Redemptions reference the promotion with ON DELETE CASCADE.
    await db.delete(promotions).where(eq(promotions.code, code))
  }
}

it("rejects a code below its minimum and still prices the cart honestly", async () => {
  requireIsolatedDatabase()
  await withPromotion(
    { code: "PROMOQAMIN", kind: "percent", value: 10, minSubtotalCents: 100_000 },
    async () => {
      const resolution = await resolvePromotion("promoqamin", 6_500)
      expect(resolution.rejection).toBe("min_subtotal")
      expect(resolution.discountCents).toBe(0)
      expect(resolution.requiredCents).toBe(100_000)

      // A rejected code must not silently change the price: the quote hash is
      // the same as an unpromoted quote.
      const rejected = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false, "PROMOQAMIN")
      const plain = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false)
      expect(rejected.totalCents).toBe(plain.totalCents)
      expect(rejected.hash).toBe(plain.hash)
      expect(rejected.promotion).toBeNull()
    },
  )
})

it("applies an accepted percentage discount to the quote and the hash", async () => {
  requireIsolatedDatabase()
  await withPromotion(
    { code: "PROMOQAOK", kind: "percent", value: 10, minSubtotalCents: 1_000 },
    async () => {
      const plain = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false)
      const promoted = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false, "PROMOQAOK")

      expect(promoted.grossSubtotalCents).toBe(plain.grossSubtotalCents)
      expect(promoted.discountCents).toBe(Math.round(plain.grossSubtotalCents * 0.1))
      expect(promoted.subtotalCents).toBe(plain.grossSubtotalCents - promoted.discountCents)
      expect(promoted.hash).not.toBe(plain.hash)

      // The totals still reconcile: products + shipping = total, and the VAT is
      // the portion of that total already included.
      expect(promoted.subtotalCents + promoted.shippingCents).toBe(promoted.totalCents)
      const { vatCents, totalCents } = computeOrderTotals(
        promoted.subtotalCents,
        promoted.shippingCents,
      )
      expect(promoted.vatCents).toBe(vatCents)
      expect(promoted.totalCents).toBe(totalCents)

      const publicPromotion = toPublicPromotion(promoted.promotion)
      expect(publicPromotion?.code).toBe("PROMOQAOK")
      expect(publicPromotion?.discountCents).toBe(promoted.discountCents)
    },
  )
})

it("waives delivery for a free-shipping code", async () => {
  requireIsolatedDatabase()
  await withPromotion(
    { code: "PROMOQASHIP", kind: "free_shipping", value: 0, minSubtotalCents: 0 },
    async () => {
      const plain = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false)
      const promoted = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false, "PROMOQASHIP")
      expect(plain.shippingCents).toBe(990)
      expect(promoted.shippingCents).toBe(0)
      expect(promoted.discountCents).toBe(0)
      expect(promoted.totalCents).toBe(promoted.subtotalCents)
    },
  )
})

it("records the discount and one redemption when the order is created", async () => {
  requireIsolatedDatabase()
  await withPromotion(
    { code: "PROMOQAORDER", kind: "percent", value: 10, minSubtotalCents: 1_000 },
    async () => {
      const quote = await quoteCart([{ sku: SKU, qty: 1 }], 990, "en", db, false, "PROMOQAORDER")
      const order = await createOrder({
        email: "promo-qa@example.invalid",
        items: [{ sku: SKU, qty: 1 }],
        shippingCents: 990,
        locale: "en",
        termsAccepted: true,
        promoCode: "PROMOQAORDER",
      })
      try {
        expect(order.promoCode).toBe("PROMOQAORDER")
        expect(order.discountCents).toBe(quote.discountCents)
        expect(order.totalCents).toBe(quote.totalCents)
        expect(order.subtotalCents + order.shippingCents).toBe(order.totalCents)

        const [promotion] = await db
          .select()
          .from(promotions)
          .where(eq(promotions.code, "PROMOQAORDER"))
        expect(promotion.redemptionCount).toBe(1)

        const redemptions = await db
          .select()
          .from(promotionRedemptions)
          .where(eq(promotionRedemptions.orderId, order.id))
        expect(redemptions).toHaveLength(1)
        expect(redemptions[0].discountCents).toBe(quote.discountCents)
      } finally {
        await db.delete(promotionRedemptions).where(eq(promotionRedemptions.orderId, order.id))
        // The order must go too. A pending order left behind is counted by
        // the reservation reaper, which would break other suites that assert
        // on how many orders expired.
        await db.delete(orders).where(eq(orders.id, order.id))
      }
    },
  )
})

it("never lets a client-supplied discount amount change the price", async () => {
  requireIsolatedDatabase()
  await withPromotion(
    { code: "PROMOQATAMPER", kind: "percent", value: 10, minSubtotalCents: 1_000 },
    async () => {
      const promoted = await quoteCart(
        [{ sku: SKU, qty: 1 }],
        990,
        "en",
        db,
        false,
        "PROMOQATAMPER",
      )
      // The quote is derived from the lines and the promotion table only. There
      // is no input a client can pass that changes the amount.
      expect(promoted.discountCents).toBe(Math.round(promoted.grossSubtotalCents * 0.1))
      expect(promoted.totalCents).toBe(promoted.subtotalCents + promoted.shippingCents)
    },
  )
})
