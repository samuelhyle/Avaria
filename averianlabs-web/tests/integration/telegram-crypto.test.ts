import {
  cryptoCheckoutSessions,
  cryptoDeposits,
  emailOutbox,
  orders,
  products,
  telegramOutbox,
  vials,
} from "@/db/schema"
import { CHAINS, fromUnits, toUnits } from "@/lib/crypto/chains"
import { depositSatisfiesSession } from "@/lib/crypto/session"
import { createCryptoSession } from "@/lib/crypto/session"
import { SOLANA_MAINNET_GENESIS, SOLANA_TOKEN_PROGRAM, SOLANA_USDC_MINT } from "@/lib/crypto/solana"
import { db } from "@/lib/db"
import { renderOrderReceipt } from "@/lib/email/receipt"
import { resetServerEnvCache } from "@/lib/env"
import { createOrder } from "@/lib/orders/service"
import { type TelegramSender, handleUpdate } from "@/lib/telegram/handlers"
import { escapeTelegramHtml, localeFromLanguageCode } from "@/lib/telegram/messages"
import { withFixtureStock } from "@/tests/helpers/fixture-stock"
import { eq, inArray } from "drizzle-orm"
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest"

/**
 * The Telegram crypto checkout.
 *
 * The order is created on the server, the invoice is rendered by the bot from
 * that order, and the amount in the message is the amount the server will
 * accept. These tests drive the real handlers with a mock sender, so the
 * whole path is exercised without a live bot.
 */

const SKU = "QA-PEPTIDE-10"
const SOLANA_WALLET = "mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN"
const SOLANA_ACCOUNT = "BGocb4GEpbTFm8UFV2VsDSaBXHELPfAXrvd4vtt8QWrA"

/**
 * The crypto settings the suite needs.
 *
 * They are set here rather than expected in the shell, so the suite is
 * self-contained and does not silently skip a test when the environment is
 * missing a variable.
 */
const CRYPTO_ENV = {
  TELEGRAM_BOT_USERNAME: "AverianLabsBot",
  TELEGRAM_OPS_CHAT_ID: "-1000000000000",
  CRYPTO_ENABLED_CHAINS: "btc,usdt_trc20,usdc_solana",
  CRYPTO_WALLET_ADDRESSES: `btc=bc1qtestaddress0000000000000000000000000000,usdt_trc20=TTestAddress000000000000000000000000,usdc_solana=${SOLANA_WALLET}`,
  CRYPTO_RATE_API_URL: "",
  CRYPTO_FALLBACK_RATES: "btc=60000,usdt_trc20=0.92,usdc_solana=0.9",
  SOLANA_RPC_URL: "https://solana-rpc.example.invalid",
}
const originalEnv = new Map<string, string | undefined>()

beforeAll(() => {
  for (const [key, value] of Object.entries(CRYPTO_ENV)) {
    originalEnv.set(key, process.env[key])
    process.env[key] = value
  }
  resetServerEnvCache()
})

afterAll(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetServerEnvCache()
})

afterEach(() => vi.unstubAllGlobals())

function requireIsolatedDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
}

interface SentMessage {
  chatId: string | number
  text: string
}

function mockSender(sent: SentMessage[]): TelegramSender {
  return {
    async send(params) {
      sent.push({ chatId: params.chatId, text: params.text })
      return { messageId: sent.length }
    },
  }
}

/**
 * Create an order for the test and clean it up afterwards.
 *
 * Creating an order decrements the fixture stock, so the stock is restored by
 * `withFixtureStock` — otherwise repeated runs would drain the fixture.
 */
async function withOrder<T>(
  email: string,
  run: (order: { id: string; number: string; totalCents: number; email: string }) => Promise<T>,
  paymentMethod: "stripe" | "crypto" = "stripe",
): Promise<T> {
  return withFixtureStock([SKU], async () => {
    const order = await createOrder({
      email,
      items: [{ sku: SKU, qty: 1 }],
      shippingCents: 990,
      locale: "en",
      termsAccepted: true,
      checkoutKey: crypto.randomUUID(),
      paymentMethod,
    })
    try {
      return await run({
        id: order.id,
        number: order.number,
        totalCents: order.totalCents,
        email: order.email,
      })
    } finally {
      await db.delete(orders).where(eq(orders.id, order.id))
    }
  })
}

