import { cryptoCheckoutSessions, cryptoDeposits, orders } from "@/db/schema"
import { CHAINS, type ChainId, adapterFor } from "@/lib/crypto/chains"
import { type MatchResult, matchDepositToSession, recordDeposit } from "@/lib/crypto/matching"
import { enabledChains, walletAddressFor } from "@/lib/crypto/rates"
import {
  type SessionWithOrder,
  listExpiredSessions,
  listOpenSessions,
  markSessionPaid,
} from "@/lib/crypto/session"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { markOrderFailed, markOrderPaid } from "@/lib/orders/service"
import {
  type TelegramLocale,
  copyFor,
  renderExpired,
  renderOpsExpired,
  renderOpsPaid,
  renderPaid,
  renderPaymentReview,
} from "@/lib/telegram/messages"
import { enqueueTelegramMessage } from "@/lib/telegram/outbox"
import { and, eq, sql } from "drizzle-orm"

/**
 * The crypto watcher.
 *
 * Polls each configured chain for deposits to the receiving address, stores
 * every deposit it sees, matches the deposits to open invoices, and marks the
 * matching orders as paid. The buyer is told, the team is told, and the
 * receipt email is queued by the same code path the card payments use.
 *
 * It runs from `/api/cron/crypto`, so a scheduler polls it every minute or
 * two. Nothing here throws on a missing configuration: an unavailable chain is
 * reported, not fatal.
 */

export interface WatcherReport {
  chains: Array<{
    chain: ChainId
    configured: boolean
    scanned: number
    newDeposits: number
    matched: number
    error?: string
  }>
  matched: MatchResult[]
  expired: number
  /** True when the run stopped because it ran out of time. */
  truncated: boolean
}

/**
 * The time budget for one sweep.
 *
 * Netlify kills a scheduled function after 30 seconds, and the host that
 * serves the site is not the only thing that calls this. The sweep stops
 * between chains rather than being killed mid-scan, and the remaining chains
 * are picked up by the next run.
 */
export const DEFAULT_WATCHER_BUDGET_MS = 20_000

export async function runCryptoWatcher(
  options: { budgetMs?: number; now?: () => number } = {},
): Promise<WatcherReport> {
  const report: WatcherReport = { chains: [], matched: [], expired: 0, truncated: false }
  const chains = enabledChains()
  const budgetMs = options.budgetMs ?? DEFAULT_WATCHER_BUDGET_MS
  const clock = options.now ?? (() => Date.now())
  const startedAt = clock()

  for (const chain of chains) {
    // Leave room for the matching, the settlement and the notification
    // enqueueing that follow the scan.
    if (clock() - startedAt > budgetMs - 5_000) {
      report.truncated = true
      break
    }
    const adapter = adapterFor(chain)
    const address = walletAddressFor(chain)
    const entry: WatcherReport["chains"][number] = {
      chain,
      configured: adapter.configured() && Boolean(address),
      scanned: 0,
      newDeposits: 0,
      matched: 0,
    }
    report.chains.push(entry)
    if (!address) {
      entry.error = "no_receiving_address"
      continue
    }
    if (!adapter.configured()) {
      entry.error = "explorer_not_configured"
      continue
    }
    try {
      const deposits = await adapter.scan(address)
      entry.scanned = deposits.length
      for (const deposit of deposits) {
        const isNew = await recordDeposit({
          chain,
          txHash: deposit.txHash,
          walletAddress: address,
          amountCrypto: deposit.amount,
          confirmations: deposit.confirmations,
          seenAt: deposit.seenAt,
        })
        if (isNew) entry.newDeposits++
        // Every scanned deposit is re-examined, not only the new ones: a
        // deposit seen in the mempool gains confirmations later, and it is only
        // then that it may be matched.
        const [stored] = await db
          .select({ id: cryptoDeposits.id })
          .from(cryptoDeposits)
          .where(and(eq(cryptoDeposits.chain, chain), eq(cryptoDeposits.txHash, deposit.txHash)))
          .limit(1)
        if (!stored) continue
        const match = await matchDepositToSession(stored.id)
        if (match) {
          entry.matched++
          report.matched.push(match)
          await settleMatchedOrder(match, chain)
        }
      }
    } catch (error) {
      entry.error = error instanceof Error ? error.message.slice(0, 120) : "scan_failed"
      logger.error(`[crypto] ${chain} scan failed`, error)
    }
  }

  report.expired = await expireStaleSessions()
  return report
}

/**
 * Check one invoice right now.
 *
 * This is what the customer's "I have paid" button runs. It scans the chain
 * for the session's address, records what it finds and attempts to match,
 * exactly as the cron sweep does — but for one session and with a short
 * budget, because it runs inside a Telegram webhook.
 *
 * Returns the outcome so the bot can tell the customer what happened.
 */
export async function checkSessionPayment(
  sessionId: string,
  options: { timeoutMs?: number } = {},
): Promise<
  | { outcome: "paid"; txHash: string; amountCrypto: string }
  | { outcome: "pending"; reason: "unconfirmed" | "short" | "not_found" | "unavailable" }
