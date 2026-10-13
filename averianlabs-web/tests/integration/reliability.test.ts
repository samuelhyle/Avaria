import crypto from "node:crypto"
import { POST as checkout } from "@/app/api/checkout/route"
import { POST as requestQuote } from "@/app/api/quotes/route"
import { POST as webhook } from "@/app/api/webhooks/stripe/route"
import {
  accounts,
  activityEvents,
  addresses,
  batches,
  documents,
  emailOutbox,
  inventoryReservations,
  orderItems,
  orders,
  productTranslations,
  products,
  quoteRequests,
  researchPlans,
  sessions,
  supportTickets,
  users,
  verificationTokens,
  vials,
  webhookEvents,
} from "@/db/schema"
import { recentActivity } from "@/lib/activity/emit"
import { TOKEN_TTL_MS, consumeToken, createToken } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { getDocumentById, listRecentDocuments, resolveDocumentUrl } from "@/lib/documents/service"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { exportUserData, purgeDeletedUsers, softDeleteUser } from "@/lib/gdpr/service"
import { quoteCart } from "@/lib/orders/quote"
import {
  createOrder,
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
  releaseExpiredReservations,
} from "@/lib/orders/service"
import { stripe } from "@/lib/payments/stripe"
import { privateDocumentUrl } from "@/lib/storage/documents"
import { and, eq, inArray, like } from "drizzle-orm"
import { NextRequest } from "next/server"
import Stripe from "stripe"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/email/index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/index")>()),
  sendEmail: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }))
vi.mock("@/lib/community", () => ({ getCurrentMember: vi.fn(async () => null) }))
vi.mock("@/lib/shipping/cached", () => ({
  getCachedShippingRates: vi.fn(async () => [{ id: "posti-standard", priceCents: 590 }]),
}))
import { sendEmail } from "@/lib/email/index"

const prefix = `integration-${crypto.randomUUID()}`
const productIds: string[] = []
const quoteIds: string[] = []
const eventIds: string[] = []
const userIds: string[] = []

beforeAll(() => {
  const testUrl = process.env.TEST_DATABASE_URL
  if (!testUrl || testUrl !== process.env.DATABASE_URL)
    throw new Error(
      "Use a dedicated TEST_DATABASE_URL matching DATABASE_URL. Integration tests never run against an implicit database.",
    )
  const url = new URL(testUrl)
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error(
      "Expected the isolated local averian_reliability database or CI build database.",
    )
})
afterEach(async () => {
  const ownedOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.email, `${prefix}%`))
  const orderIds = ownedOrders.map((row) => row.id)
  const keys = [
    ...orderIds.flatMap((id) => [`order-paid:${id}`, `payment-review:${id}`]),
    ...quoteIds.map((id) => `quote:${id}`),
    `${prefix}:delivery`,
  ]
  await db.delete(emailOutbox).where(inArray(emailOutbox.dedupeKey, keys))
  if (orderIds.length) await db.delete(orders).where(inArray(orders.id, orderIds))
  if (quoteIds.length) {
    await db.delete(supportTickets).where(inArray(supportTickets.id, quoteIds))
    await db.delete(quoteRequests).where(inArray(quoteRequests.id, quoteIds))
  }
  if (eventIds.length) await db.delete(webhookEvents).where(inArray(webhookEvents.id, eventIds))
  if (productIds.length) {
    await db.delete(documents).where(inArray(documents.productId, productIds))
    await db.delete(products).where(inArray(products.id, productIds))
  }
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
  await db.delete(verificationTokens).where(like(verificationTokens.identifier, `${prefix}%`))
  vi.restoreAllMocks()
  vi.mocked(sendEmail).mockReset()
})
afterAll(async () => {
  await globalThis.__averianlabsPg?.end()
})

