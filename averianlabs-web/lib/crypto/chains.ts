/**
 * Chain adapters.
 *
 * One interface per supported asset so the checkout, the watcher and the
 * matcher do not care which chain they are dealing with. Every adapter
 * degrades gracefully: when the explorer API is unreachable or not configured,
 * `scan` returns an empty list and the cron reports the chain as unavailable
 * rather than failing the whole run.
 */

import { scanSolanaUsdc, solanaUsdcPaymentUri } from "@/lib/crypto/solana"
import { getServerEnv } from "@/lib/env"

export const CHAIN_IDS = ["btc", "eth", "usdt_trc20", "usdt_erc20", "usdc_solana"] as const
export type ChainId = (typeof CHAIN_IDS)[number]

export interface ChainInfo {
  id: ChainId
  label: string
  /** Symbol shown to the customer. */
  symbol: string
  /** Decimal places the asset supports. */
  decimals: number
  /** Confirmations before a deposit is considered final. */
  requiredConfirmations: number
  /**
   * Absolute tolerance when matching a deposit amount, expressed in the
   * asset's smallest unit. Network fees are deducted from the transferred
   * amount on some chains, so an exact match is not always possible.
   */
  toleranceUnits: number
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  btc: {
    id: "btc",
    label: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    requiredConfirmations: 2,
    // The Bitcoin network fee is deducted from the transferred amount, so a
    // payment arrives slightly short. This is a fee estimate, and it is
    // additionally capped as a share of the order — see `depositSatisfiesSession`.
    toleranceUnits: 5_000,
  },
  eth: {
    id: "eth",
    label: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    requiredConfirmations: 12,
    toleranceUnits: 0,
  },
  usdt_trc20: {
    id: "usdt_trc20",
    label: "Tether (TRC-20)",
    symbol: "USDT",
    decimals: 6,
    requiredConfirmations: 19,
    // TRON deducts the bandwidth fee from the transferred amount.
    toleranceUnits: 3_000_000,
  },
  usdt_erc20: {
    id: "usdt_erc20",
    label: "Tether (ERC-20)",
    symbol: "USDT",
    decimals: 6,
    requiredConfirmations: 12,
    toleranceUnits: 0,
  },
  usdc_solana: {
    id: "usdc_solana",
    label: "USD Coin (Solana)",
    symbol: "USDC",
    decimals: 6,
    // The adapter only returns finalized transactions. One represents that
    // finality decision, not one Solana slot or an unfinalized confirmation.
    requiredConfirmations: 1,
    toleranceUnits: 0,
  },
}

/**
 * The largest share of an order that a shortfall may cover.
 *
 * The chain tolerance is a fee estimate, but a fee estimate is unbounded
 * relative to a small order: on Bitcoin a 5 000 satoshi fee is a rounding
 * error on a €2 000 order and a quarter of a €50 one. A deposit that is short
 * by more than this share is underpayment, not a fee, and goes to a human.
 */
export const MAX_SHORTFALL_RATIO = 0.05

export function isChainId(value: string): value is ChainId {
  return (CHAIN_IDS as readonly string[]).includes(value)
}

export interface ChainDeposit {
  txHash: string
  /** Amount received, as a decimal string. */
  amount: string
  confirmations: number
  seenAt: Date
}

export interface ChainAdapter {
  info: ChainInfo
  /** True when the adapter has the configuration it needs. */
  configured(): boolean
  /**
   * Recent deposits to an address.
   *
   * `options.timeoutMs` bounds the explorer call. The on-demand check behind
   * the customer's "I have paid" button runs inside a Telegram webhook, so it
   * has a much shorter budget than the cron sweep.
   */
  scan(address: string, options?: { timeoutMs?: number }): Promise<ChainDeposit[]>
  /** A payment URI the customer's wallet can open. */
  paymentUri(address: string, amount: string, label?: string, message?: string): string
}

const SCAN_TIMEOUT = 12_000

async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = SCAN_TIMEOUT,
) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`explorer responded ${response.status}`)
  return response.json()
}

/**
 * Confirmations for a transaction included in `blockHeight`.
 *
 * A transaction that is not in a block yet has no confirmations at all — it
 * can still be dropped or replaced, and it must never be treated as a
 * settled payment.
 */
export function confirmationsSince(
  blockHeight: number | null | undefined,
  tipHeight: number | null | undefined,
): number {
  if (!blockHeight || !tipHeight) return 0
  if (tipHeight < blockHeight) return 0
  return tipHeight - blockHeight + 1
}