it("issues an invoice whose amount matches the order total", async () => {
  requireIsolatedDatabase()
  await withOrder("telegram-qa@example.invalid", async (order) => {
    const session = await createCryptoSession({
      orderId: order.id,
      chain: "btc",
      totalCents: order.totalCents,
    })
    expect(session.telegramUrl).toContain("?start=")
    expect(session.telegramUrl.startsWith("https://t.me/")).toBe(true)
    // The token is the deep-link payload and nothing else.
    const token = session.telegramUrl.split("start=")[1] ?? ""
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)

    // The crypto amount is derived from the euro total at the locked rate.
    const expectedUnits = toUnits(session.amountCrypto, CHAINS.btc.decimals) ?? 0n
    const euroUnits = BigInt(Math.floor((order.totalCents / 100 / session.rateEurPerUnit) * 1e8))
    expect(expectedUnits).toBe(euroUnits)

    const sent: SentMessage[] = []
    await handleUpdate({
      update: {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 42, type: "private" },
          from: { id: 42, language_code: "en" },
          text: `/start ${token}`,
        },
      },
      sender: mockSender(sent),
    })

    expect(sent).toHaveLength(1)
    const invoice = sent[0].text
    expect(invoice).toContain(order.number)
    // The euro total, the crypto amount, the address and the deadline.
    expect(invoice).toContain("BTC")
    expect(invoice).toContain(session.walletAddress)
    expect(invoice).toMatch(/€\d/)
    // The customer must be told that a wrong amount does not clear.
    expect(invoice.toLowerCase()).toContain("wrong network")

    // The session records that the invoice reached the customer.
    const [stored] = await db
      .select()
      .from(cryptoCheckoutSessions)
      .where(eq(cryptoCheckoutSessions.id, token))
    expect(stored.status).toBe("delivered")
    expect(stored.telegramChatId).toBe("42")
  })
})

it("tells the team about a new order in the ops chat", async () => {
  requireIsolatedDatabase()
  await withOrder("telegram-ops-qa@example.invalid", async (order) => {
    const session = await createCryptoSession({
      orderId: order.id,
      chain: "usdt_trc20",
      totalCents: order.totalCents,
    })
    await handleUpdate({
      update: {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: 43, type: "private" },
          from: { id: 43, language_code: "en" },
          text: `/start ${session.id}`,
        },
      },
      sender: mockSender([]),
    })
    const queued = await db.select().from(telegramOutbox)
    const ops = queued.find((row) => row.dedupeKey === `crypto-ops-created:${session.id}`)
    expect(ops).toBeTruthy()
    expect(ops?.text).toContain(order.number)
    expect(ops?.text).toContain("USDT")
    expect(ops?.text).toContain(order.email)
    await db
      .delete(telegramOutbox)
      .where(eq(telegramOutbox.dedupeKey, `crypto-ops-created:${session.id}`))
  })
})

