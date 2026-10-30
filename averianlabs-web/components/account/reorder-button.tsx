"use client"

import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import type { Product } from "@/lib/products/types"
import { formatCurrency } from "@/lib/utils/format"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useMemo, useState } from "react"

export interface ReorderLine {
  sku: string
  name: string
  sizeValue: number
  sizeUnit: string
  qty: number
  /** The unit price that was paid. */
  paidUnitPriceCents: number
}

/**
 * "Buy again" for a past order.
 *
 * A reorder is only offered for the lines that can still be bought, and a
 * line whose price has changed is not silently added: the customer is shown
 * the new price and has to agree to it. Reordering at a different price
 * without saying so would be a surprise at checkout.
 */
export function ReorderButton({
  locale,
  lines,
  catalogue,
}: {
  locale: string
  lines: ReorderLine[]
  catalogue: Product[]
}) {
  const t = useTranslations("account")
  const add = useCart((state) => state.add)
  const [state, setState] = useState<"idle" | "confirm" | "done" | "unavailable">("idle")

  const priced = useMemo(
    () =>
      lines.map((line) => {
        const product = catalogue.find((candidate) =>
          candidate.vials.some((vial) => vial.sku === line.sku),
        )
        const vial = product?.vials.find((candidate) => candidate.sku === line.sku)
        const buyable = Boolean(
          product &&
            vial &&
            vial.purchaseMode === "direct" &&
            vial.priceCents > 0 &&
            vial.stockQty >= line.qty,
        )
        return {
          line,
          product,
          vial,
          buyable,
          priceChanged: Boolean(vial && vial.priceCents !== line.paidUnitPriceCents),
        }
      }),
    [lines, catalogue],
  )

  const addable = priced.filter((entry) => entry.buyable)
  const changed = priced.filter((entry) => entry.buyable && entry.priceChanged)
  const unavailable = priced.filter((entry) => !entry.buyable)

  if (!addable.length)
    return <p className="mt-2 text-2xs text-ink-subtle">{t("reorderUnavailable")}</p>

  function putInCart() {
    for (const entry of addable) {
      if (!entry.product || !entry.vial) continue
      add({
        productSlug: entry.product.slug,
        sku: entry.vial.sku,
        name: (entry.product.translations?.[locale as never] ?? entry.product.defaultTranslation)
          .name,
        mg: entry.vial.mg,
        sizeValue: entry.vial.sizeValue,
        sizeUnit: entry.vial.sizeUnit,
        qty: entry.line.qty,
        unitPriceCents: entry.vial.priceCents,
        purchaseMode: entry.vial.purchaseMode,
      })
    }
    setState("done")
  }

  if (state === "done")
    return (
      <p className="mt-2 text-xs text-success">
        {t("reorderAdded")}{" "}
        <Link href={`/${locale}/checkout/cart`} className="text-accent underline">
          {t("reorderViewCart")}
        </Link>
      </p>
    )

  if (state === "confirm")
    return (
      <div className="mt-3 rounded-[var(--radius)] border border-warn/40 bg-warn-soft p-3">
        <p className="flex items-start gap-2 text-xs text-ink">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
          <span>
            {t("reorderPriceChanged")}
            {changed.map((entry) => (
              <span key={entry.line.sku} className="block">
                {entry.line.name} · {formatCurrency(entry.line.paidUnitPriceCents, "EUR", locale)} →{" "}
                {formatCurrency(entry.vial?.priceCents ?? 0, "EUR", locale)}
              </span>
            ))}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={putInCart}>
            {t("reorderConfirm")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    )

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        onClick={() => (changed.length ? setState("confirm") : putInCart())}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {t("reorder")}
      </Button>
      {unavailable.length ? (
        <p className="mt-1 text-2xs text-ink-subtle">{t("reorderUnavailable")}</p>
      ) : null}
    </div>
  )
}