/** Bitcoin — mempool.space, no API key required. */
export const btcAdapter: ChainAdapter = {
  info: CHAINS.btc,
  configured: () => true,
  async scan(address, options) {
    const timeout = options?.timeoutMs ?? SCAN_TIMEOUT
    // The chain tip is needed to turn a block height into a confirmation
    // count. The address endpoint only reports whether a transaction was
    // mined, not how deeply it is buried.
    const [data, tip] = await Promise.all([
      getJson(`https://mempool.space/api/address/${address}/txs`, {}, timeout),
      getJson("https://mempool.space/api/blocks/tip/height", {}, timeout).catch(() => null),
    ])
    const tipHeight = typeof tip === "number" ? tip : null
    const list = Array.isArray(data) ? data : []
    return list.map((tx: Record<string, unknown>) => {
      const status = (tx.status ?? {}) as { block_height?: number; block_time?: number }
      const vout = Array.isArray(tx.vout) ? (tx.vout as Array<Record<string, unknown>>) : []
      let sats = 0
      for (const output of vout) {
        if (output.scriptpubkey_address === address) sats += Number(output.value ?? 0)
      }
      return {
        txHash: String(tx.txid ?? ""),
        amount: (sats / 1e8).toFixed(8),
        confirmations: confirmationsSince(status.block_height, tipHeight),
        seenAt: new Date((status.block_time ?? 0) * 1000),
      }
    })
  },
  paymentUri(address, amount, label, message) {
    const params = new URLSearchParams({ amount })
    if (label) params.set("label", label)
    if (message) params.set("message", message)
    return `bitcoin:${address}?${params.toString()}`
  },
}

/** Ethereum and ERC-20 — an Etherscan-compatible explorer. */
function erc20Adapter(chain: ChainId): ChainAdapter {
  return {
    info: CHAINS[chain],
    configured: () => Boolean(getServerEnv().ETHERSCAN_API_KEY),
    async scan(address, options) {
      const key = getServerEnv().ETHERSCAN_API_KEY
      if (!key) return []
      const data = await getJson(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=50&apikey=${key}`,
        {},
        options?.timeoutMs ?? SCAN_TIMEOUT,
      )
      const list = Array.isArray(data?.result) ? data.result : []
      return list.map((tx: Record<string, unknown>) => ({
        txHash: String(tx.hash ?? ""),
        // The ERC-20 amount is decoded from the logs; the raw tx value is only
        // correct for a native transfer. Explorers report the value, which is
        // what a plain native transfer needs.
        amount: String(tx.value ?? "0"),
        confirmations: Number(tx.confirmations ?? 0),
        seenAt: new Date(Number(tx.timeStamp ?? 0) * 1000),
      }))
    },
    paymentUri(address, amount, label, message) {
      const params = new URLSearchParams({ value: amount })
      if (label) params.set("label", label)
      if (message) params.set("message", message)
      return `ethereum:${address}@${CHAINS[chain].decimals}?${params.toString()}`
    },
  }
}

export const ethAdapter = erc20Adapter("eth")
export const usdtErc20Adapter = erc20Adapter("usdt_erc20")

/** Tether on TRON — TronGrid. */
export const usdtTrc20Adapter: ChainAdapter = {
  info: CHAINS.usdt_trc20,
  configured: () => Boolean(getServerEnv().TRONGRID_API_KEY),
  async scan(address, options) {
    const key = getServerEnv().TRONGRID_API_KEY
    if (!key) return []
    const headers = { "TRON-PRO-API-KEY": key }
    const timeout = options?.timeoutMs ?? SCAN_TIMEOUT
    const [data, tip] = await Promise.all([
      getJson(
        `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
        headers,
        timeout,
      ),
      getJson("https://api.trongrid.io/wallet/getnowblock", headers, timeout).catch(() => null),
    ])
    const tipHeight =
      tip && typeof tip.block_header?.raw_data?.number === "number"
        ? tip.block_header.raw_data.number
        : null
    const list = Array.isArray(data?.data) ? data.data : []
    return list.map((tx: Record<string, unknown>) => ({
      txHash: String(tx.transaction_id ?? ""),
      amount: String(tx.value ?? "0"),
      confirmations: confirmationsSince(Number(tx.block_number ?? 0) || null, tipHeight),
      seenAt: new Date(Number(tx.block_timestamp ?? 0)),
    }))
  },
  paymentUri(address, amount, label, message) {
    const params = new URLSearchParams({ amount })
    if (label) params.set("label", label)
    if (message) params.set("message", message)
    return `tron:${address}?${params.toString()}`
  },
}

export const usdcSolanaAdapter: ChainAdapter = {
  info: CHAINS.usdc_solana,
  configured: () => Boolean(getServerEnv().SOLANA_RPC_URL),
  scan: scanSolanaUsdc,
  paymentUri: solanaUsdcPaymentUri,
}

export const CHAIN_ADAPTERS: Record<ChainId, ChainAdapter> = {
  btc: btcAdapter,
  eth: ethAdapter,
  usdt_trc20: usdtTrc20Adapter,
  usdt_erc20: usdtErc20Adapter,
  usdc_solana: usdcSolanaAdapter,
}

export function adapterFor(chain: ChainId): ChainAdapter {
  return CHAIN_ADAPTERS[chain]
}

/**
 * Parse a decimal string into an integer number of the asset's smallest unit.
 * Returns null when the value is not a valid decimal for the chain.
 */
export function toUnits(amount: string, decimals: number): bigint | null {
  const trimmed = amount.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole = "0", fraction = ""] = trimmed.split(".")
  if (fraction.length > decimals) return null
  const padded = fraction.padEnd(decimals, "0")
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0")
}

/** Render an integer number of the smallest unit as a decimal string. */
export function fromUnits(units: bigint, decimals: number): string {
  const negative = units < 0n
  const value = negative ? -units : units
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = (value % divisor).toString().padStart(decimals, "0").replace(/0+$/, "")
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`
}