it("settles a Telegram USDC invoice only after a fresh finalized native Solana deposit", async () => {
  requireIsolatedDatabase()
  await withOrder(
    "telegram-usdc-qa@example.invalid",
    async (order) => {
      const session = await createCryptoSession({
        orderId: order.id,
        chain: "usdc_solana",
        totalCents: order.totalCents,
      })
      const signature =
        "4ReKprwf3WdLHRrzp4ctPWNBsQDPL3VZz3zMmoZfcGJMJCHh5Vq937mPdyxhCbw54wNnA6hZ7KfNpQdpt13yY7A9"
      const historicalSignature = `${signature.slice(0, -1)}B`
      const atomicAmount = toUnits(session.amountCrypto, 6)?.toString()
      expect(atomicAmount).toBeTruthy()
      // The simulated invoice precedes the second-resolution blockchain time.
      const blockTime = Math.floor(Date.now() / 1000)
      await db
        .update(cryptoCheckoutSessions)
        .set({ createdAt: new Date((blockTime - 1) * 1000) })
        .where(eq(cryptoCheckoutSessions.id, session.id))
      let freshPayment = false
      const rpc = vi.fn(async (input: unknown, init?: RequestInit) => {
        expect(input).toBe(CRYPTO_ENV.SOLANA_RPC_URL)
        const request = JSON.parse(init?.body as string) as {
          id: number
          method: string
          params: unknown[]
        }
        let result: unknown
        if (request.method === "getGenesisHash") result = SOLANA_MAINNET_GENESIS
        else if (request.method === "getTokenAccountsByOwner")
          result = {
            value: [
              {
                pubkey: SOLANA_ACCOUNT,
                account: {
                  owner: SOLANA_TOKEN_PROGRAM,
                  data: {
                    parsed: {
                      type: "account",
                      info: {
                        owner: SOLANA_WALLET,
                        mint: SOLANA_USDC_MINT,
                        tokenAmount: { decimals: 6 },
                      },
                    },
                  },
                },
              },
            ],
          }
        else if (request.method === "getSignaturesForAddress")
          result = [
            ...(freshPayment
              ? [{ signature, slot: 400_000_001, err: null, confirmationStatus: "finalized" }]
              : []),
            {
              signature: historicalSignature,
              slot: 400_000_000,
              err: null,
              confirmationStatus: "finalized",
            },
          ]
        else if (request.method === "getTransaction") {
          const currentSignature = request.params[0]
          const balance = (amount: string) => ({
            accountIndex: 1,
            mint: SOLANA_USDC_MINT,
            owner: SOLANA_WALLET,
            programId: SOLANA_TOKEN_PROGRAM,
            uiTokenAmount: { amount, decimals: 6 },
          })
          result = {
            slot: currentSignature === signature ? 400_000_001 : 400_000_000,
            blockTime: currentSignature === signature ? blockTime : blockTime - 60,
            transaction: {
              signatures: [currentSignature],
              message: { accountKeys: [{ pubkey: SOLANA_WALLET }, { pubkey: SOLANA_ACCOUNT }] },
            },
            meta: {
              err: null,
              preTokenBalances: [balance("0")],
              postTokenBalances: [balance(atomicAmount ?? "0")],
            },
          }
        } else throw new Error(`Unexpected mocked RPC method: ${request.method}`)
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }))
      })
      vi.stubGlobal("fetch", rpc)
      const sent: SentMessage[] = []
      const sender = mockSender(sent)
      const update = {
        id: "usdc-payment-check",
        data: `paid:${session.id}`,
        from: { id: 46, language_code: "en" },
        message: { message_id: 1, chat: { id: 46, type: "private" } },
      }
      try {
        await handleUpdate({
          update: {
            update_id: 5,
            message: {
              message_id: 1,
              chat: { id: 46, type: "private" },
              from: { id: 46, language_code: "en" },
              text: `/start ${session.id}`,
            },
          },
          sender,
        })
        expect(sent[0]?.text).toContain("USD Coin (Solana)")
        expect(sent[0]?.text).toContain(session.amountCrypto)
        expect(sent[0]?.text).toContain(SOLANA_WALLET)
        expect(session.telegramUrl).toBe(`https://t.me/AverianLabsBot?start=${session.id}`)

        // A pre-existing finalized deposit of the same amount cannot pay this order.
        await handleUpdate({ update: { update_id: 6, callback_query: update }, sender })
        const [unpaid] = await db.select().from(orders).where(eq(orders.id, order.id))
        expect(unpaid?.status).toBe("awaiting_crypto")
        const [oldDeposit] = await db
          .select()
          .from(cryptoDeposits)
          .where(eq(cryptoDeposits.txHash, historicalSignature))
        expect(oldDeposit?.matchedSessionId).toBeNull()

        freshPayment = true
        await handleUpdate({ update: { update_id: 7, callback_query: update }, sender })
        const [paidOrder] = await db.select().from(orders).where(eq(orders.id, order.id))
        const [paidSession] = await db
          .select()
          .from(cryptoCheckoutSessions)
          .where(eq(cryptoCheckoutSessions.id, session.id))
        const [matchedDeposit] = await db
          .select()
          .from(cryptoDeposits)
          .where(eq(cryptoDeposits.txHash, signature))
        expect(paidOrder?.status).toBe("paid")
        expect(paidOrder?.cryptoChargeId).toBe(signature)
        expect(paidSession?.status).toBe("paid")
        expect(paidSession?.telegramChatId).toBe("46")
        expect(matchedDeposit?.matchedSessionId).toBe(session.id)
        expect(matchedDeposit?.amountCrypto).toBe(session.amountCrypto)
        expect(sent.at(-1)?.text).toContain("USDC")
        expect(sent.at(-1)?.text).toContain(order.number)
        const receipt = await db
          .select()
          .from(emailOutbox)
          .where(eq(emailOutbox.dedupeKey, `order-paid:${order.id}`))
        expect(receipt).toHaveLength(1)
        expect(receipt[0]?.html).toContain("USD Coin (Solana)")
        expect(receipt[0]?.html).toContain(signature)
        const ops = await db
          .select()
          .from(telegramOutbox)
          .where(eq(telegramOutbox.dedupeKey, `crypto-paid-ops:${session.id}`))
        expect(ops).toHaveLength(1)
        expect(ops[0]?.text).toContain("USDC")
      } finally {
        await db
          .delete(cryptoDeposits)
          .where(inArray(cryptoDeposits.txHash, [signature, historicalSignature]))
        await db
          .delete(telegramOutbox)
          .where(
            inArray(telegramOutbox.dedupeKey, [
              `crypto-ops-created:${session.id}`,
              `crypto-paid-buyer:${session.id}`,
              `crypto-paid-ops:${session.id}`,
            ]),
          )
        await db.delete(emailOutbox).where(eq(emailOutbox.dedupeKey, `order-paid:${order.id}`))
      }
    },
    "crypto",
  )
})

