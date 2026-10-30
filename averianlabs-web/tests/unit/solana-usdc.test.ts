import { CHAINS, adapterFor, isChainId } from "@/lib/crypto/chains"
import {
  SOLANA_MAINNET_GENESIS,
  SOLANA_TOKEN_PROGRAM,
  SOLANA_USDC_MINT,
  isSolanaAddress,
  scanSolanaUsdc,
  solanaUsdcPaymentUri,
} from "@/lib/crypto/solana"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted(() => ({ SOLANA_RPC_URL: "https://rpc.example" as string | undefined }))
vi.mock("@/lib/env", () => ({ getServerEnv: () => env }))

const WALLET = "mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN"
const ACCOUNT = "BGocb4GEpbTFm8UFV2VsDSaBXHELPfAXrvd4vtt8QWrA"
const OTHER_ACCOUNT = "So11111111111111111111111111111111111111112"
const OTHER_OWNER = "11111111111111111111111111111111"
const SIGNATURE =
  "4ReKprwf3WdLHRrzp4ctPWNBsQDPL3VZz3zMmoZfcGJMJCHh5Vq937mPdyxhCbw54wNnA6hZ7KfNpQdpt13yY7A9"
type RpcRequest = { method: string; params: unknown[]; id: number }

function balance(amount: string, overrides: Record<string, unknown> = {}) {
  return {
    accountIndex: 1,
    mint: SOLANA_USDC_MINT,
    owner: WALLET,
    programId: SOLANA_TOKEN_PROGRAM,
    uiTokenAmount: { amount, decimals: 6, uiAmount: 999, uiAmountString: "999" },
    ...overrides,
  }
}

function transaction() {
  return {
    slot: 400_000_000,
    blockTime: 1_790_000_000,
    transaction: {
      signatures: [SIGNATURE],
      message: {
        accountKeys: [{ pubkey: WALLET }, { pubkey: ACCOUNT }, { pubkey: OTHER_ACCOUNT }],
      },
    },
    meta: {
      err: null as unknown,
      preTokenBalances: [balance("5000000")],
      postTokenBalances: [balance("105000001")],
    },
  }
}

function account(pubkey = ACCOUNT) {
  return {
    pubkey,
    account: {
      owner: SOLANA_TOKEN_PROGRAM,
      data: {
        parsed: {
          type: "account",
          info: { owner: WALLET, mint: SOLANA_USDC_MINT, tokenAmount: { decimals: 6 } },
        },
      },
    },
  }
}

function installRpc(overrides: Partial<Record<string, (request: RpcRequest) => unknown>> = {}) {
  const fallback: Record<string, (request: RpcRequest) => unknown> = {
    getGenesisHash: () => SOLANA_MAINNET_GENESIS,
    getTokenAccountsByOwner: () => ({ value: [account()] }),
    getSignaturesForAddress: () => [
      { signature: SIGNATURE, err: null, confirmationStatus: "finalized" },
    ],
    getTransaction: () => transaction(),
  }
  const mock = vi.fn(async (_input: unknown, init?: RequestInit) => {
    const request = JSON.parse(init?.body as string) as RpcRequest
    const result = await (overrides[request.method] ?? fallback[request.method])(request)
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }))
  })
  vi.stubGlobal("fetch", mock)
  return mock
}

