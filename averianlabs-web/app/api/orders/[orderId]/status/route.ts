import { getCurrentMember } from "@/lib/community"
import { getOrderById, releaseExpiredReservations } from "@/lib/orders"
import { hasOrderAccess } from "@/lib/orders/access"
import { stripe } from "@/lib/payments/stripe"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const token = new URL(request.url).searchParams.get("token") ?? undefined
  const [order, member] = await Promise.all([
    getOrderById(orderId),
    getCurrentMember().catch(() => null),
  ])
  if (!order || !(member?.id === order.userId || hasOrderAccess(order.id, token)))
    return NextResponse.json({ code: "not_found" }, { status: 404 })
  await releaseExpiredReservations()
  const current = await getOrderById(orderId)
  if (!current) return NextResponse.json({ code: "not_found" }, { status: 404 })
  let clientSecret: string | null = null
  if (
    current.status === "pending" &&
    current.stripePaymentIntentId &&
    process.env.STRIPE_SECRET_KEY
  ) {
    const intent = await stripe().paymentIntents.retrieve(current.stripePaymentIntentId)
    if (
      intent.amount === current.totalCents &&
      intent.currency.toUpperCase() === current.currency &&
      ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
        intent.status,
      )
    )
      clientSecret = intent.client_secret
  }
  return NextResponse.json(
    {
      status: current.status,
      totalCents: current.totalCents,
      subtotalCents: current.subtotalCents,
      shippingCents: current.shippingCents,
      vatCents: current.vatCents,
      clientSecret,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