it("refuses an unknown token without leaking anything", async () => {
  requireIsolatedDatabase()
  const sent: SentMessage[] = []
  await handleUpdate({
    update: {
      update_id: 3,
      message: {
        message_id: 3,
        chat: { id: 44, type: "private" },
        from: { id: 44, language_code: "en" },
        text: "/start AAAAAAAAAAAAAAAAAAAAAA",
      },
    },
    sender: mockSender(sent),
  })
  expect(sent).toHaveLength(1)
  expect(sent[0].text).toMatch(/could not find/i)
  expect(sent[0].text).not.toContain("AL-")
})

it("greets a customer who opens the bot without an invoice", async () => {
  requireIsolatedDatabase()
  const sent: SentMessage[] = []
  await handleUpdate({
    update: {
      update_id: 4,
      message: {
        message_id: 4,
        chat: { id: 45, type: "private" },
        from: { id: 45, language_code: "fi" },
        text: "/start",
      },
    },
    sender: mockSender(sent),
  })
  expect(sent).toHaveLength(1)
  expect(sent[0].text).toContain("AverianLabs")
  // The Finnish customer is greeted in Finnish.
  expect(sent[0].text).toContain("Tervetuloa")
})

it("escapes customer-controlled text before it reaches the chat", () => {
  expect(escapeTelegramHtml('<b>Bold</b> & "quotes"')).toBe(
    "&lt;b&gt;Bold&lt;/b&gt; &amp; &quot;quotes&quot;",
  )
})

