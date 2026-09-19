import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { getOrderById } from "@/lib/orders"
import { CheckCircle2, XCircle } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"


export const dynamic = "force-dynamic"

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { locale, orderId } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "checkout" })

  const [order, member] = await Promise.all([
    getOrderById(orderId).catch(() => null),
    getCurrentMember().catch(() => null),
  ])

  const isOwner = Boolean(order && member && order.userId === member.id)
  const isGuestOrder = Boolean(order && !order.userId)

  // Never disclose order details to anyone who isn't the owner. Guest orders
  // render a generic success screen (the confirmation email carries details).
  if (!order || (!isOwner && !isGuestOrder)) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-line bg-surface p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
            <XCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">Order not found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We couldn&apos;t find this order. Please check your email for confirmation.
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/shop`} className="mt-8 inline-block">
              {t("continueShopping")}
            </Link>
          </Button>
        </div>
      </Container>
    )
  }

  if (isGuestOrder) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-line bg-surface p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">{t("orderConfirmed")}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We&apos;ve emailed your order confirmation and receipt. If you don&apos;t see it, check
            your spam folder.
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/shop`} className="mt-8 inline-block">
              {t("continueShopping")}
            </Link>
          </Button>
        </div>
      </Container>
    )
  }

  const isPaid = order.status === "paid"

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-line bg-surface p-12 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold">{t("orderConfirmed")}</h1>
        <p className="mt-2 font-mono text-sm text-ink-muted">
          {t("orderNumber", { number: order.number })}
        </p>
        <p className="mt-4 text-sm text-ink-muted">{t("orderEmail", { email: order.email })}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Badge tone={isPaid ? "success" : "warn"}>{isPaid ? "Paid" : "Pending payment"}</Badge>
          <span className="font-mono text-sm text-ink-muted">
            €{(order.totalCents / 100).toFixed(2)}
          </span>
        </div>

        <div className="mt-8 rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-left text-sm">
          <p className="text-ink-muted">Included with your order:</p>
          <ul className="mt-2 space-y-1 text-ink">
            <li>· Batch-specific Certificate of Analysis (PDF)</li>
            <li>· Endotoxin test report</li>
            <li>· Mass-spec confirmation</li>
            <li>· Reconstitution guide</li>
          </ul>
        </div>

        <Button asChild size="lg">
          <Link href={`/${locale}/shop`} className="mt-8 inline-block">
            {t("continueShopping")}
          </Link>
        </Button>
      </div>
    </Container>
  )
}
