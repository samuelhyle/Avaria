"use client"

import { Badge } from "@/components/ui/Badge"
import type { Product } from "@/lib/products/types"
import { findCheapestVial, isContactOnly } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { Check, Clock, RefreshCw, Sparkles, Truck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

const INTERVALS = [
  { id: "4", weeks: 4, labelKey: "subscribeCadence4" },
  { id: "8", weeks: 8, labelKey: "subscribeCadence8" },
  { id: "12", weeks: 12, labelKey: "subscribeCadence12" },
] as const

interface SubscribeSaveProps {
  product: Product
  locale: string
}

export function SubscribeSave({ product, locale }: SubscribeSaveProps) {
  const t = useTranslations("product")
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]["id"]>("8")
  const [qty, setQty] = useState(1)
  const vial = findCheapestVial(product)
  if (!vial) return null
  const isContact = isContactOnly(vial)

  const basePrice = vial.priceCents
  const discount = 0.1
  const discountedPrice = Math.round(basePrice * (1 - discount))
  const savingsPerOrder = basePrice - discountedPrice

  if (isContact) return null

  return (
    <section className="rounded-[var(--radius-lg)] border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-ice-soft p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{t("subscribeHeading")}</h2>
          <p className="text-xs text-ink-muted">{t("subscribeSub")}</p>
        </div>
        <Badge tone="accent" className="ml-auto">
          <Sparkles className="h-3 w-3" />
          {t("subscribeSaveAmount", {
            amount: formatCurrency(savingsPerOrder, "EUR", locale),
          })}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
            {t("subscribeCadence")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {INTERVALS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInterval(opt.id)}
                className={cn(
                  "flex flex-col items-start rounded-[var(--radius)] border p-2.5 text-left transition-colors",
                  interval === opt.id
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-surface text-ink hover:border-accent/40",
                )}
              >
                <span className="text-xs font-semibold">{t(opt.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
            {t("subscribeVialsPerShipment")}
          </p>
          <div className="mt-2 inline-flex items-center rounded-[var(--radius)] border border-line bg-surface">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="inline-flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
              aria-label="−"
            >
              −
            </button>
            <span className="w-10 text-center font-mono text-sm">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="inline-flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
              aria-label="+"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">{t("subscribePerShipment")}</span>
            <div className="text-right">
              <span className="text-xs text-ink-subtle line-through">
                {formatCurrency(basePrice * qty, "EUR", locale)}
              </span>
              <p className="font-display text-xl font-semibold">
                {formatCurrency(discountedPrice * qty, "EUR", locale)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            toast.success(t("subscribeSaved"), {
              description: t("subscribeDescription", {
                qty,
                mg: vial.mg,
                weeks: interval,
              }),
            })
          }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <RefreshCw className="h-4 w-4" />
          {t("subscribeStart")}
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 border-t border-accent/20 pt-4 text-xs text-ink-muted sm:grid-cols-3">
        <li className="flex items-center gap-1.5">
          <Check className="h-3 w-3 shrink-0 text-success" />
          {t("subscribeCancelAnytime")}
        </li>
        <li className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-accent" />
          {t("subscribeLockIn")}
        </li>
        <li className="flex items-center gap-1.5">
          <Truck className="h-3 w-3 shrink-0 text-accent" />
          {t("subscribePriorityDispatch")}
        </li>
      </ul>
    </section>
  )
}
