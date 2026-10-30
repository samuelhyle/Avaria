import crypto from "node:crypto"
import { cryptoCheckoutSessions, orders } from "@/db/schema"
import { CHAINS, type ChainId, MAX_SHORTFALL_RATIO, adapterFor, toUnits } from "@/lib/crypto/chains"
import { getRate, toCryptoAmount, walletAddressFor } from "@/lib/crypto/rates"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm"

/**
 * Crypto checkout sessions.
 *
 * A session is one Telegram invoice. It is created together with the order, so
 * the bot renders an order that already exists on the server rather than
 * becoming a place where commerce happens. The session carries the exact
 * crypto amount and the locked EUR rate.
 *
 * The token in the `t.me` deep link is opaque and unguessable: the cart
 * contents never travel in the URL, and the token resolves to a single
 * single-use session.
 */

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

/**
 * A Telegram deep-link payload: 22 characters from the alphabet Telegram
 * allows (`A-Z`, `a-z`, `0-9`, `_`, `-`). 22 base62 characters is ~130 bits,
 * so the token cannot be guessed or enumerated.
 */
export function generateSessionToken(): string {
  const bytes = crypto.randomBytes(22)
  let token = ""
  for (const byte of bytes) token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]
  return token
}

export interface CreateSessionInput {
  orderId: string
  chain: ChainId
  totalCents: number
  /** How long the invoice stays valid. */
  ttlMinutes?: number
}

export interface CreatedSession {
  id: string
  orderId: string
  chain: ChainId
  amountCrypto: string
  amountEurCents: number
  rateEurPerUnit: number
  walletAddress: string
  expiresAt: Date
  telegramUrl: string
}

export type SessionError = "chain_disabled" | "no_wallet" | "no_rate" | "invalid_total"

export class CryptoSessionError extends Error {
  constructor(
    readonly code: SessionError,
    message: string,
  ) {
    super(message)
    this.name = "CryptoSessionError"
  }
}

/**
 * Issue an invoice for a paid-in-crypto order.
 *
 * The EUR total is the price. The crypto amount is derived from it and the
 * rate is locked here, so the amount the customer sends always corresponds to
 * the euro figure they agreed to.
 */
export async function createCryptoSession(input: CreateSessionInput): Promise<CreatedSession> {
  if (!Number.isInteger(input.totalCents) || input.totalCents <= 0)
    throw new CryptoSessionError("invalid_total", "The order total is not usable.")
  return db.transaction(async (tx) => {
    // Serialize invoice creation with the existing order lock, including concurrent retries.
    await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update")
    const [existing] = await tx
      .select()
      .from(cryptoCheckoutSessions)
      .where(eq(cryptoCheckoutSessions.orderId, input.orderId))
      .limit(1)
    if (existing)
      return {
        ...existing,
        chain: existing.chain as ChainId,
        telegramUrl: telegramDeepLink(existing.id),
      }
    const walletAddress = walletAddressFor(input.chain)
    if (!walletAddress)
      throw new CryptoSessionError(
        "no_wallet",
        `No receiving address is configured for ${input.chain}.`,
      )
    const rate = await getRate(input.chain)
    if (!rate)
      throw new CryptoSessionError("no_rate", `No EUR rate is available for ${input.chain}.`)
    const amountCrypto = toCryptoAmount(input.totalCents, rate.eurPerUnit, input.chain)
    const ttlMinutes = input.ttlMinutes ?? 60
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
    const id = generateSessionToken()
    await tx.insert(cryptoCheckoutSessions).values({
      id,
      orderId: input.orderId,
      chain: input.chain,
      amountCrypto,
      amountEurCents: input.totalCents,
      rateEurPerUnit: rate.eurPerUnit,
      walletAddress,
      matchMode: "amount",
      status: "created",
      expiresAt,
    })
    return {
      id,
      orderId: input.orderId,
      chain: input.chain,
      amountCrypto,
      amountEurCents: input.totalCents,
      rateEurPerUnit: rate.eurPerUnit,
      walletAddress,
      expiresAt,
      telegramUrl: telegramDeepLink(id),
    }
  })
}

/** The `t.me` deep link that opens the bot with this session. */
export function telegramDeepLink(token: string): string {
  const username = getServerEnv().TELEGRAM_BOT_USERNAME
  if (!username)
    throw new CryptoSessionError(
      "chain_disabled",
      "TELEGRAM_BOT_USERNAME is not configured, so no deep link can be built.",
    )
  return `https://t.me/${username.replace(/^@/, "")}?start=${token}`
}

export interface SessionWithOrder {
  session: typeof cryptoCheckoutSessions.$inferSelect
  order: typeof orders.$inferSelect
}

/** Look up a session by its deep-link token. Returns null for unknown tokens. */
export async function getSessionByToken(token: string): Promise<SessionWithOrder | null> {
  const normalised = token.trim()
  if (!normalised || normalised.length > 64) return null
  const [row] = await db
    .select({ session: cryptoCheckoutSessions, order: orders })
    .from(cryptoCheckoutSessions)
    .innerJoin(orders, eq(orders.id, cryptoCheckoutSessions.orderId))
    .where(eq(cryptoCheckoutSessions.id, normalised))
    .limit(1)
  return row ?? null
}

