import { cryptoCheckoutSessions, cryptoDeposits, orders } from "@/db/schema"
import { CHAINS, confirmationsSince, toUnits } from "@/lib/crypto/chains"
import { matchDepositToSession, recordDeposit } from "@/lib/crypto/matching"
import { depositSatisfiesSession } from "@/lib/crypto/session"
import { db } from "@/lib/db"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * The deposit pipeline.
 *
 * A crypto payment is only a payment once the chain has confirmed it. These
 * tests cover the rules that decide when a deposit counts: the confirmation
 * depth, the shortfall a fee may excuse, and the arithmetic that turns a
 * block height into a confirmation count.
 *
 * The bugs here were real: deposits were matched while still unconfirmed, a
 * deposit was only ever examined on the scan where it first appeared, and the
 * Bitcoin fee tolerance was wide enough to excuse a quarter of a small order.
 */

const SKU = "QA-PEPTIDE-10"
const ADDRESS = "bc1qtestaddress0000000000000000000000000000"
const TX = "a".repeat(64)

function requireIsolatedDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
}

/** A session waiting for `amountCrypto` on the given chain. */
async function insertSession(orderId: string, amountCrypto: string, chain = "btc") {
  const id = `sess-${crypto.randomUUID().slice(0, 12)}`
  await db.insert(cryptoCheckoutSessions).values({
    id,
    orderId,
    chain,
    amountCrypto,
    amountEurCents: 5000,
    rateEurPerUnit: 60000,
    walletAddress: ADDRESS,
    matchMode: "amount",
    status: "delivered",
    expiresAt: new Date(Date.now() + 60 * 60_000),
  })
  return id
}

async function insertOrder() {
  const id = crypto.randomUUID()
  await db.insert(orders).values({
    id,
    number: `AL-${id.slice(0, 8).toUpperCase()}`,
    email: "deposit-qa@example.invalid",
    status: "awaiting_crypto",
    subtotalCents: 4000,
    shippingCents: 990,
    vatCents: 1014,
    totalCents: 4990,
    currency: "EUR",
    currencyPerLine: "EUR",
    locale: "en",
    paymentMethod: "crypto",
  })
  return id
}

async function cleanup(orderId: string, sessionIds: string[] = [], depositIds: string[] = []) {
  await db.delete(cryptoDeposits).where(eq(cryptoDeposits.txHash, TX))
  for (const id of sessionIds)
    await db.delete(cryptoCheckoutSessions).where(eq(cryptoCheckoutSessions.id, id))
  for (const id of depositIds) await db.delete(cryptoDeposits).where(eq(cryptoDeposits.id, id))
  await db.delete(orders).where(eq(orders.id, orderId))
}

it("does not match a deposit that the chain has not confirmed", async () => {
  requireIsolatedDatabase()
  await withFixtureStock([SKU], async () => {
    const orderId = await insertOrder()
    const sessionId = await insertSession(orderId, "0.00083166")
    try {
      // The deposit is seen in the mempool: zero confirmations.
      await recordDeposit({
        chain: "btc",
        txHash: TX,
        walletAddress: ADDRESS,
        amountCrypto: "0.00083166",
        confirmations: 0,
        seenAt: new Date(),
      })
      const [deposit] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.txHash, TX))
      expect(deposit).toBeTruthy()
      // An unconfirmed transaction can still be dropped. It must not fulfil.
      expect(await matchDepositToSession(deposit.id)).toBeNull()
      expect(deposit.matchedSessionId).toBeNull()
    } finally {
      await cleanup(orderId, [sessionId])
    }
  })
})

it("matches a deposit once it has enough confirmations", async () => {
  requireIsolatedDatabase()
  await withFixtureStock([SKU], async () => {
    const orderId = await insertOrder()
    const sessionId = await insertSession(orderId, "0.00083166")
    try {
      await recordDeposit({
        chain: "btc",
        txHash: TX,
        walletAddress: ADDRESS,
        amountCrypto: "0.00083166",
        confirmations: 0,
        seenAt: new Date(),
      })
      const [first] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.txHash, TX))
      expect(await matchDepositToSession(first.id)).toBeNull()

      // The transaction is mined. The deposit is seen again and its
      // confirmation count is refreshed, and now it may be matched.
      const isNew = await recordDeposit({
        chain: "btc",
        txHash: TX,
        walletAddress: ADDRESS,
        amountCrypto: "0.00083166",
        confirmations: CHAINS.btc.requiredConfirmations,
        seenAt: new Date(),
      })
      expect(isNew).toBe(false)
      const [second] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.txHash, TX))
      expect(second.confirmations).toBe(CHAINS.btc.requiredConfirmations)
      const match = await matchDepositToSession(second.id)
      expect(match).toBeTruthy()
      expect(match?.sessionId).toBe(sessionId)
      expect(match?.orderId).toBe(orderId)
    } finally {
      await cleanup(orderId, [sessionId])
    }
  })
})

it("counts confirmations from the chain tip", () => {
  // A transaction in the tip block has one confirmation.
  expect(confirmationsSince(100, 100)).toBe(1)
  expect(confirmationsSince(100, 101)).toBe(2)
  expect(confirmationsSince(98, 100)).toBe(3)
  // Not in a block yet: no confirmations at all.
  expect(confirmationsSince(null, 100)).toBe(0)
  expect(confirmationsSince(undefined, 100)).toBe(0)
  // A block ahead of the tip is impossible; treat it as unconfirmed.
  expect(confirmationsSince(101, 100)).toBe(0)
  // Without a tip there is nothing to count against.
  expect(confirmationsSince(100, null)).toBe(0)
})

it("does not excuse a shortfall larger than the fee tolerance", () => {
  // A fee of 5 000 satoshis on a large order is a rounding error.
  const large = { chain: "btc" as const, amountCrypto: "0.00833000" }
  // 833 000 satoshis expected, 828 000 received: a 5 000 satoshi fee.
  expect(depositSatisfiesSession(large, "0.00828000")).toBe("acceptable")
  // A materially short payment is underpayment, whatever the order size.
  expect(depositSatisfiesSession(large, "0.00030000")).toBe("underpaid")

  // The same 5 000 satoshi fee on a €50 order is a tenth of the invoice. It
  // must not be silently accepted.
  const small = { chain: "btc" as const, amountCrypto: "0.00083166" }
  expect(depositSatisfiesSession(small, "0.00078166")).toBe("underpaid")
  // A tiny shortfall, well inside the fee, is accepted.
  expect(depositSatisfiesSession(small, "0.00082666")).toBe("acceptable")
})

it("accepts an overpayment and refuses a malformed amount", () => {
  const session = { chain: "btc" as const, amountCrypto: "0.00083166" }
  expect(depositSatisfiesSession(session, "0.00093166")).toBe("exact")
  expect(depositSatisfiesSession(session, "not-a-number")).toBe("invalid")
  expect(depositSatisfiesSession(session, "0.0008316612345")).toBe("invalid")
})

it("keeps the amount arithmetic in integer units", () => {
  // 0.1 BTC is exactly 10 000 000 satoshis.
  expect(toUnits("0.1", 8)).toBe(10_000_000n)
  // A fee-sized shortfall is exact, not approximate.
  expect(toUnits("0.00078166", 8)).toBe(78_166n)
  expect(toUnits("0.00082666", 8)).toBe(82_666n)
})
