export interface ShippingRate {
  id: string
  carrier: string
  service: string
  eta: string
  priceCents: number
}

export interface ShippingAddress {
  country: string
  postal?: string
  city?: string
}

import { getServerEnv } from "@/lib/env"

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v2"

async function getSendcloudRates(
  address: ShippingAddress,
  weightKg: number,
): Promise<ShippingRate[]> {
  const env = getServerEnv()
  const pubKey = env.SENDCLOUD_PUBLIC_KEY
  const secKey = env.SENDCLOUD_SECRET_KEY
  if (!pubKey || !secKey) return []

  try {
    const params = new URLSearchParams({
      from_country: "FI",
      to_country: address.country,
      weight: String(weightKg),
    })
    const res = await fetch(`${SENDCLOUD_API}/shipping_methods?${params}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${pubKey}:${secKey}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []

    const data = await res.json()
    const methods = (data.shipping_methods ?? []) as Array<Record<string, unknown>>

    return methods.slice(0, 5).map((m) => {
      const transitDays = m.transit_days as Record<string, number> | undefined
      const price = m.price as Record<string, number> | undefined
      return {
        id: String(m.id ?? ""),
        carrier: String(m.carrier ?? "Unknown"),
        service: String(m.name ?? "Standard"),
        eta: transitDays?.max ? `${transitDays.max} days` : "3–5 days",
        priceCents: Math.round((price?.total ?? 0) * 100),
      }
    })
  } catch {
    return []
  }
}

function getFallbackRates(address: ShippingAddress): ShippingRate[] {
  const isDomestic = address.country === "FI"
  const isEU = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ].includes(address.country)

  if (isDomestic) {
    return [
      {
        id: "posti-express",
        carrier: "Posti",
        service: "Express",
        eta: "1–2 days",
        priceCents: 990,
      },
      {
        id: "posti-standard",
        carrier: "Posti",
        service: "Standard",
        eta: "2–4 days",
        priceCents: 590,
      },
    ]
  }

  if (isEU) {
    return [
      { id: "dhl-express", carrier: "DHL", service: "Express", eta: "1–3 days", priceCents: 1490 },
      { id: "dpd-classic", carrier: "DPD", service: "Classic", eta: "3–5 days", priceCents: 690 },
      { id: "gls-standard", carrier: "GLS", service: "Standard", eta: "4–7 days", priceCents: 490 },
    ]
  }

  return [
    {
      id: "dhl-worldwide",
      carrier: "DHL",
      service: "Worldwide Express",
      eta: "3–5 days",
      priceCents: 2490,
    },
  ]
}

export async function getShippingRates(
  address: ShippingAddress,
  weightKg = 0.5,
): Promise<ShippingRate[]> {
  const sendcloudRates = await getSendcloudRates(address, weightKg)
  if (sendcloudRates.length > 0) return sendcloudRates

  return getFallbackRates(address)
}

export function getShippingRateById(rates: ShippingRate[], id: string): ShippingRate | undefined {
  return rates.find((r) => r.id === id)
}

/**
 * Deterministic fallback rates — safe to import from client components so the
 * UI can show the same methods the server will price when Sendcloud is offline.
 */
export const fallbackShippingRates = getFallbackRates