/** Atomically bind an invoice to its first private Telegram customer. */
export async function claimSession(
  token: string,
  userId: string,
  chatId: string,
): Promise<boolean> {
  const rows = await db
    .update(cryptoCheckoutSessions)
    .set({ telegramUserId: userId, telegramChatId: chatId, updatedAt: new Date() })
    .where(
      and(
        eq(cryptoCheckoutSessions.id, token),
        or(
          and(
            isNull(cryptoCheckoutSessions.telegramUserId),
            isNull(cryptoCheckoutSessions.telegramChatId),
          ),
          and(
            eq(cryptoCheckoutSessions.telegramUserId, userId),
            eq(cryptoCheckoutSessions.telegramChatId, chatId),
          ),
        ),
      ),
    )
    .returning({ id: cryptoCheckoutSessions.id })
  return rows.length > 0
}

/** Record delivery without changing ownership or downgrading a settled invoice. */
export async function markSessionDelivered(
  token: string,
  telegram: { userId: string; chatId: string; messageId: string },
): Promise<void> {
  await db
    .update(cryptoCheckoutSessions)
    .set({ status: "delivered", botMessageId: telegram.messageId, updatedAt: new Date() })
    .where(
      and(
        eq(cryptoCheckoutSessions.id, token),
        eq(cryptoCheckoutSessions.telegramUserId, telegram.userId),
        eq(cryptoCheckoutSessions.telegramChatId, telegram.chatId),
        inArray(cryptoCheckoutSessions.status, ["created", "delivered"]),
      ),
    )
}

/** Sessions that are still waiting for a payment. */
export async function listOpenSessions(): Promise<SessionWithOrder[]> {
  return db
    .select({ session: cryptoCheckoutSessions, order: orders })
    .from(cryptoCheckoutSessions)
    .innerJoin(orders, eq(orders.id, cryptoCheckoutSessions.orderId))
    .where(
      and(
        or(
          eq(cryptoCheckoutSessions.status, "created"),
          eq(cryptoCheckoutSessions.status, "delivered"),
        ),
        gt(cryptoCheckoutSessions.expiresAt, new Date()),
        eq(orders.status, "awaiting_crypto"),
      ),
    )
    .orderBy(desc(cryptoCheckoutSessions.createdAt))
}

/** Sessions whose window has closed without a payment. */
export async function listExpiredSessions(): Promise<SessionWithOrder[]> {
  return db
    .select({ session: cryptoCheckoutSessions, order: orders })
    .from(cryptoCheckoutSessions)
    .innerJoin(orders, eq(orders.id, cryptoCheckoutSessions.orderId))
    .where(
      and(
        or(
          eq(cryptoCheckoutSessions.status, "created"),
          eq(cryptoCheckoutSessions.status, "delivered"),
        ),
        lte(cryptoCheckoutSessions.expiresAt, new Date()),
        eq(orders.status, "awaiting_crypto"),
      ),
    )
    .orderBy(desc(cryptoCheckoutSessions.createdAt))
}

/** Mark a session paid once its deposit has been matched. */
export async function markSessionPaid(token: string): Promise<void> {
  await db
    .update(cryptoCheckoutSessions)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(cryptoCheckoutSessions.id, token))
}

/**
 * Does a deposit satisfy a session?
 *
 * The EUR total is the price, so a deposit is acceptable when it is at least
 * the requested amount minus the chain's fee tolerance. The tolerance is a fee
 * estimate, and it is additionally capped as a share of the order: a fee that
 * would be a rounding error on a large order must not silently excuse a
 * quarter of a small one. A deposit below that cap is underpayment and goes to
 * manual review rather than being accepted.
 */
export function depositSatisfiesSession(
  session: { chain: ChainId; amountCrypto: string },
  depositAmount: string,
): "exact" | "acceptable" | "underpaid" | "invalid" {
  const info = CHAINS[session.chain]
  const wanted = toUnits(session.amountCrypto, info.decimals)
  const received = toUnits(depositAmount, info.decimals)
  if (wanted === null || received === null) return "invalid"
  if (received === wanted) return "exact"
  if (received > wanted) return "exact"
  const shortfall = wanted - received
  const tolerance = BigInt(info.toleranceUnits)
  if (shortfall > tolerance) return "underpaid"
  // The fee tolerance may not exceed a share of the order.
  const cap = (wanted * BigInt(Math.round(MAX_SHORTFALL_RATIO * 10_000))) / 10_000n
  if (shortfall > cap) return "underpaid"
  return "acceptable"
}

/** The payment URI the customer's wallet opens. */
export function paymentUriFor(
  chain: ChainId,
  address: string,
  amount: string,
  orderNumber: string,
): string {
  return adapterFor(chain).paymentUri(address, amount, "AverianLabs", `Order ${orderNumber}`)
}
