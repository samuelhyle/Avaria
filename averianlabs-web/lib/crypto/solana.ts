import type { ChainDeposit } from "@/lib/crypto/chains"
import { getServerEnv } from "@/lib/env"

/** Circle's native mainnet USDC mint, not a bridged token or a testnet mint. */
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export const SOLANA_MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
export const SOLANA_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const MAX_TOKEN_ACCOUNTS = 8
const RECENT_SIGNATURES = 25
const MAX_TRANSACTION_REQUESTS = 25
const RPC_CONCURRENCY = 4
const U64_MAX = (1n << 64n) - 1n

/** Validate a public key without accepting base64, truncated keys, or a secret. */
export function isSolanaAddress(value: string): boolean {
  if (value.length < 32 || value.length > 44) return false
  let decoded = 0n
  for (const char of value) {
    const digit = BASE58.indexOf(char)
    if (digit < 0) return false
    decoded = decoded * 58n + BigInt(digit)
  }
  const leadingZeros = value.length - value.replace(/^1+/, "").length
  const bytes = decoded === 0n ? 0 : Math.ceil(decoded.toString(16).length / 2)
  return leadingZeros + bytes === 32
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

async function mapBounded<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  let index = 0
  let failed = false
  let failure: unknown
  const results = new Array<R>(items.length)
  await Promise.all(
    Array.from({ length: Math.min(RPC_CONCURRENCY, items.length) }, async () => {
      while (!failed && index < items.length) {
        const current = index++
        try {
          // The loop bounds prove this element exists. Wait for active workers
          // before rejecting, so a failed scan leaves no RPC work behind it.
          results[current] = await work(items[current] as T)
        } catch (error) {
          if (!failed) failure = error
          failed = true
        }
      }
    }),
  )
  if (failed) throw failure
  return results
}

/**
 * Calculate the wallet's net increase, using integer token amounts exclusively.
 * Summing across all its token accounts prevents an internal transfer from
 * being mistaken for a customer payment. Incomplete metadata is rejected.
 */
function walletUsdcBalance(
  balances: unknown,
  accountKeys: unknown[],
  wallet: string,
): bigint | null {
  if (!Array.isArray(balances)) return null
  let units = 0n
  const indexes = new Set<number>()
  for (const raw of balances) {
    const balance = asRecord(raw)
    if (!balance || balance.mint !== SOLANA_USDC_MINT) continue
    const token = asRecord(balance.uiTokenAmount)
    const index = balance.accountIndex
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= accountKeys.length ||
      indexes.has(index) ||
      typeof balance.owner !== "string" ||
      !isSolanaAddress(balance.owner) ||
      (balance.programId !== undefined && balance.programId !== SOLANA_TOKEN_PROGRAM) ||
      !token ||
      token.decimals !== 6 ||
      typeof token.amount !== "string" ||
      !/^\d+$/.test(token.amount)
    )
      return null
    indexes.add(index)
    const amount = BigInt(token.amount)
    if (amount > U64_MAX) return null
    if (balance.owner === wallet) units += amount
  }
  return units
}

function parsedDeposit(raw: unknown, signature: string, wallet: string): ChainDeposit | null {
  const tx = asRecord(raw)
  const meta = asRecord(tx?.meta)
  const transaction = asRecord(tx?.transaction)
  const message = asRecord(transaction?.message)
  if (
    !tx ||
    !meta ||
    meta.err !== null ||
    !Array.isArray(transaction?.signatures) ||
    transaction.signatures[0] !== signature ||
    !Array.isArray(message?.accountKeys) ||
    !message.accountKeys.every((key: unknown) => {
      const pubkey = asRecord(key)?.pubkey
      return typeof pubkey === "string" && isSolanaAddress(pubkey)
    }) ||
    typeof tx.slot !== "number" ||
    !Number.isSafeInteger(tx.slot) ||
    tx.slot <= 0 ||
    typeof tx.blockTime !== "number" ||
    !Number.isSafeInteger(tx.blockTime) ||
    tx.blockTime <= 0
  )
    return null
  const before = walletUsdcBalance(meta.preTokenBalances, message.accountKeys, wallet)
  const after = walletUsdcBalance(meta.postTokenBalances, message.accountKeys, wallet)
  if (before === null || after === null || after <= before) return null
  const units = after - before
  const fraction = (units % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "")
  const seenAt = new Date(tx.blockTime * 1000)
  if (!Number.isFinite(seenAt.getTime())) return null
  return {
    txHash: signature,
    amount: `${units / 1_000_000n}${fraction ? `.${fraction}` : ""}`,
    // One means finalized, not merely one slot deep. Every RPC below requests
    // finalized commitment and unfinalized signatures are rejected explicitly.
    confirmations: 1,
    seenAt,
  }
}

