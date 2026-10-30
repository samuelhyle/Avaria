import { cryptoCheckoutSessions, cryptoDeposits } from "@/db/schema"
import { adminErrorStatus, requireAdmin } from "@/lib/admin/guard"
import { CHAINS, type ChainId, isChainId } from "@/lib/crypto/chains"
import { assignDepositToSession, listUnmatchedConfirmedDeposits } from "@/lib/crypto/matching"
import { enabledChains } from "@/lib/crypto/rates"
import { settleSessionFromDeposit } from "@/lib/crypto/watcher"
import { db } from "@/lib/db"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const Assign = z.object({
  chain: z.string().min(1).max(32),
  txHash: z.string().trim().min(8).max(128),
  sessionId: z.string().trim().min(1).max(64),
})

async function getDeposit(chain: ChainId, txHash: string) {
  const [row] = await db
    .select()
    .from(cryptoDeposits)
    .where(and(eq(cryptoDeposits.chain, chain), eq(cryptoDeposits.txHash, txHash)))
    .limit(1)
  return row ?? null
}

async function getSession(sessionId: string) {
  const [row] = await db
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.id, sessionId))
    .limit(1)
  return row ?? null
}

/**
 * Deposits that are confirmed but belong to no order.
 *
 * These are the ones a human has to resolve. The automatic matcher handles
 * the common case; this is the escape hatch for a deposit that is short, for
 * a stale address, or for an order that was closed before the money arrived.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch (error) {
    const status =
      error instanceof Error && error.name === "AdminAccessError"
        ? adminErrorStatus(error as never)
        : 401
    return NextResponse.json({ error: "Not permitted." }, { status })
  }
  const chains = enabledChains()
  const deposits = await listUnmatchedConfirmedDeposits(chains)
  return NextResponse.json(
    {
      deposits: deposits.map((deposit) => ({
        id: deposit.id,
        chain: deposit.chain,
        txHash: deposit.txHash,
        amountCrypto: deposit.amountCrypto,
        confirmations: deposit.confirmations,
        walletAddress: deposit.walletAddress,
        seenAt: deposit.seenAt,
        symbol: CHAINS[deposit.chain as ChainId]?.symbol ?? deposit.chain,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}

/** Attach a deposit to an invoice by hand. */
export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  try {
    await requireAdmin()
  } catch (error) {
    const status =
      error instanceof Error && error.name === "AdminAccessError"
        ? adminErrorStatus(error as never)
        : 401
    return NextResponse.json({ error: "Not permitted." }, { status })
  }
  const body = await request.json().catch(() => null)
  const parsed = Assign.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  const chain = parsed.data.chain.toLowerCase()
  if (!isChainId(chain)) return NextResponse.json({ error: "Unknown chain." }, { status: 400 })
  const assigned = await assignDepositToSession(chain, parsed.data.txHash, parsed.data.sessionId)
  if (!assigned)
    return NextResponse.json(
      { error: "That deposit or invoice could not be found." },
      { status: 404 },
    )
  // A deposit attached by hand settles the order the same way an automatic
  // match does: the order is marked paid and everyone is told.
  const deposit = await getDeposit(chain, parsed.data.txHash)
  const session = await getSession(parsed.data.sessionId)
  if (deposit && session) {
    await settleSessionFromDeposit(
      {
        sessionId: session.id,
        orderId: session.orderId,
        txHash: deposit.txHash,
        amountCrypto: deposit.amountCrypto,
        kind: "exact",
      },
      chain,
    )
  }
  return NextResponse.json({ ok: true })
}