it("matches a deposit to the session within the fee band and rejects a short payment", () => {
  const session = { chain: "btc" as const, amountCrypto: "0.00100000" }
  expect(depositSatisfiesSession(session, "0.00100000")).toBe("exact")
  // A fee of 5 000 satoshis is inside the tolerance.
  expect(depositSatisfiesSession(session, "0.00095000")).toBe("acceptable")
  // A materially short payment is not.
  expect(depositSatisfiesSession(session, "0.00050000")).toBe("underpaid")
  expect(depositSatisfiesSession(session, "not-a-number")).toBe("invalid")
})

it("converts amounts without floating point drift", () => {
  expect(toUnits("0.1", 8)).toBe(10_000_000n)
  expect(fromUnits(10_000_000n, 8)).toBe("0.1")
  expect(toUnits("1.5", 6)).toBe(1_500_000n)
  expect(toUnits("1.1234567", 6)).toBeNull()
})

it("maps a Telegram language code onto a supported locale", () => {
  expect(localeFromLanguageCode("fi")).toBe("fi")
  expect(localeFromLanguageCode("fi-FI")).toBe("fi")
  expect(localeFromLanguageCode("de-AT")).toBe("en")
  expect(localeFromLanguageCode("ja")).toBe("en")
  expect(localeFromLanguageCode(undefined)).toBe("en")
})

it("puts the crypto amount and the transaction on the receipt", async () => {
  requireIsolatedDatabase()
  await withOrder("telegram-receipt-qa@example.invalid", async (order) => {
    const session = await createCryptoSession({
      orderId: order.id,
      chain: "btc",
      totalCents: order.totalCents,
    })
    try {
      // A crypto receipt has no card statement to fall back on, so it carries
      // the amount that was sent and the transaction that paid for it.
      const html = renderOrderReceipt({
        orderNumber: order.number,
        email: order.email,
        locale: "en",
        items: [
          {
            name: "QA peptide",
            sku: SKU,
            sizeValue: 10,
            sizeUnit: "mg",
            qty: 1,
            priceCents: order.totalCents,
          },
        ],
        subtotalCents: order.totalCents,
        shippingCents: 0,
        vatCents: 0,
        totalCents: order.totalCents,
        crypto: {
          chainLabel: "Bitcoin",
          symbol: "BTC",
          amount: session.amountCrypto,
          txHash: "f".repeat(64),
          rateEurPerUnit: session.rateEurPerUnit,
        },
      })
      expect(html).toContain(session.amountCrypto)
      expect(html).toContain("Bitcoin")
      expect(html).toContain("f".repeat(64))
    } finally {
      await db.delete(cryptoCheckoutSessions).where(eq(cryptoCheckoutSessions.id, session.id))
    }
  })
})

it("leaves a card receipt without a crypto block", async () => {
  const html = renderOrderReceipt({
    orderNumber: "AL-20261023-TEST0001",
    email: "card@example.invalid",
    locale: "en",
    items: [],
    subtotalCents: 1000,
    shippingCents: 0,
    vatCents: 0,
    totalCents: 1000,
  })
  expect(html).toContain("AL-20261023-TEST0001")
  expect(html).not.toContain("Transaction")
})

it("creates one invoice under concurrent retries", async () => {
  requireIsolatedDatabase()
  await withOrder(
    "telegram-concurrent@example.invalid",
    async (order) => {
      const input = {
        orderId: order.id,
        chain: "usdc_solana" as const,
        totalCents: order.totalCents,
      }
      const sessions = await Promise.all(
        Array.from({ length: 4 }, () => createCryptoSession(input)),
      )
      expect(new Set(sessions.map((session) => session.id)).size).toBe(1)
      expect(
        await db
          .select()
          .from(cryptoCheckoutSessions)
          .where(eq(cryptoCheckoutSessions.orderId, order.id)),
      ).toHaveLength(1)
    },
    "crypto",
  )
})

