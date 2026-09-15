import { getCachedShippingRates } from "@/lib/shipping/cached"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  country: z.string().min(2).max(2),
  postal: z.string().optional(),
  city: z.string().optional(),
  weightKg: z.number().positive().optional(),
})

export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const parsed = bodySchema.parse(raw)

    const rates = await getCachedShippingRates(
      {
        country: parsed.country.toUpperCase(),
        postal: parsed.postal,
        city: parsed.city,
      },
      parsed.weightKg,
    )

    return NextResponse.json({ rates })
  } catch (err) {
    console.error("[shipping] rate lookup failed", err)
    return NextResponse.json({ error: "Unable to fetch shipping rates." }, { status: 400 })
  }
}
