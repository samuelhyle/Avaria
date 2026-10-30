import { Check } from "lucide-react"
import { getTranslations } from "next-intl/server"

/**
 * "What happens next".
 *
 * A customer who has just paid wants to know what to expect and when. The
 * timeline is derived from the order status, so it always matches what the
 * order actually is — there is no separate copy to fall out of date.
 */
export async function OrderTimeline({ status, locale }: { status: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "research" })

  const steps = [
    {
      key: "placed",
      label: t("timelinePlaced"),
      done: true,
      active: false,
    },
    {
      key: "paid",
      label: t("timelinePaid"),
      done: ["paid", "packed", "shipped", "delivered"].includes(status),
      active: status === "pending" || status === "awaiting_crypto",
    },
    {
      key: "packed",
      label: t("timelinePacked"),
      done: ["packed", "shipped", "delivered"].includes(status),
      active: status === "paid",
    },
    {
      key: "shipped",
      label: t("timelineShipped"),
      done: ["shipped", "delivered"].includes(status),
      active: status === "packed",
    },
    {
      key: "delivered",
      label: t("timelineDelivered"),
      done: status === "delivered",
      active: status === "shipped",
    },
  ]

  const terminal = ["refunded", "failed", "expired", "payment_review"].includes(status)
  if (terminal) return null

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
        {t("timelineHeading")}
      </h2>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li
            key={step.key}
            className={
              step.active
                ? "flex items-center gap-3 text-sm font-medium text-ink"
                : step.done
                  ? "flex items-center gap-3 text-sm text-ink-muted"
                  : "flex items-center gap-3 text-sm text-ink-subtle"
            }
          >
            <span
              aria-hidden
              className={
                step.done
                  ? "flex h-5 w-5 items-center justify-center rounded-full bg-success text-white"
                  : step.active
                    ? "flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent"
                    : "flex h-5 w-5 items-center justify-center rounded-full border border-line"
              }
            >
              {step.done ? <Check className="h-3 w-3" /> : null}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </section>
  )
}
