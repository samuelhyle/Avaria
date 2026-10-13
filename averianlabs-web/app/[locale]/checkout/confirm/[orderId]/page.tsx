import { OrderStatus } from "@/components/checkout/OrderStatus"
import { Container } from "@/components/ui/Container"
import { orderItems } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { listDocumentsForBatchIds } from "@/lib/documents/service"
import { getOrderById, getOrderSkuQuantities, releaseExpiredReservations } from "@/lib/orders"
import { hasOrderAccess } from "@/lib/orders/access"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { eq } from "drizzle-orm"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const dynamic = "force-dynamic"
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { locale, orderId } = await params
  const { token } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "research" })
  await releaseExpiredReservations().catch(() => 0)
  const [order, member] = await Promise.all([
    getOrderById(orderId).catch(() => null),
    getCurrentMember().catch(() => null),
  ])
  const allowed =
    order && ((member && member.id === order.userId) || hasOrderAccess(orderId, token))
  if (!order || !allowed)
    return (
      <Container className="py-16">
        <h1 className="font-display text-3xl font-semibold">{t("notFound")}</h1>
        <p className="mt-4">{t("notFoundBody")}</p>
      </Container>
    )
  const state = ["paid", "shipped", "delivered"].includes(order.status)
    ? "paid"
    : order.status === "pending"
      ? "processingPayment"
      : order.status === "payment_review"
        ? "review"
        : order.status === "refunded"
          ? "refunded"
          : "failed"
  const title = state === "processingPayment" ? t("processingPayment") : t(`${state}Title`)
  const body = state === "processingPayment" ? t("processingPaymentBody") : t(`${state}Body`)
  const items = await getOrderSkuQuantities(order.id)
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
  const docs = await listDocumentsForBatchIds(
    lines.flatMap((line) => (line.batchId ? [line.batchId] : [])),
    locale,
  )
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-8">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-4 leading-relaxed text-ink-muted">{body}</p>
        <dl className="mt-6 space-y-2">
          <div className="flex flex-wrap justify-between gap-3">
            <dt>{t("orderNumber")}</dt>
            <dd className="font-mono">{order.number}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("total")}</dt>
            <dd>{formatCurrency(order.totalCents, "EUR", locale)}</dd>
          </div>
        </dl>
        <ul className="mt-6 space-y-4">
          {lines.map((line) => (
            <li key={line.id} className="border-t border-line pt-4">
              <p>
                {line.nameSnapshot} ·{" "}
                {formatSize(
                  {
                    sizeValue: Number(line.sizeValueSnapshot),
                    sizeUnit: line.sizeUnitSnapshot ?? "",
                  },
                  locale,
                )}{" "}
                × {line.qty}
              </p>
              <p className="text-xs text-ink-muted">
                {line.skuSnapshot} · {t("batch")}: {line.batchCodeSnapshot}
              </p>
              <p>{formatCurrency(line.unitPriceCents * line.qty, "EUR", locale)}</p>
            </li>
          ))}
        </ul>
        {docs.length > 0 && (
          <section className="mt-6">
            <h2 className="font-semibold">{t("includedDocuments")}</h2>
            <ul>
              {docs.map((doc) => (
                <li key={doc.id}>
                  <Link className="text-accent underline" href={`/${locale}/documents/${doc.id}`}>
                    {doc.title} · {doc.batchCode}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link className="mt-6 inline-block text-accent underline" href={`/${locale}/shop`}>
          {t("browse")}
        </Link>
        <OrderStatus id={order.id} status={order.status} items={items} />
      </div>
    </Container>
  )
}
