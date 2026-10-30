export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { ManualDepositMatch } from "@/components/admin/manual-deposit-match"
import { OrderActions } from "@/components/admin/order-actions"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { getAdminOrderDetail } from "@/lib/admin/orders"
import { CHAINS, type ChainId } from "@/lib/crypto/chains"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowLeft, Package, Truck } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Order · Admin", robots: { index: false, follow: false } }
}

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { locale, orderId } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")
  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell />
      </Container>
    )
  }
  const order = await getAdminOrderDetail(orderId)
  if (!order) {
    return (
      <Container size="narrow" className="py-16">
        <p className="text-sm text-ink-muted">{t("ordersUi.notFound")}</p>
        <Link href={`/${locale}/admin/orders`} className="mt-4 inline-block text-sm text-accent">
          ← {t("ordersUi.back")}
        </Link>
      </Container>
    )
  }
  const money = (cents: number) => formatCurrency(cents, order.currency, locale)
  return (
    <AdminShell member={member}>
      <Container className="py-10">
        <Link
          href={`/${locale}/admin/orders`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("ordersUi.back")}
        </Link>

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{order.number}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {order.email} · {new Date(order.placedAt).toLocaleString(locale)} ·{" "}
              {order.paymentMethod}
            </p>
          </div>
          <Badge tone={order.status === "paid" ? "success" : "warn"}>{order.status}</Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                {t("ordersUi.items")}
              </h2>
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      {item.name ?? item.sku}{" "}
                      <span className="font-mono text-xs text-ink-muted">
                        {item.sku}
                        {item.batchCode ? ` · ${item.batchCode}` : ""}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      × {item.qty} · {money(item.unitPriceCents * item.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <dt>{t("ordersUi.products")}</dt>
                  <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
                </div>
                {order.discountCents > 0 ? (
                  <div className="flex justify-between text-success">
                    <dt>
                      {t("ordersUi.discount")}
                      {order.promoCode ? ` (${order.promoCode})` : ""}
                    </dt>
                    <dd className="tabular-nums">−{money(order.discountCents)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt>{t("ordersUi.shipping")}</dt>
                  <dd className="tabular-nums">{money(order.shippingCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("ordersUi.vat")}</dt>
                  <dd className="tabular-nums">{money(order.vatCents)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>{t("ordersUi.total")}</dt>
                  <dd className="tabular-nums">{money(order.totalCents)}</dd>
                </div>
              </dl>
            </section>

            {order.shippingAddress ? (
              <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("ordersUi.shipTo")}
                </h2>
                <address className="text-sm not-italic leading-relaxed text-ink-muted">
                  {order.shippingAddress.name ? (
                    <>
                      {order.shippingAddress.name}
                      <br />
                    </>
                  ) : null}
                  {order.shippingAddress.line1}
                  <br />
                  {order.shippingAddress.line2 ? (
                    <>
                      {order.shippingAddress.line2}
                      <br />
                    </>
                  ) : null}
                  {order.shippingAddress.postal} {order.shippingAddress.city}
                  <br />
                  {order.shippingAddress.country}
                </address>
              </section>
            ) : null}

            {order.cryptoSession ? (
              <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("ordersUi.cryptoInvoice")}
                </h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>{t("ordersUi.cryptoAmount")}</dt>
                    <dd className="font-mono tabular-nums">
                      {order.cryptoSession.amountCrypto}{" "}
                      {CHAINS[order.cryptoSession.chain as ChainId]?.symbol ??
                        order.cryptoSession.chain}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("ordersUi.cryptoRate")}</dt>
                    <dd className="font-mono tabular-nums">
                      €
                      {order.cryptoSession.rateEurPerUnit.toLocaleString(locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("ordersUi.cryptoStatus")}</dt>
                    <dd>
                      <Badge tone="muted" size="sm">
                        {order.cryptoSession.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("ordersUi.cryptoWallet")}</dt>
                    <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                      {order.cryptoSession.walletAddress}
                    </dd>
                  </div>
                  {order.cryptoTxHash ? (
                    <div className="flex justify-between gap-3">
                      <dt>{t("ordersUi.cryptoTx")}</dt>
                      <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                        {order.cryptoTxHash}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <ManualDepositMatch
                  sessionId={order.cryptoSession.id}
                  chain={order.cryptoSession.chain}
                  labels={{
                    heading: t("ordersUi.manualMatch"),
                    hint: t("ordersUi.manualMatchHint"),
                    txHash: t("ordersUi.manualMatchHash"),
                    assign: t("ordersUi.manualMatchAssign"),
                    saved: t("ordersUi.manualMatchSaved"),
                    failed: t("ordersUi.manualMatchFailed"),
                  }}
                />
              </section>
            ) : null}

            {order.shipments.length ? (
              <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("ordersUi.shipments")}
                </h2>
                <ul className="space-y-2 text-sm">
                  {order.shipments.map((shipment) => (
                    <li key={shipment.id} className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-ink-subtle" aria-hidden />
                      <span>
                        {shipment.carrier} · {shipment.service}
                      </span>
                      {shipment.trackingNumber ? (
                        <span className="font-mono text-xs text-ink-muted">
                          {shipment.trackingNumber}
                        </span>
                      ) : null}
                      <Badge tone="muted" size="sm">
                        {shipment.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <OrderActions
              orderId={order.id}
              status={order.status}
              locale={locale}
              labels={{
                heading: t("ordersUi.actions"),
                pack: t("ordersUi.pack"),
                ship: t("ordersUi.ship"),
                deliver: t("ordersUi.deliver"),
                refund: t("ordersUi.refund"),
                refundMethod: t("ordersUi.refundMethod"),
                refundStripe: t("ordersUi.refundStripe"),
                refundCrypto: t("ordersUi.refundCrypto"),
                refundManual: t("ordersUi.refundManual"),
                refundHash: t("ordersUi.refundHash"),
                refundReason: t("ordersUi.refundReason"),
                refundConfirm: t("ordersUi.refundConfirm"),
                carrier: t("ordersUi.carrier"),
                service: t("ordersUi.service"),
                trackingNumber: t("ordersUi.trackingNumber"),
                saved: t("ordersUi.saved"),
                failed: t("ordersUi.failed"),
              }}
            />
            {order.cryptoTxHash ? (
              <p className="mt-4 break-all rounded-[var(--radius)] border border-line bg-surface p-3 font-mono text-2xs text-ink-muted">
                {order.cryptoTxHash}
              </p>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-2xs text-ink-subtle">
              <Package className="h-3.5 w-3.5" aria-hidden />
              {t("ordersUi.hint")}
            </p>
          </aside>
        </div>
      </Container>
    </AdminShell>
  )
}