/**
 * Read finalized native USDC credits on mainnet. The entire scan shares one
 * deadline, including discovery and every transaction request. This is a recent
 * deposit sweep (the 25 newest finalized signatures across at most eight token
 * accounts), not an archival indexer. Calls are capped and concurrency is four;
 * use a dedicated RPC endpoint for production traffic.
 */
export async function scanSolanaUsdc(
  wallet: string,
  options: { timeoutMs?: number } = {},
): Promise<ChainDeposit[]> {
  const endpoint = getServerEnv().SOLANA_RPC_URL
  if (!endpoint) return []
  if (!isSolanaAddress(wallet)) throw new Error("Invalid Solana receiving wallet address")
  if (new URL(endpoint).protocol !== "https:") throw new Error("Solana RPC must use HTTPS")
  const signal = AbortSignal.timeout(options.timeoutMs ?? 12_000)
  let requestId = 0
  async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
    signal.throwIfAborted()
    const id = ++requestId
    const response = await fetch(endpoint as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal,
    })
    if (!response.ok) throw new Error(`Solana RPC ${method} responded ${response.status}`)
    const body = asRecord(await response.json())
    signal.throwIfAborted()
    if (!body || body.jsonrpc !== "2.0" || body.id !== id || !("result" in body) || body.error)
      throw new Error(`Solana RPC ${method} returned an invalid response`)
    return body.result
  }

  if ((await rpc("getGenesisHash")) !== SOLANA_MAINNET_GENESIS)
    throw new Error("Solana RPC is not connected to mainnet")

  const accounts = asRecord(
    await rpc("getTokenAccountsByOwner", [
      wallet,
      { mint: SOLANA_USDC_MINT },
      { commitment: "finalized", encoding: "jsonParsed" },
    ]),
  )
  if (!Array.isArray(accounts?.value)) throw new Error("Solana RPC returned invalid token accounts")
  const tokenAccounts = accounts.value.map((raw: unknown) => {
    const row = asRecord(raw)
    const account = asRecord(row?.account)
    const data = asRecord(account?.data)
    const parsed = asRecord(data?.parsed)
    const info = asRecord(parsed?.info)
    const tokenAmount = asRecord(info?.tokenAmount)
    if (
      typeof row?.pubkey !== "string" ||
      !isSolanaAddress(row.pubkey) ||
      account?.owner !== SOLANA_TOKEN_PROGRAM ||
      parsed?.type !== "account" ||
      info?.owner !== wallet ||
      info.mint !== SOLANA_USDC_MINT ||
      tokenAmount?.decimals !== 6
    )
      throw new Error("Solana RPC returned an unexpected USDC token account")
    return row.pubkey
  })
  if (tokenAccounts.length > MAX_TOKEN_ACCOUNTS)
    throw new Error("Solana receiving wallet has too many USDC token accounts to scan safely")
  const pages = await mapBounded([...new Set(tokenAccounts)], async (account) => {
    const signatures = await rpc("getSignaturesForAddress", [
      account,
      { commitment: "finalized", limit: RECENT_SIGNATURES },
    ])
    if (!Array.isArray(signatures)) throw new Error("Solana RPC returned invalid signatures")
    return signatures.flatMap((raw: unknown) => {
      const entry = asRecord(raw)
      return entry?.err === null &&
        entry.confirmationStatus === "finalized" &&
        typeof entry.signature === "string" &&
        /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(entry.signature)
        ? [{ signature: entry.signature, slot: typeof entry.slot === "number" ? entry.slot : 0 }]
        : []
    })
  })
  const signatures = [
    ...new Set(
      pages
        .flat()
        .sort((a, b) => b.slot - a.slot)
        .map((entry) => entry.signature),
    ),
  ].slice(0, MAX_TRANSACTION_REQUESTS)
  const deposits = await mapBounded(signatures, async (signature) =>
    parsedDeposit(
      await rpc("getTransaction", [
        signature,
        { commitment: "finalized", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]),
      signature,
      wallet,
    ),
  )
  return deposits.filter((deposit): deposit is ChainDeposit => deposit !== null)
}

export function solanaUsdcPaymentUri(
  address: string,
  amount: string,
  label?: string,
  message?: string,
): string {
  if (!isSolanaAddress(address)) throw new Error("Invalid Solana receiving wallet address")
  if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error("Invalid USDC payment amount")
  const params = new URLSearchParams({ amount, "spl-token": SOLANA_USDC_MINT })
  if (label) params.set("label", label)
  if (message) params.set("message", message)
  return `solana:${address}?${params.toString()}`
}
