"use client"

import { Button } from "@/components/ui/Button"
import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import type { CheckoutQuoteState } from "@/lib/checkout/use-quote"
import { formatCurrency } from "@/lib/utils/format"
import { Tag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

/**
 * Promotion code input.
 *
 * The code is resolved and priced on the server: the component stores the code
 * in the checkout store, the quote request carries it, and the server decides
 * whether it applies and for how much. The discount therefore shows up inside
 * the order summary next to the other money lines, and the amount shown here
 * is the amount the server returned — never a value computed in the browser.
 */
export function PromoCodeInput({
  locale,
  quoteState,
}: {
  locale: string
  /** The quote, owned by the caller, so the code and the summary agree. */
  quoteState: CheckoutQuoteState
}) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const cart = useTranslations("cart")
  const promoCode = useCheckout((state) => state.promoCode)
  const setPromoCode = useCheckout((state) => state.setPromoCode)
  const items = useCart((state) => state.items)
  const { quote, loading } = quoteState

  const applied = Boolean(promoCode && quote?.promotion)

  // A code that the server refuses is cleared so the customer is not left with
  // a code that silently does nothing.
  useEffect(() => {
    if (!promoCode || !quote || loading) return
    if (quote.promotion) {
      setError(null)
      return
    }
    if (quote.promotionError) {
      setError(message(quote.promotionError))
      setPromoCode("")
    }
    // `setPromoCode` is stable; `quote` changes when the code changes.
  }, [promoCode, quote, loading, setPromoCode])

  function message(reason: string): string {
    switch (reason) {
      case "inactive":
        return cart("promoInactive")
      case "not_started":
        return cart("promoNotStarted")
      case "expired":
        return cart("promoExpired")
      case "min_subtotal":
        return cart("promoMinSubtotal", {
          amount: formatCurrency(quote?.promotionRequiredCents ?? 0, "EUR", locale),
        })
      case "max_redemptions":
        return cart("promoExhausted")
      default:
        return cart("promoNotFound")
    }
  }

  function apply(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError(cart("promoEnter"))
      return
    }
    setError(null)
    setPromoCode(trimmed.toUpperCase())
  }

  function remove() {
    setPromoCode("")
    setCode("")
    setError(null)
  }

  if (applied && promoCode) {
    const discount = quote?.promotion?.discountCents ?? 0
    const freeShipping = quote?.promotion?.freeShipping
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <header className="mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">{cart("promo")}</h3>
        </header>
        <div className="flex items-center justify-between rounded-[var(--radius)] border border-success/30 bg-success-soft px-3 py-2 text-sm">
          <div>
            <p className="font-semibold text-success">{promoCode}</p>
            <p className="text-xs text-success/80">
              {freeShipping
                ? cart("promoFreeShipping")
                : cart("promoApplied", { amount: formatCurrency(discount, "EUR", locale) })}
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label={cart("promoRemove", { code: promoCode })}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-success hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <header className="mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-accent" aria-hidden />
        <h3 className="text-sm font-semibold tracking-tight">{cart("promo")}</h3>
      </header>
      <form onSubmit={apply} className="flex flex-wrap items-stretch gap-2">
        <input
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          placeholder={cart("promoPlaceholder")}
          aria-label={cart("promo")}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "promo-code-error" : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm font-mono uppercase outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <Button type="submit" disabled={loading || !items.length} className="h-10 px-4">
          {cart("promoApply")}
        </Button>
        {error ? (
          <p id="promo-code-error" role="alert" className="basis-full text-xs text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
