export const dynamic = "force-dynamic"

import { ReorderButton } from "@/components/account/reorder-button"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { listOrdersForUserWithLines } from "@/lib/orders"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { formatCurrency, formatSize } from "@/lib/utils/format"
import { ArrowLeft, Package } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

const STATUS_TONES: Record<string, "success" | "warn" | "muted" | "danger"> = {
  paid: "success",
  packed: "success",
  shipped: "success",
  delivered: "success",
  pending: "warn",
  awaiting_crypto: "warn",
  payment_review: "warn",
  failed: "danger",
  expired: "muted",
  refunded: "muted",
}

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("account")
  const r = await getTranslations("research")
  const member = await getCurrentMember()
  const orders = member ? await listOrdersForUserWithLines(member.id).catch(() => []) : []
  const catalogue = member ? await getStorefrontCatalogue().catch(() => []) : []

  return (
    <Container className="py-16">
      <Link
        href={`/${locale}/account`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToAccount")}
      </Link>

      <header className="mb-8">
        <Badge tone="accent" className="mb-3">
          {t("orders")}
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t("orders")}</h1>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-16 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-ink-subtle" />
          <p className="font-display text-lg">{t("noOrders")}</p>
          <p className="mt-2 text-sm text-ink-muted">{t("noOrdersSub")}</p>
          <Button asChild>
            <Link href={`/${locale}/shop`} className="mt-6 inline-block">
              {t("browseShop")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(({ order, lines }) => (
            <div
              key={order.id}
              className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/${locale}/checkout/confirm/${order.id}`}
                    className="font-mono text-sm font-medium hover:text-accent hover:underline"
                  >
                    {order.number}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(order.placedAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONES[order.status] ?? "muted"}>{r(order.status)}</Badge>
                  <span className="font-display text-lg font-semibold">
                    {formatCurrency(order.totalCents, "EUR", locale)}
                  </span>
                </div>
              </div>

              {lines.length ? (
                <ul className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink-muted">
                  {lines.map((line) => (
                    <li key={line.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {line.nameSnapshot}{" "}
                        <span className="font-mono text-xs">
                          {formatSize(
                            {
                              sizeValue: Number(line.sizeValueSnapshot),
                              sizeUnit: line.sizeUnitSnapshot ?? "",
                            },
                            locale,
                          )}
                        </span>{" "}
                        × {line.qty}
                      </span>
                      <span className="font-mono text-xs tabular-nums">
                        {formatCurrency(line.unitPriceCents * line.qty, "EUR", locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <ReorderButton
                locale={locale}
                catalogue={catalogue}
                lines={lines.map((line) => ({
                  sku: line.skuSnapshot ?? "",
                  name: line.nameSnapshot ?? "",
                  sizeValue: Number(line.sizeValueSnapshot ?? 0),
                  sizeUnit: line.sizeUnitSnapshot ?? "",
                  qty: line.qty,
                  paidUnitPriceCents: line.unitPriceCents,
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}