async function fixture(stock = 1) {
  const id = crypto.randomUUID()
  productIds.push(id)
  const sku = `TEST-${id}`
  await db.insert(products).values({
    id,
    slug: `test-${id}`,
    status: "active",
    productType: "supplies",
    specJson: { verified: true, evidenceRef: "integration fixture only" },
  })
  const [vial] = await db
    .insert(vials)
    .values({
      productId: id,
      sku,
      sizeValue: 10,
      sizeUnit: "mL",
      sizeMg: null,
      priceCents: 3990,
      stockQty: stock,
      purchaseMode: "direct",
    })
    .returning()
  const [batch] = await db
    .insert(batches)
    .values({
      vialId: vial!.id,
      code: `BATCH-${id}`,
      manufacturedAt: new Date("2026-01-01"),
      expiresAt: new Date("2050-01-01"),
      hplcPurity: 0,
      endotoxinEUPerMg: 0,
      lab: "Integration fixture",
      verificationStatus: "released",
      reviewedBy: "test reviewer",
      reviewedAt: new Date(),
    })
    .returning()
  await db.update(vials).set({ activeBatchId: batch!.id }).where(eq(vials.id, vial!.id))
  await db.insert(productTranslations).values([
    { productId: id, locale: "en", name: "Test water" },
    { productId: id, locale: "fi", name: "Testivesi" },
  ])
  const [report] = await db
    .insert(documents)
    .values({
      productId: id,
      batchId: batch!.id,
      type: "coa",
      title: "Original fixture report",
      displayLocales: ["en", "fi"],
      externalUrl: "https://example.invalid/fixture.pdf",
      requiresLogin: false,
    })
    .returning()
  return { id, sku, vial: vial!, batch: batch!, report: report! }
}
function orderInput(sku: string, overrides: Record<string, unknown> = {}) {
  return {
    email: `${prefix}@example.invalid`,
    items: [{ sku, qty: 1 }],
    shippingCents: 590,
    locale: "fi",
    termsAccepted: true,
    checkoutKey: crypto.randomUUID(),
    ...overrides,
  }
}
async function stock(id: string) {
  return (await db.select().from(vials).where(eq(vials.id, id)))[0]!.stockQty
}
async function status(id: string) {
  return (await db.select().from(orders).where(eq(orders.id, id)))[0]!.status
}