beforeEach(() => {
  env.SOLANA_RPC_URL = "https://rpc.example"
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("USDC on Solana mainnet", () => {
  it("is registered as six-decimal USDC and requires finalized settlement", () => {
    expect(isChainId("usdc_solana")).toBe(true)
    expect(CHAINS.usdc_solana).toMatchObject({
      decimals: 6,
      symbol: "USDC",
      requiredConfirmations: 1,
      toleranceUnits: 0,
    })
    expect(adapterFor("usdc_solana").configured()).toBe(true)
    env.SOLANA_RPC_URL = undefined
    expect(adapterFor("usdc_solana").configured()).toBe(false)
  })

  it("validates the full public key rather than only its alphabet", () => {
    expect(isSolanaAddress(WALLET)).toBe(true)
    expect(isSolanaAddress("MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6")).toBe(true)
    expect(isSolanaAddress(OTHER_OWNER)).toBe(true)
    expect(isSolanaAddress("1".repeat(33))).toBe(false)
    expect(isSolanaAddress("z".repeat(44))).toBe(false)
    expect(isSolanaAddress("0".repeat(32))).toBe(false)
  })

  it("encodes a Solana Pay SPL transfer in USDC user units", () => {
    const uri = solanaUsdcPaymentUri(WALLET, "123.456789", "Averian Labs", "Order #123")
    const parsed = new URL(uri)
    expect(parsed.protocol).toBe("solana:")
    expect(parsed.pathname).toBe(WALLET)
    expect(parsed.searchParams.get("amount")).toBe("123.456789")
    expect(parsed.searchParams.get("spl-token")).toBe(SOLANA_USDC_MINT)
    expect(parsed.searchParams.get("label")).toBe("Averian Labs")
    expect(parsed.searchParams.get("message")).toBe("Order #123")
    expect(() => solanaUsdcPaymentUri(WALLET, "1.0000001")).toThrow(/amount/)
    expect(() => solanaUsdcPaymentUri(WALLET, "1e6")).toThrow(/amount/)
    expect(() => solanaUsdcPaymentUri("not-a-wallet", "1")).toThrow(/wallet/)
  })

  it("uses atomic amounts and the receiving wallet's net increase", async () => {
    const rpc = installRpc()
    expect(await scanSolanaUsdc(WALLET)).toEqual([
      {
        txHash: SIGNATURE,
        amount: "100.000001",
        confirmations: 1,
        seenAt: new Date(1_790_000_000_000),
      },
    ])
    const requests = rpc.mock.calls.map(([, init]) => JSON.parse(init?.body as string))
    expect(requests[1].params).toEqual([
      WALLET,
      { mint: SOLANA_USDC_MINT },
      { commitment: "finalized", encoding: "jsonParsed" },
    ])
    expect(requests[2].params[1].commitment).toBe("finalized")
    expect(requests[3].params[1]).toMatchObject({
      commitment: "finalized",
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 0,
    })
  })

  it("preserves precision beyond JavaScript's safe integer range", async () => {
    installRpc({
      getTransaction: () => {
        const tx = transaction()
        tx.meta.preTokenBalances = []
        tx.meta.postTokenBalances = [balance("9007199254740993")]
        return tx
      },
    })
    expect((await scanSolanaUsdc(WALLET))[0]?.amount).toBe("9007199254.740993")
  })

  it("handles a USDC token account created by the payment", async () => {
    installRpc({
      getTransaction: () => {
        const tx = transaction()
        tx.meta.preTokenBalances = []
        tx.meta.postTokenBalances = [balance("1")]
        return tx
      },
    })
    expect((await scanSolanaUsdc(WALLET))[0]?.amount).toBe("0.000001")
  })

  it("deduplicates a transaction touching multiple merchant token accounts", async () => {
    const rpc = installRpc({
      getTokenAccountsByOwner: () => ({ value: [account(), account(OTHER_ACCOUNT)] }),
    })
    expect(await scanSolanaUsdc(WALLET)).toHaveLength(1)
    expect(
      rpc.mock.calls.filter(
        ([, init]) => JSON.parse(init?.body as string).method === "getTransaction",
      ),
    ).toHaveLength(1)
  })

  it("caps transaction requests to the 25 newest signatures across all token accounts", async () => {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    const rpc = installRpc({
      getSignaturesForAddress: () =>
        Array.from({ length: 30 }, (_, index) => ({
          signature: `${SIGNATURE.slice(0, -1)}${alphabet[index]}`,
          slot: index + 1,
          err: null,
          confirmationStatus: "finalized",
        })),
      getTransaction: ({ params }) => ({
        ...transaction(),
        transaction: { ...transaction().transaction, signatures: [params[0]] },
      }),
    })
    expect(await scanSolanaUsdc(WALLET)).toHaveLength(25)
    const calls = rpc.mock.calls
      .map(([, init]) => JSON.parse(init?.body as string))
      .filter((request) => request.method === "getTransaction")
    expect(calls).toHaveLength(25)
    expect(calls[0].params[0]).toBe(`${SIGNATURE.slice(0, -1)}${alphabet[29]}`)
  })

  it("returns no deposits before the receiving wallet has a USDC account", async () => {
    const rpc = installRpc({ getTokenAccountsByOwner: () => ({ value: [] }) })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
    expect(rpc.mock.calls).toHaveLength(2)
  })

  it("does not scan without an explicitly configured RPC endpoint", async () => {
    env.SOLANA_RPC_URL = undefined
    const rpc = installRpc()
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it("does not count a transfer between the wallet's own token accounts", async () => {
    installRpc({
      getTransaction: () => {
        const tx = transaction()
        tx.meta.preTokenBalances = [balance("100000000"), balance("0", { accountIndex: 2 })]
        tx.meta.postTokenBalances = [balance("0"), balance("100000000", { accountIndex: 2 })]
        return tx
      },
    })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
  })

  it.each([
    ["a different token", { mint: OTHER_ACCOUNT }],
    ["a different receiving owner", { owner: OTHER_OWNER }],
  ])("ignores %s", async (_reason, change) => {
    installRpc({
      getTransaction: () => {
        const tx = transaction()
        tx.meta.preTokenBalances = [balance("0", change)]
        tx.meta.postTokenBalances = [balance("100000000", change)]
        return tx
      },
    })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
  })

  it("ignores native SOL transfers with no USDC balance increase", async () => {
    installRpc({
      getTransaction: () => ({
        ...transaction(),
        meta: {
          err: null,
          preTokenBalances: [],
          postTokenBalances: [],
          postBalances: [1000000000],
        },
      }),
    })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
  })

  it.each(["confirmed", "processed", null])("ignores %s signatures", async (confirmationStatus) => {
    const rpc = installRpc({
      getSignaturesForAddress: () => [{ signature: SIGNATURE, err: null, confirmationStatus }],
    })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
    expect(rpc.mock.calls).toHaveLength(3)
  })

  it("ignores failed transactions even when their metadata reports a credit", async () => {
    installRpc({
      getTransaction: () => ({ ...transaction(), meta: { ...transaction().meta, err: {} } }),
    })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
  })

  it.each([
    ["missing transaction", null],
    ["missing metadata", { ...transaction(), meta: null }],
    ["missing block time", { ...transaction(), blockTime: null }],
    ["mismatched signature", { ...transaction(), transaction: { signatures: ["different"] } }],
    [
      "invalid token precision",
      {
        ...transaction(),
        meta: {
          ...transaction().meta,
          postTokenBalances: [
            balance("100000000", { uiTokenAmount: { amount: "100000000", decimals: 9 } }),
          ],
        },
      },
    ],
    [
      "missing pre-balances",
      { ...transaction(), meta: { ...transaction().meta, preTokenBalances: undefined } },
    ],
    [
      "duplicate balance indices",
      {
        ...transaction(),
        meta: {
          ...transaction().meta,
          postTokenBalances: [balance("100000000"), balance("100000000")],
        },
      },
    ],
  ])("rejects %s", async (_reason, result) => {
    installRpc({ getTransaction: () => result })
    expect(await scanSolanaUsdc(WALLET)).toEqual([])
  })

  it("rejects devnet or any other cluster before discovering deposits", async () => {
    const rpc = installRpc({ getGenesisHash: () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" })
    await expect(scanSolanaUsdc(WALLET)).rejects.toThrow(/not connected to mainnet/)
    expect(rpc.mock.calls).toHaveLength(1)
  })

  it("refuses unexpected token account ownership", async () => {
    installRpc({
      getTokenAccountsByOwner: () => ({
        value: [{ ...account(), account: { owner: OTHER_OWNER } }],
      }),
    })
    await expect(scanSolanaUsdc(WALLET)).rejects.toThrow(/unexpected USDC token account/)
  })

  it("uses one timeout signal for the entire multi-request scan", async () => {
    const rpc = installRpc()
    await scanSolanaUsdc(WALLET, { timeoutMs: 5000 })
    const signals = rpc.mock.calls.map(([, init]) => init?.signal)
    expect(signals[0]).toBeInstanceOf(AbortSignal)
    expect(new Set(signals).size).toBe(1)
  })

  it("stops a stalled RPC within the caller's overall time budget", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            })
          }),
      ),
    )
    const keepAlive = setTimeout(() => undefined, 100)
    try {
      await expect(scanSolanaUsdc(WALLET, { timeoutMs: 10 })).rejects.toThrow(/timeout|aborted/i)
    } finally {
      clearTimeout(keepAlive)
    }
  })

  it("fails closed for RPC errors without logging credentials from the endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              error: { message: "private provider details" },
            }),
          ),
      ),
    )
    await expect(scanSolanaUsdc(WALLET)).rejects.toThrow(
      "Solana RPC getGenesisHash returned an invalid response",
    )
  })
})
