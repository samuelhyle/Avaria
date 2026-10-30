import { getRate, toCryptoAmount, walletAddressFor } from "@/lib/crypto/rates"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { config } = vi.hoisted(() => ({ config: {} as Record<string, string | undefined> }))
vi.mock("@/lib/env", () => ({ getServerEnv: () => config }))

beforeEach(() => {
  for (const key of Object.keys(config)) delete config[key]
  config.CRYPTO_RATE_API_URL = "https://api.coingecko.com/api/v3/simple/price"
})
afterEach(() => vi.unstubAllGlobals())

describe("Solana USDC pricing", () => {
  it("requests native USDC's EUR price rather than SOL or a USD quote", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ "usd-coin": { eur: 0.9 } }))
    vi.stubGlobal("fetch", request)
    expect(await getRate("usdc_solana")).toEqual({ eurPerUnit: 0.9, source: "api" })
    const url = new URL(request.mock.calls[0]?.[0])
    expect(url.searchParams.get("ids")).toBe("usd-coin")
    expect(url.searchParams.get("vs_currencies")).toBe("eur")
    expect(toCryptoAmount(10000, 0.9, "usdc_solana")).toBe("111.111111")
  })

  it("does not assume one USDC equals one EUR if the rate API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })))
    expect(await getRate("usdc_solana")).toBeNull()
  })

  it("uses an explicitly configured EUR fallback on an outage", async () => {
    config.CRYPTO_FALLBACK_RATES = "usdc_solana=0.89"
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")))
    expect(await getRate("usdc_solana")).toEqual({ eurPerUnit: 0.89, source: "fallback" })
  })

  it("rejects missing or invalid EUR prices", async () => {
    for (const data of [{ "usd-coin": { usd: 1 } }, { "usd-coin": { eur: 0 } }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)))
      expect(await getRate("usdc_solana")).toBeNull()
    }
  })

  it("selects the receiving wallet using the usdc_solana map key", () => {
    config.CRYPTO_WALLET_ADDRESSES = "usdc_solana=MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6"
    expect(walletAddressFor("usdc_solana")).toBe("MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6")
    expect(walletAddressFor("btc")).toBeNull()
  })
})
