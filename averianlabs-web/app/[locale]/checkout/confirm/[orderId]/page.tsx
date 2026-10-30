import { OrderStatus } from "@/components/checkout/OrderStatus"
import { OrderTimeline } from "@/components/checkout/OrderTimeline"
import { cryptoCheckoutSessions, orderItems } from "@/db/schema"
import { CHECKOUT_TEST_SKU } from "@/lib/checkout/test-product"
import { getCurrentMember } from "@/lib/community"
import { CHAINS, type ChainId } from "@/lib/crypto/chains"
import { telegramDeepLink } from "@/lib/crypto/session"
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
      <div className="py-10">
        <h1 className="font-display text-3xl font-semibold">{t("notFound")}</h1>
        <p className="mt-4">{t("notFoundBody")}</p>
      </div>
    )
  const state = ["paid", "packed", "shipped", "delivered"].includes(order.status)
    ? "paid"
    : order.status === "pending"
      ? "processingPayment"
      : order.status === "awaiting_crypto"
        ? "awaitingCrypto"
        : order.status === "payment_review"
          ? "review"
          : order.status === "refunded"
            ? "refunded"
            : "failed"
  const title = state === "processingPayment" ? t("processingPayment") : t(`${state}Title`)
  const body = state === "processingPayment" ? t("processingPaymentBody") : t(`${state}Body`)
  const items = await getOrderSkuQuantities(order.id)
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
  const [session] = await db
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.orderId, order.id))
    .limit(1)
  const docs = await listDocumentsForBatchIds(
    lines.flatMap((line) => (line.batchId ? [line.batchId] : [])),
    locale,
  )
  return (
    <div className="py-10">
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-8">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-4 leading-relaxed text-ink-muted">{body}</p>
        <dl className="mt-6 space-y-2">
          <div className="flex flex-wrap justify-between gap-3">
            <dt>{t("orderNumber")}</dt>
            <dd className="font-mono">{order.number}</dd>
          </div>
          {order.discountCents > 0 ? (
            <div className="flex justify-between">
              <dt>
                {t("discount")}
                {order.promoCode ? ` (${order.promoCode})` : ""}
              </dt>
              <dd className="text-success">
                −{formatCurrency(order.discountCents, "EUR", locale)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{t("total")}</dt>
            <dd>{formatCurrency(order.totalCents, "EUR", locale)}</dd>
          </div>
        </dl>
        {session ? (
          <section className="mt-6 rounded-[var(--radius)] border border-line bg-surface-2/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
              {t("crypto")}
            </h2>
            {order.status === "awaiting_crypto" && session.expiresAt > new Date() ? (
              <p className="mt-3 text-sm">
                <a
                  className="text-accent underline"
                  href={telegramDeepLink(session.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "fi" ? "Avaa lasku Telegramissa" : "Open invoice in Telegram"}
                </a>
                <br />
                {locale === "fi"
                  ? "Paina Start. Lähetä täsmällinen laskun summa vain valitussa verkossa."
                  : "Press Start in the bot. Send the exact invoice amount on the selected network only."}
              </p>
            ) : null}
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>{t("cryptoAmount")}</dt>
                <dd className="font-mono tabular-nums">
                  {session.amountCrypto} {CHAINS[session.chain as ChainId]?.symbol ?? session.chain}
                </dd>
              </div>
              {session.status === "paid" && order.cryptoTxHash ? (
                <div className="flex justify-between gap-3">
                  <dt>{t("cryptoTx")}</dt>
                  <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                    {order.cryptoTxHash}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}
        {lines.length === 1 && lines[0]?.skuSnapshot === CHECKOUT_TEST_SKU ? (
          <p className="mt-6 rounded border border-line p-4 text-sm">
            {locale === "fi"
              ? "Kassan testitilaus. Ei fyysisiä tuotteita tai toimitusta."
              : "Checkout test order. No physical goods or shipment."}
          </p>
        ) : (
          <OrderTimeline status={order.status} locale={locale} />
        )}
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
                {line.skuSnapshot}
                {line.batchCodeSnapshot ? ` · ${t("batch")}: ${line.batchCodeSnapshot}` : ""}
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
    </div>
  )
}
