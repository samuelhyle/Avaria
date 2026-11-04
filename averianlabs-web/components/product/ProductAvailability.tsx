"use client"

import { QuoteForm } from "@/components/product/QuoteForm"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import type { Availability, AvailabilityBlocker } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { CircleAlert, MailCheck, PackageSearch } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

/**
 * The state of one variant, and the action that state deserves.
 *
 * A storefront that says "unavailable" and nothing else looks broken. A
 * storefront that says "no lot has been released for this size yet, we will
 * email you when one is" is doing its job: it tells the customer where the
 * product stands and it captures the interest in the meantime.
 *
 * Two actions, and the state chooses between them:
 *   - request a lot, when the team has to confirm something
 *   - notify me, when the only thing missing is time
 */

const BLOCKER_ICONS: Record<AvailabilityBlocker, typeof CircleAlert> = {
  notPublished: PackageSearch,
  unverifiedSpecifications: PackageSearch,
  notReleased: PackageSearch,
  noCertificate: PackageSearch,
  noPrice: CircleAlert,
  outOfStock: CircleAlert,
  quotation: CircleAlert,
}

export function ProductAvailability({
  availability,
  sku,
  productName,
  sizeLabel,
  locale,
}: {
  availability: Availability
  sku: string
  productName: string
  sizeLabel: string
  locale: string
}) {
  const t = useTranslations("product")
  const r = useTranslations("research")
  const [pending, setPending] = useState(false)
  const [registered, setRegistered] = useState(false)

  const blocker = availability.blockers[0]
  if (!blocker) return null
  const Icon = BLOCKER_ICONS[blocker]
  const asking = availability.action === "requestLot"

  return (
    <section
      aria-label={t("availabilityTitle")}
      data-testid="product-availability"
      data-blocker={blocker}
      data-action={availability.action}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            asking ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-muted",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-ink">
            {t(`availability.${blocker}.title` as "availability.notPublished.title")}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {t(`availability.${blocker}.body` as "availability.notPublished.body")}
          </p>
        </div>
      </div>

      {asking ? (
        <div className="mt-5 rounded-[var(--radius)] border border-line bg-surface-2/40 p-4">
          <p className="text-sm font-semibold text-ink">
            {productName} · {sizeLabel}
          </p>
          <p className="mt-1 font-mono text-2xs text-ink-subtle">{sku}</p>
          <div className="mt-4">
            <QuoteForm sku={sku} locale={locale} compact />
          </div>
        </div>
      ) : registered ? (
        <p
          role="status"
          data-testid="notify-done"
          className="mt-4 flex items-center gap-2 rounded-[var(--radius)] bg-success-soft px-3 py-2 text-sm text-success"
        >
          <MailCheck className="h-4 w-4" aria-hidden />
          {t("notifySubmitted")}
        </p>
      ) : (
        <form
          className="mt-5 flex flex-col gap-2 sm:flex-row"
          onSubmit={async (event) => {
            event.preventDefault()
            if (pending) return
            const data = new FormData(event.currentTarget)
            const email = String(data.get("email") ?? "")
            setPending(true)
            try {
              const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sku, email, locale }),
              })
              if (!res.ok) throw new Error("notify_failed")
              setRegistered(true)
              toast.success(t("notifySubmitted"))
            } catch {
              toast.error(t("notifyFailed"))
            } finally {
              setPending(false)
            }
          }}
        >
          <Input
            name="email"
            label={t("notifyEmailLabel")}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="sm:flex-1"
          />
          <Button
            type="submit"
            disabled={pending}
            data-testid="notify-submit"
            className="sm:self-end"
          >
            {pending ? t("notifySending") : t("notifyMe")}
          </Button>
        </form>
      )}

      {asking ? <p className="mt-4 text-2xs text-ink-subtle">{r("quoteResponseNote")}</p> : null}
    </section>
  )
}
