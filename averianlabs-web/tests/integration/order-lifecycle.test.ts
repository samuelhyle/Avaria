import { emailOutbox, orderItems, orders, shipments } from "@/db/schema"
import { db } from "@/lib/db"
import {
  createOrder,
  listShipments,
  markOrderDelivered,
  markOrderPacked,
  markOrderPaid,
  markOrderShipped,
  transitionOrder,
} from "@/lib/orders/service"
import { InvalidOrderTransition, canTransition } from "@/lib/orders/status"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * The fulfilment lifecycle.
 *
 * `shipped` and `delivered` used to be states that no code path could reach:
 * they were read by the confirmation page, the account order list and the AI
 * tools, but nothing ever wrote them. These tests drive an order from paid to
 * delivered and assert that illegal moves are refused.
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

async function withOrder<T>(run: (orderId: string) => Promise<T>): Promise<T> {
  return withFixtureStock([SKU], async () => {
    const order = await createOrder({
      email: "lifecycle-qa@example.invalid",
      items: [{ sku: SKU, qty: 1 }],
      shippingCents: 990,
      locale: "en",
      termsAccepted: true,
      checkoutKey: crypto.randomUUID(),
    })
    try {
      return await run(order.id)
    } finally {
      await db.delete(orders).where(eq(orders.id, order.id))
      // The receipt this test queues would otherwise be picked up by the
      // delivery assertions in another suite.
      await db.delete(emailOutbox).where(eq(emailOutbox.recipient, "lifecycle-qa@example.invalid"))
    }
  })
}

it("walks an order from paid to delivered", async () => {
  requireIsolatedDatabase()
  await withOrder(async (orderId) => {
    const paid = await markOrderPaid(orderId, `pi_qa_${crypto.randomUUID()}`, "stripe")
    expect(paid).toBe(true)

    const [afterPay] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(afterPay.status).toBe("paid")

    expect(await markOrderPacked(orderId)).toBe(true)
    const [afterPack] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(afterPack.status).toBe("packed")

    const shipment = await markOrderShipped(orderId, {
      carrier: "Posti",
      service: "Standard",
      trackingNumber: "QC-TEST-1234",
    })
    expect(shipment.orderNumber).toMatch(/^AL-\d{8}-/)
    const [afterShip] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(afterShip.status).toBe("shipped")

    const rows = await listShipments(orderId)
    expect(rows).toHaveLength(1)
    expect(rows[0].trackingNumber).toBe("QC-TEST-1234")
    expect(rows[0].status).toBe("in_transit")
    expect(rows[0].shippedAt).toBeTruthy()

    expect(await markOrderDelivered(orderId)).toBe(true)
    const [afterDelivery] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(afterDelivery.status).toBe("delivered")

    const deliveredShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, orderId))
    expect(deliveredShipments[0].status).toBe("delivered")
    expect(deliveredShipments[0].deliveredAt).toBeTruthy()
  })
})

it("refuses to ship an order that was never paid", async () => {
  requireIsolatedDatabase()
  await withOrder(async (orderId) => {
    await expect(
      markOrderShipped(orderId, { carrier: "Posti", service: "Standard" }),
    ).rejects.toBeInstanceOf(InvalidOrderTransition)
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.status).toBe("pending")
  })
})

it("refuses to pack a delivered order", async () => {
  requireIsolatedDatabase()
  await withOrder(async (orderId) => {
    await markOrderPaid(orderId, `pi_qa_${crypto.randomUUID()}`, "stripe")
    await markOrderPacked(orderId)
    await markOrderShipped(orderId, { carrier: "Posti", service: "Standard" })
    await markOrderDelivered(orderId)
    expect(await markOrderPacked(orderId)).toBe(false)
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.status).toBe("delivered")
  })
})

it("does not let a delivered order be delivered twice", async () => {
  requireIsolatedDatabase()
  await withOrder(async (orderId) => {
    await markOrderPaid(orderId, `pi_qa_${crypto.randomUUID()}`, "stripe")
    await markOrderShipped(orderId, { carrier: "Posti", service: "Standard" })
    expect(await markOrderDelivered(orderId)).toBe(true)
    expect(await markOrderDelivered(orderId)).toBe(false)
  })
})

it("keeps the transition table closed", () => {
  expect(canTransition("pending", "paid")).toBe(true)
  expect(canTransition("pending", "shipped")).toBe(false)
  expect(canTransition("delivered", "paid")).toBe(false)
  expect(canTransition("refunded", "paid")).toBe(false)
  // A late payment re-opens a failed or expired order rather than losing the
  // money.
  expect(canTransition("expired", "paid")).toBe(true)
  expect(canTransition("failed", "payment_review")).toBe(true)
})

it("stores the discount on the order and the promotion redemption with it", async () => {
  requireIsolatedDatabase()
  await withOrder(async (orderId) => {
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId))
    expect(row.discountCents).toBe(0)
    expect(row.promoCode).toBeNull()
    // subtotal + shipping = total must hold for every order.
    expect(row.subtotalCents + row.shippingCents).toBe(row.totalCents)
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    expect(items).toHaveLength(1)
  })
})
