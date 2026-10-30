import { cryptoCheckoutSessions, cryptoDeposits, orders } from "@/db/schema"
import { CHAINS } from "@/lib/crypto/chains"
import { assignDepositToSession, matchDepositToSession, recordDeposit } from "@/lib/crypto/matching"
import { db } from "@/lib/db"
import { eq, inArray } from "drizzle-orm"
import { afterEach, beforeAll, expect, it } from "vitest"

const orderIds: string[] = []
const depositIds: string[] = []
const address = `matching-qa-${crypto.randomUUID()}`
const now = new Date()
const createdAt = new Date(now.getTime() - 10 * 60_000)
const expiresAt = new Date(now.getTime() + 50 * 60_000)

beforeAll(() => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
})

afterEach(async () => {
  if (depositIds.length)
    await db.delete(cryptoDeposits).where(inArray(cryptoDeposits.id, depositIds.splice(0)))
  if (orderIds.length) await db.delete(orders).where(inArray(orders.id, orderIds.splice(0)))
})

async function invoice(
  overrides: Partial<typeof cryptoCheckoutSessions.$inferInsert> = {},
  orderStatus = "awaiting_crypto",
) {
  const orderId = crypto.randomUUID()
  orderIds.push(orderId)
  await db.insert(orders).values({
    id: orderId,
    number: `MATCH-${orderId}`,
    email: "matching-qa@example.invalid",
    status: orderStatus,
    subtotalCents: 5000,
    shippingCents: 0,
    vatCents: 0,
    totalCents: 5000,
    currency: "EUR",
    currencyPerLine: "EUR",
    locale: "en",
    paymentMethod: "crypto",
  })
  const id = crypto.randomUUID()
  await db.insert(cryptoCheckoutSessions).values({
    id,
    orderId,
    chain: "btc",
    amountCrypto: "0.001",
    amountEurCents: 5000,
    rateEurPerUnit: 50000,
    walletAddress: address,
    status: "delivered",
    createdAt,
    expiresAt,
    ...overrides,
  })
  return { id, orderId }
}

async function deposit(seenAt: Date | undefined = now, amountCrypto = "0.001") {
  const txHash = crypto.randomUUID()
  await recordDeposit({
    chain: "btc",
    txHash,
    walletAddress: address,
    amountCrypto,
    confirmations: CHAINS.btc.requiredConfirmations,
    seenAt,
  })
  const [stored] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.txHash, txHash))
  if (!stored) throw new Error("deposit was not stored")
  depositIds.push(stored.id)
  return stored
}

it("does not use a historical deposit to pay a newly issued invoice", async () => {
  await invoice()
  const old = await deposit(new Date(createdAt.getTime() - 1))
  expect(await matchDepositToSession(old.id)).toBeNull()
})

it("does not convert a repeated scan into a new payment timestamp", async () => {
  await invoice()
  const seenAt = new Date(createdAt.getTime() - 86_400_000)
  const old = await deposit(seenAt)
  await recordDeposit({
    chain: "btc",
    txHash: old.txHash,
    walletAddress: address,
    amountCrypto: "0.001",
    confirmations: 100,
    seenAt,
  })
  const [rescanned] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.id, old.id))
  expect(rescanned?.seenAt).toEqual(seenAt)
  expect(await matchDepositToSession(old.id)).toBeNull()
})

it("does not automatically match legacy rows without a verified chain timestamp", async () => {
  await invoice()
  const legacy = await deposit()
  await db.update(cryptoDeposits).set({ raw: null }).where(eq(cryptoDeposits.id, legacy.id))
  expect(await matchDepositToSession(legacy.id)).toBeNull()
})

it("does not match a payment sent after the invoice deadline", async () => {
  await invoice()
  const late = await deposit(new Date(expiresAt.getTime() + 1))
  expect(await matchDepositToSession(late.id)).toBeNull()
})

it("accepts a timely payment that reaches finality after the invoice deadline", async () => {
  const session = await invoice({
    createdAt: new Date(now.getTime() - 60 * 60_000),
    expiresAt: new Date(now.getTime() - 10 * 60_000),
  })
  const timely = await deposit(new Date(now.getTime() - 15 * 60_000))
  expect(await matchDepositToSession(timely.id)).toMatchObject({ sessionId: session.id })
})

it("leaves overlapping same-amount invoices for manual review", async () => {
  await invoice()
  await invoice()
  const ambiguous = await deposit()
  expect(await matchDepositToSession(ambiguous.id)).toBeNull()
  const [stored] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.id, ambiguous.id))
  expect(stored?.matchedSessionId).toBeNull()
})

it("does not revive a cancelled order from an open crypto session", async () => {
  await invoice({}, "cancelled")
  const received = await deposit()
  expect(await matchDepositToSession(received.id)).toBeNull()
})

it("does not resolve an ambiguous transfer merely because one invoice closes", async () => {
  const first = await invoice()
  await invoice()
  const ambiguous = await deposit()
  expect(await matchDepositToSession(ambiguous.id)).toBeNull()
  await db
    .update(cryptoCheckoutSessions)
    .set({ status: "expired" })
    .where(eq(cryptoCheckoutSessions.id, first.id))
  expect(await matchDepositToSession(ambiguous.id)).toBeNull()
})

it("claims a deposit only once when scans run concurrently", async () => {
  const session = await invoice()
  const received = await deposit()
  const matches = await Promise.all([
    matchDepositToSession(received.id),
    matchDepositToSession(received.id),
  ])
  expect(matches.filter(Boolean)).toHaveLength(1)
  expect(matches.find(Boolean)).toMatchObject({ sessionId: session.id })
})

it("does not claim two deposits for the same unsettled invoice", async () => {
  await invoice()
  const first = await deposit()
  const second = await deposit()
  const matches = await Promise.all([
    matchDepositToSession(first.id),
    matchDepositToSession(second.id),
  ])
  expect(matches.filter(Boolean)).toHaveLength(1)
})

it("does not let manual assignment reuse a deposit for another invoice", async () => {
  const first = await invoice()
  const second = await invoice()
  const received = await deposit()
  expect(await assignDepositToSession("btc", received.txHash, first.id)).toBe(true)
  expect(await assignDepositToSession("btc", received.txHash, second.id)).toBe(false)
})
