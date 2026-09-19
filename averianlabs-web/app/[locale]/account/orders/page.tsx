import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { listOrdersForUser } from "@/lib/orders"
import { ArrowLeft, Package } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export const dynamic = "force-dynamic"

const STATUS_TONES: Record<string, "success" | "warn" | "muted" | "danger"> = {
  paid: "success",
  pending: "warn",
  failed: "danger",
  refunded: "muted",
}

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("account")
  const member = await getCurrentMember()
  const orders = member ? await listOrdersForUser(member.id).catch(() => []) : []

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
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-medium">{order.number}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(order.placedAt).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONES[order.status] ?? "muted"}>{order.status}</Badge>
                  <span className="font-display text-lg font-semibold">
                    €{(order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}
