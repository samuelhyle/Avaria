import { CHAINS, type ChainId } from "@/lib/crypto/chains"
import { enabledChains, walletAddressFor } from "@/lib/crypto/rates"
import { getServerEnv } from "@/lib/env"
import { NextResponse } from "next/server"

/**
 * The chains the store accepts, for the checkout UI.
 *
 * Only the public facts are returned: the identifier, the display name and
 * the ticker. The receiving address is not exposed here — it is given to the
 * customer in the Telegram invoice, where it is paired with the exact amount
 * they must send.
 */
export async function GET() {
  const env = getServerEnv()
  const enabled = enabledChains()
  const chains = enabled
    .filter((chain) => {
      const address = walletAddressFor(chain)
      return Boolean(address)
    })
    .map((chain: ChainId) => ({
      id: chain,
      label: CHAINS[chain].label,
      symbol: CHAINS[chain].symbol,
    }))
  return NextResponse.json(
    {
      chains,
      available: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  )
}
