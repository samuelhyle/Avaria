"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import { useCheckoutQuote } from "@/lib/checkout/use-quote"
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

export function CheckoutForm({ step, locale }: { step: Step; locale: string }) {
  const t = useTranslations("checkout")
  const r = useTranslations("research")
  const router = useRouter()
  const checkout = useCheckout()
  const items = useCart((state) => state.items)
  const { quote, rates, shippingMethodId, error, loading, refresh } = useCheckoutQuote(locale)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [consent, setConsent] = useState(false)
  const [payment, setPayment] = useState<{
    clientSecret: string
    confirmationUrl: string
    totalCents: number
    subtotalCents: number
    shippingCents: number
    vatCents: number
  } | null>(null)
  const money = (cents: number) => formatCurrency(cents, "EUR", locale)
  useEffect(() => setReady(true), [])
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
          if (["paid", "shipped", "delivered"].includes(data.status)) {
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
          const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...JSON.parse(saved.attemptFingerprint),
              requestKey: saved.attemptKey,
            }),
            signal: controller.signal,
          })
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
    const payload = {
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
      paymentMethod: "stripe",
      locale,
      researchConsent: true,
      expectedQuoteHash: quote.hash,
    }
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
        if (["attempt_expired", "quote_changed"].includes(data.code)) {
          checkout.clearAttempt()
          refresh()
        }
        throw new Error(data.code ?? "checkout_unavailable")
      }
      checkout.setPendingOrder(data.orderId, data.confirmationUrl)
      if (!data.clientSecret) {
        window.location.assign(data.confirmationUrl)
        return
      }
      setPayment(data)
    } catch {
      toast.error(r("checkoutFailed"))
    } finally {
      setProcessing(false)
    }
  }
  const displayedQuote = payment ?? quote
  return (
    <section className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold">{t(step)}</h2>
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
          {error ? <p role="alert">{r("paymentUnavailable")}</p> : null}
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
              {[
                [r("subtotal"), displayedQuote.subtotalCents],
                [r("shipping"), displayedQuote.shippingCents],
                [
                  r("vatIncluded", { rate: locale === "fi" ? "25,5 %" : "25.5%" }),
                  displayedQuote.vatCents,
                ],
                [r("total"), displayedQuote.totalCents],
              ].map(([label, cents]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt>{label}</dt>
                  <dd>{money(Number(cents))}</dd>
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
              <p className="text-sm">
                {r("paymentMethod")}: {r("card")}
              </p>
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
              <Button fullWidth disabled={!quote || !consent || processing} onClick={create}>
                {processing
                  ? r("creatingOrder")
                  : `${t("placeOrder")} · ${money(quote?.totalCents ?? 0)}`}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
