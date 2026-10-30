export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { countOrdersByStatus, listAdminOrders } from "@/lib/admin/orders"
import { formatCurrency } from "@/lib/utils/format"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Orders · Admin", robots: { index: false, follow: false } }
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { locale } = await params
  const { status, q } = await searchParams
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
  const [result, counts] = await Promise.all([
    listAdminOrders({ status, query: q, limit: 100 }),
    countOrdersByStatus(),
  ])
  const total = counts.reduce((sum, entry) => sum + entry.count, 0)
  return (
    <AdminShell member={member}>
      <Container className="py-10">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("orders")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("ordersUi.subtitle")}</p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/orders`}
            className={`rounded-full border px-3 py-1 text-xs ${
              !status
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-muted hover:border-accent/40"
            }`}
          >
            {t("ordersUi.all")} ({total})
          </Link>
          {counts.map((entry) => (
            <Link
              key={entry.status}
              href={`/${locale}/admin/orders?status=${entry.status}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                status === entry.status
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-muted hover:border-accent/40"
              }`}
            >
              {entry.status} ({entry.count})
            </Link>
          ))}
        </div>

        {result.orders.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center text-sm text-ink-muted">
            {t("ordersUi.empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-2xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("ordersUi.order")}</th>
                  <th className="px-4 py-3 font-medium">{t("ordersUi.customer")}</th>
                  <th className="px-4 py-3 font-medium">{t("ordersUi.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("ordersUi.items")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("ordersUi.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/admin/orders/${order.id}`}
                        className="font-mono text-xs hover:text-accent hover:underline"
                      >
                        {order.number}
                      </Link>
                      <span className="block text-2xs text-ink-subtle">
                        {new Date(order.placedAt).toLocaleString(locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{order.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          ["paid", "packed", "shipped", "delivered"].includes(order.status)
                            ? "success"
                            : ["failed"].includes(order.status)
                              ? "danger"
                              : "warn"
                        }
                        size="sm"
                      >
                        {order.status}
                      </Badge>
                      {order.paymentMethod !== "stripe" ? (
                        <span className="mt-1 block text-2xs text-ink-subtle">
                          {order.paymentMethod}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{order.itemCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {formatCurrency(order.totalCents, order.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </AdminShell>
  )
}
