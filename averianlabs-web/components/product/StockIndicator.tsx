import type { SizeUnit } from "@/lib/cart/store"
import type { Availability } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { Check, CircleAlert } from "lucide-react"
import { useTranslations } from "next-intl"

interface StockIndicatorProps {
  stockQty: number
  purchaseMode: "direct" | "quotation" | "unavailable"
  availability?: Availability
  className?: string
  size?: "sm" | "md"
}

/**
 * Compact stock / availability indicator. Three visible states:
 *   - in stock, with optional low-stock copy
 *   - out of stock (purchase disabled) but a product exists
 *   - quote-only / unavailable
 *
 * Colour is paired with an icon and a textual label — never colour alone.
 */
export function StockIndicator({
  stockQty,
  purchaseMode,
  availability,
  className,
  size = "md",
}: StockIndicatorProps) {
  const t = useTranslations("product")
  if (purchaseMode !== "direct" || (availability && !availability.buyable)) {
    const blocker = availability?.blockers[0]
    return (
      <div
        role="status"
        className={cn(
          "inline-flex items-center gap-2 text-ink-muted",
          size === "sm" ? "text-xs" : "text-sm",
          className,
        )}
      >
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium">
          {blocker
            ? t(`availability.${blocker}.title` as "availability.notPublished.title")
            : t("stockOut")}
        </span>
      </div>
    )
  }
  const low = stockQty <= 5
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-2",
        low ? "text-warn" : "text-success",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Check className="h-3.5 w-3.5" aria-hidden />
      <span className="font-medium">{low ? t("stockLow", { n: stockQty }) : t("stockIn")}</span>
    </div>
  )
}

export type { SizeUnit }
