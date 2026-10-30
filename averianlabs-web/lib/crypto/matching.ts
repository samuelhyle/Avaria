import { cryptoCheckoutSessions, cryptoDeposits, orders } from "@/db/schema"
import { CHAINS, type ChainId, toUnits } from "@/lib/crypto/chains"
import { depositSatisfiesSession } from "@/lib/crypto/session"
import { db } from "@/lib/db"
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm"

/**
 * Deposit matching.
 *
 * Every deposit the watcher sees is stored, whether or not it matches an
 * order. Unmatched deposits are what makes a manual "match by transaction
 * hash" override possible when an automatic match is ambiguous — a shared
 * receiving address with a fee-tolerant amount match will eventually produce
 * a deposit that belongs to nobody, and a human has to resolve it.
 */

export interface ScannedDeposit {
  chain: ChainId
  txHash: string
  walletAddress: string
  amountCrypto: string
  confirmations: number
  /** Timestamp reported by the chain, not the time this scan ran. */
  seenAt?: Date
  raw?: unknown
}

export interface MatchResult {
  sessionId: string
  orderId: string
  txHash: string
  amountCrypto: string
  /** `exact` when the amount matches to the unit, `acceptable` within the fee band. */
  kind: "exact" | "acceptable"
}

/**
 * Store a deposit, or refresh the confirmation count of one we have seen.
 *
 * The confirmation count only ever grows, so it is refreshed on every scan: a
 * deposit that was seen in the mempool is still unconfirmed later, and one
 * that gains confirmations must be re-examined. Returns whether the deposit
 * is new.
 */
export async function recordDeposit(deposit: ScannedDeposit): Promise<boolean> {
  const chainTime = deposit.seenAt
  const hasChainTime =
    chainTime instanceof Date && Number.isFinite(chainTime.getTime()) && chainTime.getTime() > 0
  // Older rows used seen_at for the scan time. Keep an explicit marker so
  // those rows cannot be mistaken for payments made after a new invoice.
  const raw = hasChainTime
    ? {
        ...(deposit.raw && typeof deposit.raw === "object" ? deposit.raw : {}),
        onChainSeenAt: chainTime.toISOString(),
      }
    : null
  const inserted = await db
    .insert(cryptoDeposits)
    .values({
      chain: deposit.chain,
      txHash: deposit.txHash,
      walletAddress: deposit.walletAddress,
      amountCrypto: deposit.amountCrypto,
      confirmations: deposit.confirmations,
      ...(hasChainTime ? { seenAt: chainTime } : {}),
      raw,
    })
    .onConflictDoNothing({ target: [cryptoDeposits.chain, cryptoDeposits.txHash] })
    .returning({ id: cryptoDeposits.id })
  if (inserted.length) return true
  await db
    .update(cryptoDeposits)
    .set({
      confirmations: deposit.confirmations,
      ...(hasChainTime ? { seenAt: chainTime, raw } : {}),
    })
    .where(and(eq(cryptoDeposits.chain, deposit.chain), eq(cryptoDeposits.txHash, deposit.txHash)))
  return false
}

/**
 * Match a stored deposit to an open session.
 *
 * Matching is by wallet address plus amount. The amount comparison allows for
 * the network fee being deducted from the transferred amount, which happens on
 * Bitcoin and on TRON. A deposit that is clearly short is not matched at all —
 * it is left for manual review.
 *
 * A deposit is only matched once the chain has confirmed it enough times. An
 * unconfirmed transaction can still be dropped or replaced, and fulfilling an
 * order against one would ship goods for a payment that never settled.
 */
