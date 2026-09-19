import { orderItems, orders, productTranslations, products, shipments, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { reviewRequestHtml, sendEmail } from "@/lib/email"
import type { Locale } from "@/lib/i18n/config"
import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { and, eq, isNull, lt } from "drizzle-orm"
import { getTranslations } from "next-intl/server"
import { NextResponse } from "next/server"

const REVIEW_DELAY_DAYS = 5

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - REVIEW_DELAY_DAYS * 24 * 60 * 60 * 1000)

  const pendingOrders = await db
    .select({
      id: orders.id,
      number: orders.number,
      email: orders.email,
      locale: orders.locale,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(
      and(
        eq(orders.status, "delivered"),
        isNull(orders.reviewRequestedAt),
        lt(shipments.deliveredAt, cutoff),
      ),
    )
    .limit(50)

  let sent = 0

  for (const order of pendingOrders) {
    const items = await db
      .select({
        name: productTranslations.name,
        mg: vials.sizeMg,
      })
      .from(orderItems)
      .innerJoin(vials, eq(vials.id, orderItems.vialId))
      .innerJoin(products, eq(products.id, vials.productId))
      .leftJoin(
        productTranslations,
        and(
          eq(productTranslations.productId, products.id),
          eq(productTranslations.locale, order.locale ?? "en"),
        ),
      )
      .where(eq(orderItems.orderId, order.id))

    const firstName = order.email.split("@")[0]?.split(".")[0] ?? "Researcher"
    const locale = (order.locale as Locale) ?? "en"

    const html = await reviewRequestHtml({
      orderNumber: order.number,
      customerName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      items: items.map((i) => ({ name: i.name ?? "Peptide", mg: i.mg ?? 0 })),
      locale,
    })
    const t = await getTranslations({ locale, namespace: "email" })

    const ok = await sendEmail({
      to: order.email,
      subject: t("reviewRequestSubject", { number: order.number }),
      html,
    })

    if (ok) {
      await db.update(orders).set({ reviewRequestedAt: new Date() }).where(eq(orders.id, order.id))
      sent++
    }
  }

  return NextResponse.json({ processed: pendingOrders.length, sent })
}
