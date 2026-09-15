import { unstable_cache } from "next/cache"

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms"

export interface ViesResult {
  valid: boolean
  countryCode: string
  vatNumber: string
  name?: string
  address?: string
}

async function lookupVatId(vatId: string): Promise<ViesResult> {
  const cleaned = vatId.replace(/\s/g, "").toUpperCase()
  const match = cleaned.match(/^([A-Z]{2})(.+)$/)
  if (!match || !match[1] || !match[2]) {
    return { valid: false, countryCode: "", vatNumber: cleaned }
  }

  const countryCode = match[1]
  const vatNumber = match[2]

  try {
    const url = `${VIES_URL}/${countryCode}/vat/${vatNumber}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { valid: false, countryCode, vatNumber }
    }

    const data = (await res.json()) as Record<string, unknown>
    return {
      valid: Boolean(data.isValid),
      countryCode: String(data.countryCode ?? countryCode),
      vatNumber: String(data.vatNumber ?? vatNumber),
      name: data.name ? String(data.name) : undefined,
      address: data.address ? String(data.address) : undefined,
    }
  } catch {
    return { valid: false, countryCode, vatNumber }
  }
}

/**
 * VIES results are stable for a given VAT id — cache them for a day to avoid
 * hitting the EU service on every checkout address keystroke.
 */
export const validateVatId = unstable_cache(lookupVatId, ["vat:vies"], {
  revalidate: 86_400,
  tags: ["vat"],
})