> {
  const [session] = await db
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.id, sessionId))
    .limit(1)
  if (!session) return { outcome: "pending", reason: "not_found" }
  const chain = session.chain as ChainId
  const adapter = adapterFor(chain)
  if (!adapter.configured()) return { outcome: "pending", reason: "unavailable" }

  let deposits: Awaited<ReturnType<typeof adapter.scan>>
  try {
    deposits = await adapter.scan(session.walletAddress, options)
  } catch (error) {
    logger.error("[crypto] on-demand scan failed", error)
    return { outcome: "pending", reason: "unavailable" }
  }

  let sawUnconfirmed = false
  let sawShort = false
  for (const deposit of deposits) {
    await recordDeposit({
      chain,
      txHash: deposit.txHash,
      walletAddress: session.walletAddress,
      amountCrypto: deposit.amount,
      confirmations: deposit.confirmations,
      seenAt: deposit.seenAt,
    })
    const [stored] = await db
      .select({ id: cryptoDeposits.id })
      .from(cryptoDeposits)
      .where(and(eq(cryptoDeposits.chain, chain), eq(cryptoDeposits.txHash, deposit.txHash)))
      .limit(1)
    if (!stored) continue
    if (deposit.confirmations < CHAINS[chain].requiredConfirmations) {
      sawUnconfirmed = true
      continue
    }
    const match = await matchDepositToSession(stored.id)
    if (match) {
      await settleMatchedOrder(match, chain)
      if (match.sessionId !== sessionId) continue
      return {
        outcome: "paid",
        txHash: match.txHash,
        amountCrypto: match.amountCrypto,
      }
    }
    sawShort = true
  }
  if (sawUnconfirmed) return { outcome: "pending", reason: "unconfirmed" }
  if (sawShort) return { outcome: "pending", reason: "short" }
  return { outcome: "pending", reason: "not_found" }
}

/**
 * Settle an order that has just been matched to a deposit.
 *
 * Exported so that a deposit attached by hand — through the admin console —
 * goes through exactly the same path as one the watcher matched: the order is
 * marked paid, the receipt email is queued, and the buyer and the team are
 * both told.
 */
export async function settleSessionFromDeposit(match: MatchResult, chain: ChainId): Promise<void> {
  await settleMatchedOrder(match, chain)
}

/**
 * Mark a matched order as paid and tell everyone.
 *
 * `markOrderPaid` re-validates the batches and tries to reacquire the
 * inventory; when it cannot, the order lands in `payment_review` and the money
 * is never silently dropped. The receipt email is queued by that same call.
 */
async function settleMatchedOrder(match: MatchResult, chain: ChainId): Promise<void> {
  const [session] = await db
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.id, match.sessionId))
    .limit(1)
  if (!session) return
  const [order] = await db.select().from(orders).where(eq(orders.id, match.orderId)).limit(1)
  if (!order) return
  const info = CHAINS[chain]
  const locale = (order.locale === "fi" ? "fi" : "en") as TelegramLocale

  await markOrderPaid(match.orderId, match.txHash, "crypto")
  await markSessionPaid(match.sessionId)
  const [settled] = await db.select().from(orders).where(eq(orders.id, match.orderId)).limit(1)
  const review = settled?.status === "payment_review"
  const testOnly = (
    await db.execute<{ test_only: boolean }>(
      sql`select exists (select 1 from order_items where order_id = ${match.orderId} and sku_snapshot = 'CHECKOUT-TEST-150') as test_only`,
    )
  )[0]?.test_only
  const noShipment = review || testOnly

  // Tell the buyer.
  if (session.telegramChatId)
    await enqueueTelegramMessage(
      {
        chatId: session.telegramChatId,
        text: review
          ? renderPaymentReview(order.number, locale)
          : renderPaid(
              {
                orderNumber: order.number,
                amountCrypto: match.amountCrypto,
                chainSymbol: info.symbol,
              },
              locale,
            ),
        replacesMessageId: session.botMessageId,
      },
      `crypto-paid-buyer:${match.sessionId}`,
    )

  // Tell the team.
  const opsChatId = getServerEnv().TELEGRAM_OPS_CHAT_ID
  if (opsChatId)
    await enqueueTelegramMessage(
      {
        chatId: opsChatId,
        text: noShipment
          ? `${review ? "Payment received — manual review required" : "Checkout test paid — no goods or shipment"}: ${order.number}. Do not dispatch.`
          : renderOpsPaid(
              {
                orderNumber: order.number,
                amountCrypto: match.amountCrypto,
                chainSymbol: info.symbol,
                totalCents: order.totalCents,
              },
              locale,
            ),
      },
      `crypto-paid-ops:${match.sessionId}`,
    )
}

/** Close invoices whose window has passed without a payment. */
export async function expireStaleSessions(): Promise<number> {
  const expired = await listExpiredSessions()
  for (const { session, order } of expired) {
    await markOrderFailed(order.id, "expired")
    await db
      .update(cryptoCheckoutSessions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(cryptoCheckoutSessions.id, session.id))
    const locale: TelegramLocale = "en"
    if (session.telegramChatId)
      await enqueueTelegramMessage(
        {
          chatId: session.telegramChatId,
          text: renderExpired(order.number, locale),
          replacesMessageId: session.botMessageId,
        },
        `crypto-expired-buyer:${session.id}`,
      )
    const opsChatId = getServerEnv().TELEGRAM_OPS_CHAT_ID
    if (opsChatId)
      await enqueueTelegramMessage(
        { chatId: opsChatId, text: renderOpsExpired(order.number, locale) },
        `crypto-expired-ops:${session.id}`,
      )
  }
  return expired.length
}

/** Sessions that are still waiting for a payment, for the admin console. */
export async function listAwaitingCryptoOrders() {
  return listOpenSessions()
}