describe("transactional checkout and stock", () => {
  it("allows exactly one checkout for the last unit", async () => {
    const f = await fixture()
    const results = await Promise.allSettled([
      createOrder(orderInput(f.sku)),
      createOrder(orderInput(f.sku)),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "out_of_stock" },
    })
    expect(await stock(f.vial.id)).toBe(0)
  })
  it("replays concurrent identical attempts without a second reservation", async () => {
    const f = await fixture(3)
    const input = orderInput(f.sku, { checkoutHash: "same-body" })
    const [a, b] = await Promise.all([createOrder(input), createOrder(input)])
    expect(a.id).toBe(b.id)
    expect(await stock(f.vial.id)).toBe(2)
    expect(
      await db.select().from(inventoryReservations).where(eq(inventoryReservations.orderId, a.id)),
    ).toHaveLength(1)
    await expect(createOrder({ ...input, checkoutHash: "different-body" })).rejects.toMatchObject({
      code: "idempotency_conflict",
    })
  })
  it("rejects changed quote prices and invalid quantities without reserving", async () => {
    const f = await fixture()
    const quote = await quoteCart([{ sku: f.sku, qty: 1 }], 590, "fi")
    await db.update(vials).set({ priceCents: 4990 }).where(eq(vials.id, f.vial.id))
    await expect(
      createOrder(orderInput(f.sku, { expectedQuoteHash: quote.hash })),
    ).rejects.toMatchObject({ code: "quote_changed" })
    await expect(
      createOrder(orderInput(f.sku, { items: [{ sku: f.sku, qty: -1 }] })),
    ).rejects.toMatchObject({ code: "invalid" })
    expect(await stock(f.vial.id)).toBe(1)
  })
  it("aggregates duplicate SKU lines and preserves typed immutable snapshots", async () => {
    const f = await fixture(3)
    const order = await createOrder(
      orderInput(f.sku, {
        items: [
          { sku: f.sku, qty: 1 },
          { sku: f.sku, qty: 1 },
        ],
      }),
    )
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    expect(line).toMatchObject({
      qty: 2,
      nameSnapshot: "Testivesi",
      skuSnapshot: f.sku,
      sizeValueSnapshot: 10,
      sizeUnitSnapshot: "mL",
      batchCodeSnapshot: f.batch.code,
    })
    expect(order.totalCents).toBe(3990 * 2 + 590)
    expect(order.vatCents).toBe(Math.round((order.totalCents * 0.255) / 1.255))
    await db.update(vials).set({ sizeValue: 20, priceCents: 100 }).where(eq(vials.id, f.vial.id))
    expect(
      (await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)))[0],
    ).toMatchObject({ sizeValueSnapshot: 10, unitPriceCents: 3990 })
  })
  it("rejects unreleased, unassigned, private, future and unusable reports", async () => {
    const f = await fixture()
    await db.update(vials).set({ activeBatchId: null }).where(eq(vials.id, f.vial.id))
    await expect(quoteCart([{ sku: f.sku, qty: 1 }], 590)).rejects.toMatchObject({
      code: "not_saleable",
    })
    await db.update(vials).set({ activeBatchId: f.batch.id }).where(eq(vials.id, f.vial.id))
    for (const change of [
      { requiresLogin: true },
      { requiresLogin: false, publishedAt: new Date("2050-01-01") },
      { publishedAt: new Date(), externalUrl: "javascript:alert(1)" },
      { externalUrl: "https://example.invalid/fixture.pdf", displayLocales: ["en"] },
    ]) {
      await db.update(documents).set(change).where(eq(documents.id, f.report.id))
      await expect(quoteCart([{ sku: f.sku, qty: 1 }], 590)).rejects.toMatchObject({
        code: "not_saleable",
      })
    }
    expect(await stock(f.vial.id)).toBe(1)
  })
  it("restores a failed or expired reservation exactly once", async () => {
    const f = await fixture(2)
    const a = await createOrder(orderInput(f.sku))
    expect(await markOrderFailed(a.id)).toBe(true)
    expect(await markOrderFailed(a.id)).toBe(false)
    expect(await stock(f.vial.id)).toBe(2)
    const b = await createOrder(orderInput(f.sku))
    expect(await releaseExpiredReservations(new Date(Date.now() + 16 * 60000))).toBe(1)
    expect(await releaseExpiredReservations(new Date(Date.now() + 16 * 60000))).toBe(0)
    expect(await status(b.id)).toBe("expired")
    expect(await stock(f.vial.id)).toBe(2)
  })
  it("consumes paid stock once, queues one localized receipt and keeps refunds terminal", async () => {
    const f = await fixture()
    const a = await createOrder(orderInput(f.sku))
    expect(await markOrderPaid(a.id, "pi_local_test")).toBe(true)
    expect(await markOrderPaid(a.id, "pi_local_test")).toBe(false)
    expect(await markOrderFailed(a.id)).toBe(false)
    const messages = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.dedupeKey, `order-paid:${a.id}`))
    expect(messages).toHaveLength(1)
    expect(messages[0]!.html).toContain("10 mL")
    expect(messages[0]!.html).toContain("25,5")
    expect(messages[0]!.html).toContain(f.batch.code)
    expect(await markOrderRefunded(a.id)).toBe(true)
    expect(await markOrderPaid(a.id, "pi_local_test")).toBe(false)
    expect(await status(a.id)).toBe("refunded")
    expect(await stock(f.vial.id)).toBe(0)
  })
  it("reacquires expired stock or sends an unfulfillable late payment to review", async () => {
    const f = await fixture()
    const a = await createOrder(orderInput(f.sku))
    await markOrderFailed(a.id, "expired")
    await markOrderPaid(a.id, "pi_late_available")
    expect(await status(a.id)).toBe("paid")
    expect(await stock(f.vial.id)).toBe(0)
    const g = await fixture()
    const b = await createOrder(orderInput(g.sku))
    await markOrderFailed(b.id, "expired")
    await createOrder(orderInput(g.sku))
    await markOrderPaid(b.id, "pi_late_unavailable")
    expect(await status(b.id)).toBe("payment_review")
    expect(await stock(g.vial.id)).toBe(0)
    expect(
      await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.dedupeKey, `order-paid:${b.id}`)),
    ).toHaveLength(0)
  })
  it("restores an active hold when its paid batch has been rejected", async () => {
    const f = await fixture()
    const a = await createOrder(orderInput(f.sku))
    await db
      .update(batches)
      .set({ verificationStatus: "rejected" })
      .where(eq(batches.id, f.batch.id))
    await markOrderPaid(a.id, "pi_rejected")
    expect(await status(a.id)).toBe("payment_review")
    expect(await stock(f.vial.id)).toBe(1)
  })
})

