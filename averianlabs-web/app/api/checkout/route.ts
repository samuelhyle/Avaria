import { getCurrentMember } from "@/lib/community"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { logger } from "@/lib/logger"
import {
  OrderError,
  createAddress,
  createOrder,
  getOrderSkuQuantities,
  markOrderFailed,
  restoreStock,
} from "@/lib/orders"
import { stripe } from "@/lib/payments/stripe"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { getCachedShippingRates } from "@/lib/shipping/cached"
import { NextResponse } from "next/server"
import { z } from "zod"

const addressSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  postal: z.string().min(2).max(20),
  country: z.string().length(2),
})

const bodySchema = z.object({
  email: z.string().email().max(254),
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(64),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  shippingMethodId: z.string().min(1).max(64),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  vatId: z.string().max(32).optional(),
  paymentMethod: z.enum(["stripe", "coinbase"]).default("stripe"),
  locale: z.enum(locales).default("en"),
})

interface CoinbaseChargeResponse {
  data?: { hosted_url?: string }
}

async function createCoinbaseCharge(opts: {
  orderId: string
  orderNumber: string
  totalCents: number
  origin: string
  locale: string
}): Promise<string> {
  const env = getServerEnv()
  if (!env.COINBASE_COMMERCE_API_KEY) {
    throw new OrderError("Crypto payment is not available", "invalid")
  }

  const res = await fetch("https://api.commerce.coinbase.com/charges", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-CC-Api-Key": env.COINBASE_COMMERCE_API_KEY,
      "X-CC-Version": "2018-03-22",
    },
    body: JSON.stringify({
      name: `AverianLabs order ${opts.orderNumber}`,
      description: "Research peptides — for research use only",
      pricing_type: "fixed_price",
      local_price: { amount: (opts.totalCents / 100).toFixed(2), currency: "EUR" },
      metadata: { orderId: opts.orderId, orderNumber: opts.orderNumber },
      redirect_url: `${opts.origin}/${opts.locale}/checkout/confirm/${opts.orderId}`,
      cancel_url: `${opts.origin}/${opts.locale}/checkout/cart`,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new OrderError("Crypto payment provider unavailable", "invalid")
  }

  const data = (await res.json()) as CoinbaseChargeResponse
  const hostedUrl = data.data?.hosted_url
  if (!hostedUrl) throw new OrderError("Crypto payment provider unavailable", "invalid")
  return hostedUrl
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limit = await rateLimit(`checkout:ip:${ip}`, { limit: 20, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 })
  }
  const body = parsed.data

  // Prices and availability are authoritative server-side.
  const rates = await getCachedShippingRates({
    country: body.shippingAddress.country,
    postal: body.shippingAddress.postal,
    city: body.shippingAddress.city,
  })
  const shippingRate = rates.find((r) => r.id === body.shippingMethodId)
  if (!shippingRate) {
    return NextResponse.json({ error: "Unknown shipping method." }, { status: 400 })
  }

  const member = await getCurrentMember().catch(() => null)
  const env = getServerEnv()
  const origin = env.AUTH_URL ?? new URL(request.url).origin

  let orderId: string | null = null
  try {
    const shippingAddressId = await createAddress(member?.id ?? null, body.shippingAddress)
    const billingAddressId = body.billingAddress
      ? await createAddress(member?.id ?? null, body.billingAddress)
      : undefined

    const order = await createOrder({
      email: body.email,
      userId: member?.id,
      items: body.items,
      shippingCents: shippingRate.priceCents,
      shippingAddressId,
      billingAddressId,
    })
    orderId = order.id

    if (body.paymentMethod === "coinbase") {
      const hostedUrl = await createCoinbaseCharge({
        orderId: order.id,
        orderNumber: order.number,
        totalCents: order.totalCents,
        origin,
        locale: body.locale,
      })
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.number,
        redirectUrl: hostedUrl,
      })
    }

    const paymentIntent = await stripe().paymentIntents.create(
      {
        amount: order.totalCents,
        currency: order.currency.toLowerCase(),
        metadata: { orderId: order.id, orderNumber: order.number },
        receipt_email: order.email,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: order.id },
    )

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (err) {
    if (orderId) {
      // Release the reservation made by createOrder.
      await markOrderFailed(orderId).catch(() => {})
      await getOrderSkuQuantities(orderId)
        .then(restoreStock)
        .catch((restoreErr) => logger.error("[checkout] stock restore failed", restoreErr))
    }

    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    logger.error("[checkout] failed", err)
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 })
  }
}
