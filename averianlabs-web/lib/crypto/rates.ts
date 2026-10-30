import { CHAINS, type ChainId, isChainId } from "@/lib/crypto/chains"
import { getServerEnv } from "@/lib/env"

/**
 * EUR rates.
 *
 * The EUR total is the price. The crypto amount is derived from it and the
 * rate is locked when the invoice is issued, so the customer agrees to a euro
 * amount and the merchant carries the movement between issuing the invoice and
 * the transfer landing. The rate is stored on the session so the amount can be
 * re-derived exactly.
 */

const COINGECKO_IDS: Partial<Record<ChainId, string>> = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt_trc20: "tether",
  usdt_erc20: "tether",
  usdc_solana: "usd-coin",
}

export interface RateQuote {
  /** EUR per one whole unit of the asset. */
  eurPerUnit: number
  /** Where the rate came from — recorded for the audit trail. */
  source: "api" | "fallback"
}

/** Rates configured in the environment, e.g. `btc=60000,usdt_trc20=0.92`. */
export function fallbackRates(): Partial<Record<ChainId, number>> {
  const raw = getServerEnv().CRYPTO_FALLBACK_RATES
  const out: Partial<Record<ChainId, number>> = {}
  if (!raw) return out
  for (const pair of raw.split(",")) {
    const [chain, value] = pair.split("=").map((part) => part.trim())
    if (!chain || !value) continue
    if (!isChainId(chain)) continue
    const rate = Number(value)
    if (Number.isFinite(rate) && rate > 0) out[chain] = rate
  }
  return out
}

/**
 * Look up the current EUR price of one unit of the asset.
 *
 * The public price API is best-effort: when it is unreachable the configured
 * fallback is used, and when neither is available the caller must refuse to
 * issue an invoice rather than guess a rate.
 */
export async function getRate(chain: ChainId): Promise<RateQuote | null> {
  const fallback = fallbackRates()[chain]
  const apiUrl = getServerEnv().CRYPTO_RATE_API_URL
  const id = COINGECKO_IDS[chain]
  if (apiUrl && id) {
    try {
      const url = new URL(apiUrl)
      url.searchParams.set("ids", id)
      url.searchParams.set("vs_currencies", "eur")
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
      if (response.ok) {
        const data = (await response.json()) as Record<string, Record<string, number>>
        const rate = data[id]?.eur
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0)
          return { eurPerUnit: rate, source: "api" }
      }
    } catch {
      // Fall through to the configured fallback.
    }
  }
  if (fallback) return { eurPerUnit: fallback, source: "fallback" }
  return null
}

/**
 * Convert a euro amount into the asset amount, rounded down to the chain's
 * precision.
 */
export function toCryptoAmount(eurCents: number, eurPerUnit: number, chain: ChainId): string {
  const decimals = CHAINS[chain].decimals
  const eur = eurCents / 100
  const raw = eur / eurPerUnit
  const factor = 10 ** decimals
  const units = BigInt(Math.floor(raw * factor))
  const whole = units / BigInt(factor)
  const fraction = (units % BigInt(factor)).toString().padStart(decimals, "0").replace(/0+$/, "")
  return `${whole}${fraction ? `.${fraction}` : ""}`
}

/** The chains the store is willing to accept. */
export function enabledChains(): ChainId[] {
  const raw = getServerEnv().CRYPTO_ENABLED_CHAINS
  if (!raw) return []
  return raw
    .split(",")
    .map((chain) => chain.trim().toLowerCase())
    .filter((chain): chain is ChainId => isChainId(chain))
}

/** The receiving address for a chain. */
export function walletAddressFor(chain: ChainId): string | null {
  const env = getServerEnv()
  const map = env.CRYPTO_WALLET_ADDRESSES
  if (map) {
    for (const pair of map.split(",")) {
      const [key, address] = pair.split("=").map((part) => part.trim())
      if (key === chain && address) return address
    }
  }
  return env.CRYPTO_WALLET_ADDRESS ?? null
}