describe("provider replay and durable notifications", () => {
  it("does not consume a webhook on mismatch and safely replays a corrected signed event", async () => {
    const f = await fixture()
    const a = await createOrder(orderInput(f.sku))
    const id = `evt_${crypto.randomUUID()}`
    eventIds.push(`stripe:${id}`)
    const client = new Stripe("sk_test_local_placeholder")
    async function deliver(amount: number) {
      const payload = JSON.stringify({
        id,
        type: "payment_intent.succeeded",
        data: {
          object: { id: "pi_signed_fixture", metadata: { orderId: a.id }, currency: "eur", amount },
        },
      })
      const signature = client.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      })
      return webhook(
        new NextRequest("http://localhost/api/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": signature },
          body: payload,
        }),
      )
    }
    expect((await deliver(a.totalCents + 1)).status).toBe(500)
    expect(
      await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, `stripe:${id}`)),
    ).toHaveLength(0)
    expect((await deliver(a.totalCents)).status).toBe(200)
    expect((await deliver(a.totalCents)).status).toBe(200)
    expect(await status(a.id)).toBe("paid")
    expect(
      await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.dedupeKey, `order-paid:${a.id}`)),
    ).toHaveLength(1)
  })
  it("persists a quote request, support ticket and notification once", async () => {
    const f = await fixture()
    const input = {
      requestKey: crypto.randomUUID(),
      sku: f.sku,
      name: "Test <Researcher>",
      email: `${prefix}@example.invalid`,
      organisation: "Research",
      message: "<script>fixture</script>",
      locale: "fi",
    }
    const send = () =>
      requestQuote(
        new Request("http://localhost/api/quotes", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.43" },
          body: JSON.stringify(input),
        }),
      )
    const a = await send()
    const b = await send()
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    const result = await a.json()
    quoteIds.push(result.requestId)
    expect((await b.json()).requestId).toBe(result.requestId)
    expect(
      await db.select().from(supportTickets).where(eq(supportTickets.id, result.requestId)),
    ).toHaveLength(1)
    const [message] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.dedupeKey, `quote:${result.requestId}`))
    expect(message!.html).toContain("&lt;script&gt;")
    expect(message!.html).not.toContain("<script>")
  })
  it("retries delivery with the same provider idempotency key", async () => {
    process.env.RESEND_API_KEY = "local-mocked-provider"
    await enqueueEmail(
      { to: `${prefix}@example.invalid`, subject: "Fixture", html: "<p>Fixture</p>" },
      `${prefix}:delivery`,
    )
    vi.mocked(sendEmail).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    expect(await deliverEmailOutbox()).toEqual({ sent: 0, failed: 1 })
    const [row] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.dedupeKey, `${prefix}:delivery`))
    expect(row!.status).toBe("pending")
    await db
      .update(emailOutbox)
      .set({ nextAttemptAt: new Date(0) })
      .where(eq(emailOutbox.id, row!.id))
    expect(await deliverEmailOutbox()).toEqual({ sent: 1, failed: 0 })
    expect(vi.mocked(sendEmail).mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      row!.id,
      row!.id,
    ])
    Reflect.deleteProperty(process.env, "RESEND_API_KEY")
  })
})

