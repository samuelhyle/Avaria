import { batches, documents, orders, products, vials } from "@/db/schema"
import { CHECKOUT_TEST_SKU, CHECKOUT_TEST_SLUG } from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { quoteCart } from "@/lib/orders/quote"
import { createOrder, markOrderPaid } from "@/lib/orders/service"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

it.skipIf(process.env.CHECKOUT_TEST_PRODUCT_ENABLED !== "true")(
  "sells the explicitly enabled no-goods fixture for EUR 1.50 without scientific evidence",
  async () => {
    const database = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
    if (
      process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
      !["localhost", "127.0.0.1"].includes(database.hostname) ||
      !["/averian_reliability", "/build"].includes(database.pathname)
    )
      throw new Error("Dedicated verification database required")
    const [product] = await db.select().from(products).where(eq(products.slug, CHECKOUT_TEST_SLUG))
    const [vial] = await db.select().from(vials).where(eq(vials.sku, CHECKOUT_TEST_SKU))
    expect((product.specJson as { verified: boolean }).verified).toBe(false)
    expect(
      await db.select().from(documents).where(eq(documents.productId, product.id)),
    ).toHaveLength(0)
    expect(await db.select().from(batches).where(eq(batches.vialId, vial.id))).toHaveLength(0)
    const items = [{ sku: CHECKOUT_TEST_SKU, qty: 1 }]
    const quote = await quoteCart(items, 590)
    expect(quote.totalCents).toBe(150)
    expect(quote.shippingCents).toBe(0)
    expect(quote.lines[0].batchId).toBeNull()
    await expect(quoteCart([{ sku: CHECKOUT_TEST_SKU, qty: 2 }], 0)).rejects.toMatchObject({
      code: "invalid",
    })
    await expect(quoteCart([...items, { sku: "QA-PEPTIDE-10", qty: 1 }], 0)).rejects.toMatchObject({
      code: "invalid",
    })
    await expect(quoteCart(items, 0, "en", db, false, "PROMO")).rejects.toMatchObject({
      code: "invalid",
    })
    const previous = process.env.CHECKOUT_TEST_PRODUCT_ENABLED
    process.env.CHECKOUT_TEST_PRODUCT_ENABLED = "false"
    try {
      await expect(quoteCart(items, 0)).rejects.toMatchObject({ code: "not_saleable" })
    } finally {
      process.env.CHECKOUT_TEST_PRODUCT_ENABLED = previous
    }
    const order = await createOrder({
      email: "checkout-test@example.invalid",
      items,
      shippingCents: 0,
      locale: "en",
      termsAccepted: true,
      paymentMethod: "crypto",
      checkoutKey: crypto.randomUUID(),
    })
    try {
      expect(order.totalCents).toBe(150)
      await markOrderPaid(order.id, "mock-payment-test-only", "crypto")
      const [paid] = await db.select().from(orders).where(eq(orders.id, order.id))
      expect(paid.status).toBe("paid")
    } finally {
      await db.delete(orders).where(eq(orders.id, order.id))
      await db.update(vials).set({ stockQty: vial.stockQty }).where(eq(vials.id, vial.id))
    }
  },
)