it("keeps invoice details private and cannot rebind the customer's Telegram", async () => {
  requireIsolatedDatabase()
  await withOrder(
    "telegram-private@example.invalid",
    async (order) => {
      const session = await createCryptoSession({
        orderId: order.id,
        chain: "usdc_solana",
        totalCents: order.totalCents,
      })
      const sent: SentMessage[] = []
      const sender = mockSender(sent)
      const start = (id: number, type = "private") =>
        handleUpdate({
          sender,
          update: {
            update_id: id,
            message: {
              message_id: id,
              chat: { id: type === "private" ? id : -123, type },
              from: { id },
              text: `/start@Averianlabs_bot ${session.id}`,
            },
          },
        })
      await start(1001, "group")
      expect(sent.at(-1)?.text).not.toContain(order.number)
      let [stored] = await db
        .select()
        .from(cryptoCheckoutSessions)
        .where(eq(cryptoCheckoutSessions.id, session.id))
      expect(stored.telegramChatId).toBeNull()
      await start(1001)
      expect(sent.at(-1)?.text).toContain(order.number)
      await start(1002)
      expect(sent.at(-1)?.text).not.toContain(order.number)
      await handleUpdate({
        sender,
        update: {
          update_id: 1003,
          message: {
            message_id: 1,
            chat: { id: 1002, type: "private" },
            from: { id: 1002 },
            text: `/status ${session.id}`,
          },
        },
      })
      expect(sent.at(-1)?.text).not.toContain(order.number)
      const answer = vi.fn(async () => {})
      await handleUpdate({
        sender: { ...sender, answerCallback: answer },
        update: {
          update_id: 1004,
          callback_query: {
            id: "private-button",
            data: `paid:${session.id}`,
            from: { id: 1002 },
            message: { message_id: 1, chat: { id: 1002, type: "private" } },
          },
        },
      })
      expect(answer).toHaveBeenCalledWith("private-button")
      ;[stored] = await db
        .select()
        .from(cryptoCheckoutSessions)
        .where(eq(cryptoCheckoutSessions.id, session.id))
      expect(stored.telegramChatId).toBe("1001")
      expect(stored.telegramUserId).toBe("1001")
      const { markSessionPaid, markSessionDelivered } = await import("@/lib/crypto/session")
      await markSessionPaid(session.id)
      await markSessionDelivered(session.id, { userId: "1001", chatId: "1001", messageId: "2" })
      ;[stored] = await db
        .select()
        .from(cryptoCheckoutSessions)
        .where(eq(cryptoCheckoutSessions.id, session.id))
      expect(stored.status).toBe("paid")
    },
    "crypto",
  )
})

it("reports payment review without promising dispatch or issuing a paid receipt", async () => {
  requireIsolatedDatabase()
  await withOrder(
    "telegram-review@example.invalid",
    async (order) => {
      const session = await createCryptoSession({
        orderId: order.id,
        chain: "usdc_solana",
        totalCents: order.totalCents,
      })
      const { claimSession } = await import("@/lib/crypto/session")
      await claimSession(session.id, "1007", "1007")
      const [vial] = await db.select().from(vials).where(eq(vials.sku, SKU))
      const [product] = await db.select().from(products).where(eq(products.id, vial.productId))
      try {
        await db.update(products).set({ status: "draft" }).where(eq(products.id, product.id))
        const { settleSessionFromDeposit } = await import("@/lib/crypto/watcher")
        await settleSessionFromDeposit(
          {
            sessionId: session.id,
            orderId: order.id,
            txHash: "simulated-review-deposit",
            amountCrypto: session.amountCrypto,
            kind: "exact",
          },
          "usdc_solana",
        )
        const [stored] = await db.select().from(orders).where(eq(orders.id, order.id))
        expect(stored.status).toBe("payment_review")
        const queued = await db
          .select()
          .from(telegramOutbox)
          .where(eq(telegramOutbox.dedupeKey, `crypto-paid-ops:${session.id}`))
        expect(queued[0].text).toContain("manual review required")
        expect(queued[0].text).toContain("Do not dispatch")
        expect(
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.dedupeKey, `order-paid:${order.id}`)),
        ).toHaveLength(0)
      } finally {
        await db.update(products).set({ status: product.status }).where(eq(products.id, product.id))
      }
    },
    "crypto",
  )
})
