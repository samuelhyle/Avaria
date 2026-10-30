"use client"

import { CryptoPaymentOption } from "@/components/checkout/CryptoPaymentOption"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import { useCheckoutQuote } from "@/lib/checkout/use-quote"
import { vatLabel } from "@/lib/pricing"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const PaymentStep = dynamic(() => import("./PaymentStep").then((module) => module.PaymentStep), {
  ssr: false,
})
const StripeProvider = dynamic(
  () => import("./StripeProvider").then((module) => module.StripeProvider),
  { ssr: false },
)
type Step = "email" | "address" | "shipping" | "payment"

interface ChainOption {
  id: string
  label: string
  symbol: string
}

export function CheckoutForm({ step, locale }: { step: Step; locale: string }) {
  const t = useTranslations("checkout")
  const r = useTranslations("research")
  const router = useRouter()
  const checkout = useCheckout()
  const items = useCart((state) => state.items)
  const { quote, rates, shippingMethodId, selectedRate, error, loading, refresh } =
    useCheckoutQuote(locale)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [consent, setConsent] = useState(false)
  const [failure, setFailure] = useState<{ code: string; message: string } | null>(null)
  const [payment, setPayment] = useState<{
    clientSecret: string
    confirmationUrl: string
    totalCents: number
    subtotalCents: number
    discountCents: number
    promoCode: string | null
    shippingCents: number
    vatCents: number
  } | null>(null)
  const [method, setMethod] = useState<"stripe" | "crypto">("stripe")
  // The crypto option is only offered when it can actually work: the
  // customer is handed over to the Telegram bot, so without a bot there is
  // nowhere to send them. Read at runtime rather than baked in at build time.
  const [chains, setChains] = useState<ChainOption[]>([])
  const [cryptoAvailable, setCryptoAvailable] = useState(false)
  const money = (cents: number) => formatCurrency(cents, "EUR", locale)
  // Server failure codes are mapped to a specific message so the customer is
  // never left with a generic "something went wrong" for a condition they can
  // act on (a sold-out SKU, a stale quote, a rate limit).
  const failureMessage = (code: string) => {
    switch (code) {
      case "payment_unavailable":
        return r("paymentUnavailable")
      case "out_of_stock":
        return r("outOfStock")
      case "not_saleable":
      case "quote_required":
        return r("notSaleable")
      case "quote_changed":
        return r("quoteChanged")
      case "attempt_expired":
        return r("orderExpired")
      case "rate_limited":
        return r("rateLimited")
      default:
        return r("checkoutFailed")
    }
  }
  useEffect(() => setReady(true), [])
  // Which chains the store accepts, and whether the Telegram bot is ready to
  // take the customer over. Fetched once here and handed to the crypto
  // panel, so the payment method list and the panel always agree.
  useEffect(() => {
    if (step !== "payment") return
    const controller = new AbortController()
    void fetch("/api/crypto/chains", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { chains?: ChainOption[]; available?: boolean }) => {
        if (controller.signal.aborted) return
        setChains(data.chains ?? [])
        setCryptoAvailable(Boolean(data.available) && (data.chains?.length ?? 0) > 0)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [step])
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email)
  const hasAddress = Boolean(
    checkout.firstName.trim() &&
      checkout.lastName.trim() &&
      checkout.street.trim() &&
      checkout.city.trim() &&
      checkout.postal.trim().length >= 2 &&
      checkout.country === "FI",
  )
  useEffect(() => {
    if (!ready || !items.length) return
    if (step !== "email" && !hasEmail) router.replace(`/${locale}/checkout/email`)
    else if (["shipping", "payment"].includes(step) && !hasAddress)
      router.replace(`/${locale}/checkout/address`)
    else if (step === "payment" && !checkout.shippingMethod)
      router.replace(`/${locale}/checkout/shipping`)
  }, [ready, step, items.length, hasEmail, hasAddress, checkout.shippingMethod, locale, router])
  useEffect(() => {
    if (!ready || step !== "payment" || payment) return
    const saved = useCheckout.getState()
    if (!saved.pendingOrderId && (!saved.attemptKey || !saved.attemptFingerprint)) return
    const controller = new AbortController()
    async function resume() {
      try {
        if (saved.pendingOrderId && saved.pendingOrderUrl) {
          const token =
            new URL(saved.pendingOrderUrl, window.location.origin).searchParams.get("token") ?? ""
          const response = await fetch(
            `/api/orders/${encodeURIComponent(saved.pendingOrderId)}/status?token=${encodeURIComponent(token)}`,
            { signal: controller.signal },
          )
          const data = await response.json()
          if (!response.ok || controller.signal.aborted) return
          if (["paid", "packed", "shipped", "delivered", "awaiting_crypto"].includes(data.status)) {
            window.location.assign(saved.pendingOrderUrl)
            return
          }
          if (["expired", "failed", "payment_review", "refunded"].includes(data.status)) {
            saved.clearAttempt()
            saved.setPendingOrder("", "")
            return
          }
          if (data.clientSecret) setPayment({ ...data, confirmationUrl: saved.pendingOrderUrl })
        } else {
          const attemptPayload = JSON.parse(saved.attemptFingerprint)
          const response = await fetch(
            attemptPayload.paymentMethod === "crypto"
              ? "/api/checkout/crypto-session"
              : "/api/checkout",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...attemptPayload,
                requestKey: saved.attemptKey,
              }),
              signal: controller.signal,
            },
          )
          const data = await response.json()
          if (!response.ok || controller.signal.aborted) return
          saved.setPendingOrder(data.orderId, data.confirmationUrl)
          if (data.clientSecret) setPayment(data)
          else window.location.assign(data.confirmationUrl)
        }
      } catch {
        /* Preserve the saved attempt for an explicit retry. */
      }
    }
    void resume()
    return () => controller.abort()
  }, [ready, step, payment])
  if (!ready) return null
  if (!items.length)
    return (
      <div className="rounded border border-line bg-surface p-8">
        <p>{r("emptyCart")}</p>
        <Link className="mt-4 inline-block text-accent underline" href={`/${locale}/shop`}>
          {r("browse")}
        </Link>
      </div>
    )
  const next = () =>
    router.push(
      `/${locale}/checkout/${({ email: "address", address: "shipping", shipping: "payment", payment: "payment" } as const)[step]}`,
    )
  const create = async () => {
    if (!quote || !shippingMethodId || !consent || processing) return
    setFailure(null)
    const payload = checkoutPayload()
    const hash = JSON.stringify(payload)
    if (checkout.attemptFingerprint !== hash || !checkout.attemptKey)
      checkout.setAttempt(hash, crypto.randomUUID())
    setProcessing(true)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestKey: useCheckout.getState().attemptKey }),
      })
      const data = await response.json()
      if (!response.ok) {
        const code = data.code ?? "checkout_unavailable"
        // A stale attempt or a changed quote is recoverable: drop the saved
        // attempt and re-price so the next press uses fresh numbers.
        if (["attempt_expired", "quote_changed"].includes(code)) {
          checkout.clearAttempt()
          refresh()
        }
        setFailure({ code, message: failureMessage(code) })
        return
      }
      checkout.setPendingOrder(data.orderId, data.confirmationUrl)
      if (!data.clientSecret) {
        window.location.assign(data.confirmationUrl)
        return
      }
      setPayment(data)
    } catch {
      setFailure({ code: "checkout_unavailable", message: failureMessage("checkout_unavailable") })
    } finally {
      setProcessing(false)
    }
  }
  const displayedQuote = payment ?? quote
  /**
   * The checkout payload. The card route and the crypto route receive exactly
   * the same body, so both price the same order.
   */
  const checkoutPayload = () => ({
    email: checkout.email,
    items: items.map(({ sku, qty }) => ({ sku, qty })),
    shippingAddress: {
      name: `${checkout.firstName} ${checkout.lastName}`.trim(),
      line1: checkout.street,
      city: checkout.city,
      postal: checkout.postal,
      country: checkout.country,
    },
    vatId: checkout.b2b ? checkout.vatId : undefined,
    shippingMethodId,
    paymentMethod: method,
    promoCode: checkout.promoCode || undefined,
    locale,
    researchConsent: true,
    expectedQuoteHash: quote?.hash,
  })
  // The live quote knows the promotion object; a placed order only carries the
  // code it used.
  const discountHint =
    displayedQuote && "promotion" in displayedQuote
      ? (displayedQuote.promotion?.code ?? undefined)
      : displayedQuote && "promoCode" in displayedQuote
        ? (displayedQuote.promoCode ?? undefined)
        : undefined
  return (
    <section className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t(step)}</h1>
      {step === "email" ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            next()
          }}
        >
          <Input
            label={t("email")}
            type="email"
            autoComplete="email"
            required
            value={checkout.email}
            onChange={(event) => checkout.setEmail(event.target.value)}
          />
          <Button type="submit" fullWidth>
            {t("guest")}
          </Button>
          <Link className="block text-center text-accent underline" href={`/${locale}/account`}>
            {t("account")}
          </Link>
        </form>
      ) : null}
      {step === "address" ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            next()
          }}
        >
          <p className="text-sm text-ink-muted">{r("finlandOnly")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("firstName")}
              autoComplete="given-name"
              required
              value={checkout.firstName}
              onChange={(event) => checkout.setAddress({ firstName: event.target.value })}
            />
            <Input
              label={t("lastName")}
              autoComplete="family-name"
              required
              value={checkout.lastName}
              onChange={(event) => checkout.setAddress({ lastName: event.target.value })}
            />
          </div>
          <Input
            label={t("street")}
            autoComplete="street-address"
            required
            value={checkout.street}
            onChange={(event) => checkout.setAddress({ street: event.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("postal")}
              autoComplete="postal-code"
              required
              value={checkout.postal}
              onChange={(event) => checkout.setAddress({ postal: event.target.value })}
            />
            <Input
              label={t("city")}
              autoComplete="address-level2"
              required
              value={checkout.city}
              onChange={(event) => checkout.setAddress({ city: event.target.value })}
            />
          </div>
          <Input label={t("country")} value={r("finland")} readOnly />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checkout.b2b}
              onChange={(event) => checkout.setB2b(event.target.checked)}
            />
            {t("b2bToggle")}
          </label>
          {checkout.b2b ? (
            <Input
              label={t("vatId")}
              value={checkout.vatId}
              onChange={(event) => checkout.setVatId(event.target.value)}
              maxLength={32}
            />
          ) : null}
          <Button type="submit" fullWidth>
            {t("continueToShipping")}
          </Button>
        </form>
      ) : null}
      {step === "shipping" ? (
        <div className="mt-6 space-y-4">
          {loading ? <p role="status">{r("loadingShipping")}</p> : null}
          {error ? <p role="alert">{r("shippingUnavailable")}</p> : null}
          <fieldset>
            <legend className="sr-only">{t("shipping")}</legend>
            <div className="space-y-3">
              {rates.map((rate) => (
                <label
                  key={rate.id}
                  className="flex cursor-pointer items-center gap-3 rounded border border-line p-4 has-[:checked]:border-accent"
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={rate.id}
                    checked={checkout.shippingMethod === rate.id}
                    onChange={() => checkout.setShippingMethod(rate.id)}
                  />
                  <span className="flex-1">
                    {rate.carrier} · {rate.service}
                  </span>
                  <span>{money(rate.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button fullWidth disabled={!quote || !checkout.shippingMethod} onClick={next}>
            {r("continuePayment")}
          </Button>
        </div>
      ) : null}
      {step === "payment" ? (
        <div className="mt-6 space-y-5">
          {displayedQuote ? (
            <dl className="space-y-2 rounded border border-line bg-surface-2 p-4">
              {(
                [
                  { label: r("subtotal"), cents: displayedQuote.subtotalCents },
                  ...(displayedQuote.discountCents > 0
                    ? [
                        {
                          label: r("discount"),
                          cents: -displayedQuote.discountCents,
                          hint: discountHint,
                        },
                      ]
                    : []),
                  {
                    label: r("shipping"),
                    cents: displayedQuote.shippingCents,
                    hint: selectedRate
                      ? `${selectedRate.carrier} · ${selectedRate.service}`
                      : undefined,
                  },
                  {
                    label: r("vatIncluded", { rate: vatLabel(locale) }),
                    cents: displayedQuote.vatCents,
                  },
                  { label: r("total"), cents: displayedQuote.totalCents },
                ] as Array<{ label: string; cents: number; hint?: string }>
              ).map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt>
                    {row.label}
                    {row.hint ? (
                      <span className="block text-2xs text-ink-subtle">{row.hint}</span>
                    ) : null}
                  </dt>
                  <dd className={cn("tabular-nums", row.cents < 0 && "text-success")}>
                    {money(row.cents)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p role="status">{loading ? r("loadingShipping") : r("paymentUnavailable")}</p>
          )}
          {payment ? (
            <StripeProvider clientSecret={payment.clientSecret}>
              <PaymentStep
                orderTotal={payment.totalCents}
                locale={locale}
                confirmationUrl={payment.confirmationUrl}
                onSuccess={() => window.location.assign(payment.confirmationUrl)}
                onError={(message) => toast.error(message)}
              />
            </StripeProvider>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">{r("paymentMethod")}</legend>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      { id: "stripe" as const, label: r("card"), hint: t("cardHint") },
                      ...(cryptoAvailable
                        ? [{ id: "crypto" as const, label: r("crypto"), hint: t("cryptoHint") }]
                        : []),
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-3 text-sm",
                        method === option.id ? "border-accent bg-accent-soft" : "border-line",
                      )}
                    >
                      <input
                        className="mt-1"
                        type="radio"
                        name="payment-method"
                        value={option.id}
                        checked={method === option.id}
                        onChange={() => setMethod(option.id)}
                      />
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        <span className="block text-xs text-ink-muted">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-start gap-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  {r("consentBefore")}{" "}
                  <Link
                    href={`/${locale}/legal/terms`}
                    className="text-accent underline"
                    target="_blank"
                  >
                    {r("terms")}
                  </Link>{" "}
                  {r("consentBetween")}{" "}
                  <Link
                    href={`/${locale}/legal/privacy`}
                    className="text-accent underline"
                    target="_blank"
                  >
                    {r("privacy")}
                  </Link>
                  . {r("consentAfter")}
                </span>
              </label>
              {failure ? (
                <div
                  role="alert"
                  className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft p-4 text-sm"
                >
                  <p className="font-medium text-danger">{failure.message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={create}
                    disabled={processing}
                  >
                    {r("paymentRetry")}
                  </Button>
                </div>
              ) : null}
              {method === "crypto" ? (
                <CryptoPaymentOption
                  locale={locale}
                  payload={checkoutPayload()}
                  totalCents={quote?.totalCents ?? 0}
                  chains={chains}
                  disabled={!quote || !consent || processing}
                />
              ) : (
                <Button fullWidth disabled={!quote || !consent || processing} onClick={create}>
                  {processing
                    ? r("creatingOrder")
                    : `${t("placeOrder")} · ${money(quote?.totalCents ?? 0)}`}
                </Button>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
