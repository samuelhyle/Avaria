import { emailOutbox, orders, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { RefundError, refundOrder } from "@/lib/orders/refund"
import { createOrder } from "@/lib/orders/service"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * Refunds.
 *
 * The admin console used to flip an order to `refunded` and nothing else — no
 * money moved, no stock came back, the customer was never told. An operator
 * pressing the button believed the customer had been paid back.
 *
 * These tests cover the rules that make a refund honest: the method has to be
 * named, a crypto refund has to name the outbound transaction, a manual refund
 * has to give a reason, and a second press must not refund twice.
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

async function withPaidOrder<T>(run: (orderId: string) => Promise<T>): Promise<T> {
  return withFixtureStock([SKU], async () => {
    const order = await createOrder({
      email: "refund-qa@example.invalid",
      items: [{ sku: SKU, qty: 1 }],
      shippingCents: 990,
      locale: "en",
      termsAccepted: true,
      checkoutKey: crypto.randomUUID(),
    })
    try {
      // Mark it paid without a provider: the refund rules are what is under
      // test, not the payment.
      await db
        .update(orders)
        .set({ status: "paid", stripePaymentIntentId: `pi_qa_${crypto.randomUUID()}` })
        .where(eq(orders.id, order.id))
      return await run(order.id)
    } finally {
      await db.delete(emailOutbox).where(eq(emailOutbox.recipient, "refund-qa@example.invalid"))
      await db.delete(orders).where(eq(orders.id, order.id))
    }
  })
}

it("refunds through the payment provider, restores the stock and tells the customer", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    const stockBefore = await stockOf(SKU)

    // The Stripe call is stubbed so the test does not need a key; the point is
    // what happens around it.
    const calls: Array<{ payment_intent: string }> = []
    const result = await refundOrder({
      orderId,
      method: "stripe",
      actorId: "admin-qa",
      provider: {
        refund: async (params: { payment_intent: string }) => {
          calls.push(params)
          return { id: "re_qa_1" }
        },
      },
    })

    expect(result.alreadyRefunded).toBe(false)
    expect(result.method).toBe("stripe")
    expect(result.reference).toBe("re_qa_1")
    expect(calls).toHaveLength(1)

    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.status).toBe("refunded")
    expect(row.refundMethod).toBe("stripe")
    expect(row.refundReference).toBe("re_qa_1")
    expect(row.refundedAt).toBeTruthy()

    // The goods go back on the shelf.
    expect(await stockOf(SKU)).toBe(stockBefore + 1)

    // The customer is told.
    const mail = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.recipient, "refund-qa@example.invalid"))
    expect(mail.length).toBeGreaterThan(0)
    expect(mail[0].subject).toContain("Refund")
  })
})

it("never refunds twice", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    let calls = 0
    const provider = {
      refund: async () => {
        calls++
        return { id: "re_qa_2" }
      },
    }
    const first = await refundOrder({
      orderId,
      method: "stripe",
      actorId: "admin-qa",
      provider: provider as never,
    })
    expect(first.alreadyRefunded).toBe(false)

    const second = await refundOrder({
      orderId,
      method: "stripe",
      actorId: "admin-qa",
      provider: provider as never,
    })
    expect(second.alreadyRefunded).toBe(true)
    expect(second.reference).toBe("re_qa_2")
    // The provider was only asked to refund once.
    expect(calls).toBe(1)
  })
})

it("refuses a crypto refund without the outbound transaction hash", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    await expect(
      refundOrder({
        orderId,
        method: "crypto",
        cryptoTxHash: "0x123",
        actorId: "admin-qa",
        provider: { refund: async () => ({ id: "x" }) } as never,
      }),
    ).rejects.toMatchObject({ code: "missing_reference" })

    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    // Nothing changed: no refund was recorded and the order is still paid.
    expect(row.status).toBe("paid")
    expect(row.refundedAt).toBeNull()
  })
})

it("records the outbound transaction for a crypto refund", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    const hash = `0x${"a".repeat(64)}`
    const result = await refundOrder({
      orderId,
      method: "crypto",
      cryptoTxHash: hash,
      actorId: "admin-qa",
      provider: { refund: async () => ({ id: "x" }) } as never,
    })
    expect(result.method).toBe("crypto")
    expect(result.reference).toBe(hash)
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.refundMethod).toBe("crypto")
    expect(row.refundReference).toBe(hash)
  })
})

it("refuses a manual refund without a reason", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    await expect(
      refundOrder({
        orderId,
        method: "manual",
        actorId: "admin-qa",
        provider: { refund: async () => ({ id: "x" }) } as never,
      }),
    ).rejects.toMatchObject({ code: "missing_reason" })
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.status).toBe("paid")
  })
})

it("refuses to refund an order that was never paid", async () => {
  requireIsolatedDatabase()
  await withFixtureStock([SKU], async () => {
    const order = await createOrder({
      email: "refund-qa@example.invalid",
      items: [{ sku: SKU, qty: 1 }],
      shippingCents: 990,
      locale: "en",
      termsAccepted: true,
      checkoutKey: crypto.randomUUID(),
    })
    try {
      await expect(
        refundOrder({
          orderId: order.id,
          method: "manual",
          reason: "because",
          actorId: "admin-qa",
          provider: { refund: async () => ({ id: "x" }) } as never,
        }),
      ).rejects.toMatchObject({ code: "not_refundable" })
    } finally {
      await db.delete(orders).where(eq(orders.id, order.id))
    }
  })
})

it("reports a provider failure without changing the order", async () => {
  requireIsolatedDatabase()
  await withPaidOrder(async (orderId) => {
    await expect(
      refundOrder({
        orderId,
        method: "stripe",
        actorId: "admin-qa",
        provider: {
          refund: async () => {
            throw new Error("provider is down")
          },
        } as never,
      }),
    ).rejects.toMatchObject({ code: "provider_failed" })
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.status).toBe("paid")
    expect(row.refundedAt).toBeNull()
  })
})

it("exposes the refund error type for the API layer", () => {
  const error = new RefundError("nope", "missing_reason")
  expect(error).toBeInstanceOf(Error)
  expect(error.code).toBe("missing_reason")
})

async function stockOf(sku: string): Promise<number> {
  const [row] = await db.select().from(vials).where(eq(vials.sku, sku)).limit(1)
  return row?.stockQty ?? 0
}
