"use client"

import { Check, ShoppingCart, Sparkles, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ActionResolution, ProposedAction } from "@/lib/ai/types/events"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"

export function ActionCard({
  action,
  resolved,
  onConfirm,
  onDismiss,
}: {
  action: ProposedAction
  resolved?: ActionResolution
  onConfirm: () => void
  onDismiss: () => void
}) {
  const t = useTranslations("averia")
  const locale = useLocale()
  if (action.kind === "add_to_cart") {
    if (resolved === "dismissed") return null
    const totalCents = action.unitPriceCents * action.qty
    const isAdded = resolved === "added"
    return (
      <div
        className={cn(
          "rounded-[var(--radius)] border p-3 text-sm",
          isAdded ? "border-success/30 bg-success/5" : "border-accent/30 bg-accent-soft",
        )}
      >
        <div className="flex items-start gap-2">
          {isAdded ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {t("actions.addPrompt", {
                qty: action.qty,
                name: action.productName,
                mg: action.mg,
              })}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatCurrency(totalCents, "EUR", locale)} · SKU {action.sku}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isAdded}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              isAdded
                ? "cursor-default bg-success/15 text-success"
                : "bg-accent text-white hover:bg-accent-hover",
            )}
          >
            <Check className="h-3 w-3" /> {isAdded ? t("actions.added") : t("actions.addToCart")}
          </button>
          {isAdded ? null : (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> {t("actions.dismiss")}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (action.kind === "remember") {
    if (resolved === "dismissed") return null
    const isSaved = resolved === "added"
    return (
      <div
        className={cn(
          "rounded-[var(--radius)] border p-3 text-sm",
          isSaved ? "border-success/30 bg-success/5" : "border-ice/40 bg-ice-soft/40",
        )}
      >
        <div className="flex items-start gap-2">
          {isSaved ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="flex-1">
            <p className="font-medium">{t("actions.rememberPrompt")}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {action.value} · {action.key}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaved}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              isSaved
                ? "cursor-default bg-success/15 text-success"
                : "bg-accent text-on-accent hover:bg-accent-hover",
            )}
          >
            <Check className="h-3 w-3" />
            {isSaved ? t("actions.remembered") : t("actions.remember")}
          </button>
          {isSaved ? null : (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> {t("actions.dismiss")}
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