describe("document access", () => {
  it("combines type and product filters without translation duplicates or private leakage", async () => {
    const f = await fixture()
    await fixture()
    expect(await listRecentDocuments({ productId: f.id, type: "coa", locale: "fi" })).toHaveLength(
      1,
    )
    await db.update(documents).set({ requiresLogin: true }).where(eq(documents.id, f.report.id))
    expect(await getDocumentById(f.report.id, "fi")).toBeNull()
    expect(await getDocumentById(f.report.id, "fi", true)).toMatchObject({ requiresLogin: true })
    expect(
      await resolveDocumentUrl({
        ...f.report,
        productSlug: "fixture",
        productName: "Fixture",
        batchCode: f.batch.code,
        type: "coa",
        requiresLogin: true,
      }),
    ).toBeNull()
  })
  it("creates a real short-lived R2 signature without contacting storage", async () => {
    const env = {
      R2_ACCOUNT_ID: "local-fixture",
      R2_ACCESS_KEY_ID: "local-fixture",
      R2_SECRET_ACCESS_KEY: "local-fixture",
      R2_BUCKET: "local-fixture",
    }
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
    const signed = new URL((await privateDocumentUrl("private/test report.pdf"))!)
    expect(signed.searchParams.get("X-Amz-Expires")).toBe("300")
    expect(signed.searchParams.has("X-Amz-Signature")).toBe(true)
    expect(await privateDocumentUrl("../secret")).toBeNull()
    vi.unstubAllEnvs()
  })
})