export async function matchDepositToSession(depositId: string): Promise<MatchResult | null> {
  const [deposit] = await db.select().from(cryptoDeposits).where(eq(cryptoDeposits.id, depositId))
  if (!deposit) return null
  const chain = deposit.chain as ChainId
  if (!(chain in CHAINS)) return null
  return db.transaction(async (tx) => {
    // Serialize claims for a receiving address. Distinct deposits must not
    // concurrently pay the same invoice while settlement is still running.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`crypto-match:${chain}:${deposit.walletAddress}`}))`,
    )
    const [current] = await tx
      .select()
      .from(cryptoDeposits)
      .where(eq(cryptoDeposits.id, depositId))
      .for("update")
    if (
      !current ||
      current.matchedSessionId ||
      current.confirmations < CHAINS[chain].requiredConfirmations
    )
      return null
    const timestamp = (current.raw as { onChainSeenAt?: unknown } | null)?.onChainSeenAt
    const chainTime = typeof timestamp === "string" ? new Date(timestamp).getTime() : Number.NaN
    if (!Number.isFinite(chainTime) || chainTime <= 0) return null

    const rows = await tx
      .select({ session: cryptoCheckoutSessions, orderStatus: orders.status })
      .from(cryptoCheckoutSessions)
      .innerJoin(orders, eq(orders.id, cryptoCheckoutSessions.orderId))
      .where(
        and(
          eq(cryptoCheckoutSessions.chain, chain),
          eq(cryptoCheckoutSessions.walletAddress, current.walletAddress),
          lte(cryptoCheckoutSessions.createdAt, new Date(chainTime)),
          gte(cryptoCheckoutSessions.expiresAt, new Date(chainTime)),
        ),
      )
    const candidates = rows.flatMap(({ session, orderStatus }) => {
      // A timely transfer may reach finality after the deadline, but money
      // sent before the invoice or after its deadline requires manual review.
      const verdict = depositSatisfiesSession(
        { chain: session.chain as ChainId, amountCrypto: session.amountCrypto },
        current.amountCrypto,
      )
      return verdict === "exact" || verdict === "acceptable"
        ? [{ session, orderStatus, verdict }]
        : []
    })
    // Shared wallets can have overlapping invoices for the same amount.
    // Choosing the first one would silently pay the wrong customer's order.
    if (candidates.length !== 1) return null
    const candidate = candidates[0]
    if (!candidate) return null
    const { session, verdict } = candidate
    if (
      !["created", "delivered"].includes(session.status) ||
      candidate.orderStatus !== "awaiting_crypto"
    )
      return null
    // Closed overlapping invoices still count above: expiring one must not
    // turn a previously ambiguous transfer into a payment for its neighbour.
    const [existing] = await tx
      .select({ id: cryptoDeposits.id })
      .from(cryptoDeposits)
      .where(eq(cryptoDeposits.matchedSessionId, session.id))
      .limit(1)
    if (existing) return null
    const claimed = await tx
      .update(cryptoDeposits)
      .set({ matchedSessionId: session.id })
      .where(and(eq(cryptoDeposits.id, depositId), isNull(cryptoDeposits.matchedSessionId)))
      .returning({ id: cryptoDeposits.id })
    if (!claimed.length) return null
    return {
      sessionId: session.id,
      orderId: session.orderId,
      txHash: current.txHash,
      amountCrypto: current.amountCrypto,
      kind: verdict,
    } as MatchResult
  })
}

/**
 * Deposits that are confirmed enough but still belong to no order.
 *
 * These are the ones a human has to resolve: a deposit that is a little short,
 * a deposit to an address that is no longer being used, or a deposit for an
 * order that was already closed.
 */
export async function listUnmatchedConfirmedDeposits(chains: ChainId[]) {
  if (!chains.length) return []
  const rows = await db
    .select()
    .from(cryptoDeposits)
    .where(and(inArray(cryptoDeposits.chain, chains), isNull(cryptoDeposits.matchedSessionId)))
  return rows.filter((row) => {
    const info = CHAINS[row.chain as ChainId]
    if (!info) return false
    return row.confirmations >= info.requiredConfirmations
  })
}

/** Deposits that are still waiting for enough confirmations. */
export async function listPendingDeposits(chain?: ChainId) {
  const where = chain ? eq(cryptoDeposits.chain, chain) : undefined
  return db
    .select()
    .from(cryptoDeposits)
    .where(where)
    .orderBy(sql`${cryptoDeposits.seenAt} desc`)
    .limit(200)
}

/**
 * Attach a deposit to a session by hand.
 *
 * The escape hatch for an ambiguous deposit: an operator reads the transaction
 * hash from the customer's message and assigns it to the right order.
 */
export async function assignDepositToSession(
  chain: ChainId,
  txHash: string,
  sessionId: string,
): Promise<boolean> {
  const [session] = await db
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.id, sessionId))
    .limit(1)
  if (!session || session.chain !== chain) return false
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`crypto-match:${chain}:${session.walletAddress}`}))`,
    )
    const [deposit] = await tx
      .select()
      .from(cryptoDeposits)
      .where(and(eq(cryptoDeposits.chain, chain), eq(cryptoDeposits.txHash, txHash)))
      .limit(1)
      .for("update")
    if (!deposit || deposit.walletAddress !== session.walletAddress) return false
    if (deposit.confirmations < CHAINS[chain].requiredConfirmations) return false
    if (deposit.matchedSessionId) return deposit.matchedSessionId === sessionId
    const [existing] = await tx
      .select({ id: cryptoDeposits.id })
      .from(cryptoDeposits)
      .where(eq(cryptoDeposits.matchedSessionId, sessionId))
      .limit(1)
    if (existing) return false
    await tx
      .update(cryptoDeposits)
      .set({ matchedSessionId: sessionId })
      .where(and(eq(cryptoDeposits.id, deposit.id), isNull(cryptoDeposits.matchedSessionId)))
    return true
  })
}

/** Deposits for a set of chains that have not been matched to an order yet. */
export async function listUnmatchedDeposits(chains: ChainId[]) {
  if (!chains.length) return []
  return db
    .select()
    .from(cryptoDeposits)
    .where(and(inArray(cryptoDeposits.chain, chains), isNull(cryptoDeposits.matchedSessionId)))
}

/**
 * Compare two decimal amounts for a chain without floating point.
 * Used by the watcher to decide whether a deposit is the expected one.
 */
export function amountsEqual(a: string, b: string, chain: ChainId): boolean {
  const unitsA = toUnits(a, CHAINS[chain].decimals)
  const unitsB = toUnits(b, CHAINS[chain].decimals)
  if (unitsA === null || unitsB === null) return false
  return unitsA === unitsB
}