describe("account and provider recovery", () => {
  it("consumes a confirmation token only once under concurrent requests", async () => {
    const identifier = `${prefix}:atomic-token`
    const token = await db.transaction((tx) =>
      createToken(identifier, TOKEN_TTL_MS.passwordReset, tx),
    )
    const results = await Promise.all([
      consumeToken(identifier, token),
      consumeToken(identifier, token),
    ])
    expect(results.sort()).toEqual([false, true])
  })
  it("removes credentials and private content immediately while retaining immutable orders", async () => {
    const f = await fixture()
    const id = crypto.randomUUID()
    userIds.push(id)
    await db.insert(users).values({
      id,
      email: `${prefix}-delete@example.invalid`,
      name: "Private name",
      passwordHash: "not-a-real-hash",
    })
    await db
      .insert(sessions)
      .values({ sessionToken: crypto.randomUUID(), userId: id, expires: new Date("2050-01-01") })
    await db.insert(accounts).values({
      userId: id,
      type: "oauth",
      provider: "fixture",
      providerAccountId: id,
      access_token: "private-token",
    })
    await db.insert(researchPlans).values({ ownerId: id, title: "Private notes" })
    const order = await createOrder(orderInput(f.sku, { userId: id }))
    const data = await exportUserData(id)
    expect(JSON.stringify(data)).not.toContain("private-token")
    expect(JSON.stringify(data)).not.toContain("not-a-real-hash")
    await softDeleteUser(id)
    await softDeleteUser(id)
    const [user] = await db.select().from(users).where(eq(users.id, id))
    expect(user).toMatchObject({ email: `${id}@deleted.invalid`, name: null, passwordHash: null })
    expect(user?.deletedAt).toBeInstanceOf(Date)
    expect(await db.select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0)
    expect(await db.select().from(accounts).where(eq(accounts.userId, id))).toHaveLength(0)
    expect(await db.select().from(researchPlans).where(eq(researchPlans.ownerId, id))).toHaveLength(
      0,
    )
    expect(await status(order.id)).toBe("pending")
    await purgeDeletedUsers(new Date(Date.now() + 31 * 86400000))
    expect(await db.select().from(users).where(eq(users.id, id))).toHaveLength(0)
    const [retained] = await db.select().from(orders).where(eq(orders.id, order.id))
    expect(retained?.userId).toBeNull()
    expect(await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))).toHaveLength(
      1,
    )
  })
  it("retries an ambiguous Stripe creation with the same order and provider key", async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_local_placeholder"
    const f = await fixture(3)
    const quote = await quoteCart([{ sku: f.sku, qty: 1 }], 590, "fi")
    const create = vi
      .spyOn(stripe().paymentIntents, "create")
      .mockRejectedValueOnce(new Error("Simulated lost provider response"))
      .mockResolvedValue({
        id: "pi_isolated_retry",
        client_secret: "pi_isolated_retry_secret",
      } as never)
    const input = {
      email: `${prefix}@example.invalid`,
      requestKey: crypto.randomUUID(),
      expectedQuoteHash: quote.hash,
      items: [{ sku: f.sku, qty: 1 }],
      shippingAddress: {
        name: "Test",
        line1: "Test street",
        city: "Test city",
        postal: "00100",
        country: "FI",
      },
      shippingMethodId: "posti-standard",
      paymentMethod: "stripe",
      locale: "fi",
      researchConsent: true,
    }
    const call = () =>
      checkout(
        new Request("http://localhost:3000/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      )
    expect((await call()).status).toBe(503)
    const response = await call()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.clientSecret).toBe("pi_isolated_retry_secret")
    expect(await stock(f.vial.id)).toBe(2)
    expect(create.mock.calls[0]?.[1]?.idempotencyKey).toBe(
      create.mock.calls[1]?.[1]?.idempotencyKey,
    )
    expect(create.mock.calls[1]?.[0]).toMatchObject({
      amount: 4580,
      currency: "eur",
      payment_method_types: ["card"],
    })
    const replay = await call()
    expect((await replay.json()).orderId).toBe(body.orderId)
    expect(await stock(f.vial.id)).toBe(2)
  })
})

it("excludes revoked, deleted and superseded plan shares from the public feed", async () => {
  const ownerId = crypto.randomUUID()
  userIds.push(ownerId)
  const planId = crypto.randomUUID()
  const eventId = crypto.randomUUID()
  const slug = `qa-${crypto.randomUUID()}`
  await db.insert(users).values({ id: ownerId, email: `${prefix}-plan@example.invalid` })
  await db.insert(researchPlans).values({
    id: planId,
    ownerId,
    title: "Private laboratory plan",
    isPublic: true,
    shareSlug: slug,
  })
  await db.insert(activityEvents).values({
    id: eventId,
    kind: "plan_shared",
    actorId: ownerId,
    targetType: "plan",
    targetId: planId,
    targetSlug: slug,
    targetTitle: "Private laboratory plan",
  })
  try {
    expect((await recentActivity(50)).some((event) => event.id === eventId)).toBe(true)
    await db
      .update(researchPlans)
      .set({ isPublic: false, shareSlug: null })
      .where(eq(researchPlans.id, planId))
    expect((await recentActivity(50)).some((event) => event.id === eventId)).toBe(false)
    await db
      .update(researchPlans)
      .set({ isPublic: true, shareSlug: `${slug}-new` })
      .where(eq(researchPlans.id, planId))
    expect((await recentActivity(50)).some((event) => event.id === eventId)).toBe(false)
    await db.delete(researchPlans).where(eq(researchPlans.id, planId))
    expect((await recentActivity(50)).some((event) => event.id === eventId)).toBe(false)
  } finally {
    await db.delete(activityEvents).where(eq(activityEvents.id, eventId))
  }
})
