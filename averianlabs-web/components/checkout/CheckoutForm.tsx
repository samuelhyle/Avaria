"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useCart } from "@/lib/cart/store"
import { useCheckout } from "@/lib/checkout/store"
import { VAT_LABEL, computeOrderTotals } from "@/lib/pricing"
import { type ShippingRate, fallbackShippingRates } from "@/lib/shipping"
import { formatCurrency } from "@/lib/utils/format"
import {
  ArrowRight,
  Bitcoin,
  Building2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  Truck,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// Stripe.js is only needed on the final step — keep it out of the earlier
// checkout bundles entirely.
const PaymentStep = dynamic(() => import("./PaymentStep").then((m) => m.PaymentStep), {
  ssr: false,
})
const StripeProvider = dynamic(() => import("./StripeProvider").then((m) => m.StripeProvider), {
  ssr: false,
})

type Step = "email" | "address" | "shipping" | "payment"
type PaymentMethod = "stripe" | "coinbase"

interface CheckoutFormProps {
  step: Step
  locale: string
}

export function CheckoutForm({ step, locale: localeProp }: CheckoutFormProps) {
  const t = useTranslations("checkout")
  const localeFromHook = useLocale()
  const locale = localeProp ?? localeFromHook
  const router = useRouter()
  const items = useCart((s) => s.items)
  const subtotal = useCart((s) => s.items.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0))
  const clearCart = useCart((s) => s.clear)

  const checkout = useCheckout()
  const [processing, setProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [consented, setConsented] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe")
  const [rates, setRates] = useState<ShippingRate[]>([])

  const COUNTRIES = [
    { code: "FI", name: t("countryFinland") },
    { code: "SE", name: t("countrySweden") },
    { code: "EE", name: t("countryEstonia") },
    { code: "DE", name: t("countryGermany") },
    { code: "NL", name: t("countryNetherlands") },
    { code: "FR", name: t("countryFrance") },
    { code: "ES", name: t("countrySpain") },
    { code: "IT", name: t("countryItaly") },
    { code: "DK", name: t("countryDenmark") },
    { code: "PL", name: t("countryPoland") },
  ]

  const selectedRate = rates.find((r) => r.id === checkout.shippingMethod) ?? rates[0] ?? undefined
  const shippingCents = selectedRate?.priceCents ?? 0
  const { vatCents, totalCents: orderTotal } = computeOrderTotals(subtotal, shippingCents)

  // The shipping-fetch effect reads `rates`, `checkout.shippingMethod`, and
  // `checkout.setShippingMethod` from closure. Keep refs to those so the
  // effect only re-runs when the address actually changes (not on every
  // shipping selection tick).
  const ratesRef = useRef(rates)
  ratesRef.current = rates
  const shippingMethodRef = useRef(checkout.shippingMethod)
  shippingMethodRef.current = checkout.shippingMethod
  const setShippingMethodRef = useRef(checkout.setShippingMethod)
  setShippingMethodRef.current = checkout.setShippingMethod

  // Fetch server shipping rates once the address is known.
  useEffect(() => {
    if (step !== "shipping" && step !== "payment") return
    const country = checkout.country
    let cancelled = false

    const fallback = () => {
      if (!cancelled && ratesRef.current.length === 0) {
        const local = fallbackShippingRates({ country })
        setRates(local)
        if (!shippingMethodRef.current && local[0]) setShippingMethodRef.current(local[0].id)
      }
    }

    fetch("/api/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country,
        postal: checkout.postal,
        city: checkout.city,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("rates unavailable")
        const data = (await res.json()) as { rates?: ShippingRate[] }
        if (cancelled) return
        const next = data.rates ?? []
        if (next.length === 0) {
          fallback()
          return
        }
        setRates(next)
        if (!next.some((r) => r.id === shippingMethodRef.current)) {
          const first = next[0]
          if (first) setShippingMethodRef.current(first.id)
        }
      })
      .catch(fallback)

    return () => {
      cancelled = true
    }
  }, [step, checkout.country, checkout.postal, checkout.city])

  const next = () => {
    const order = ["email", "address", "shipping", "payment"] as const
    const idx = order.indexOf(step)
    const target = order[idx + 1]
    if (target) router.push(`/${locale}/checkout/${target}`)
  }

  const shippingAddress = {
    name: `${checkout.firstName} ${checkout.lastName}`.trim() || undefined,
    line1: checkout.street,
    city: checkout.city,
    postal: checkout.postal,
    country: checkout.country,
  }

  const createOrderAndIntent = async () => {
    if (items.length === 0) {
      toast.error(t("yourCartEmpty"))
      return
    }
    if (!checkout.email) {
      toast.error(t("completeEmailFirst"))
      return
    }
    if (!selectedRate) {
      toast.error(t("chooseShipping"))
      return
    }

    setProcessing(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkout.email,
          items: items.map((i) => ({ sku: i.sku, qty: i.qty })),
          shippingMethodId: selectedRate.id,
          shippingAddress,
          billingAddress: checkout.b2b ? shippingAddress : undefined,
          vatId: checkout.b2b && checkout.vatId ? checkout.vatId : undefined,
          paymentMethod,
          locale,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("checkoutFailed"))

      if (paymentMethod === "coinbase") {
        if (!data.redirectUrl) throw new Error(t("cryptoUnavailable"))
        window.location.assign(data.redirectUrl)
        return
      }

      setOrderId(data.orderId)
      setClientSecret(data.clientSecret)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"))
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCart()
    checkout.reset()
    if (orderId) {
      router.push(`/${locale}/checkout/confirm/${orderId}`)
    }
    toast.success(t("paymentSuccess"))
  }

  if (step === "email") {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">{t("email")}</h2>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <Input
            type="email"
            required
            autoComplete="email"
            value={checkout.email}
            onChange={(e) => checkout.setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            label={t("email")}
          />
          <Button type="submit" size="lg" fullWidth>
            {t("guest")} <ArrowRight className="h-4 w-4" />
          </Button>
          <Link
            href={`/${locale}/account`}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <Lock className="h-4 w-4" />
            {t("account")}
          </Link>
        </form>
      </div>
    )
  }

  if (step === "address") {
    return (
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Building2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">{t("address")}</h2>

        <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checkout.b2b}
            onChange={(e) => checkout.setB2b(e.target.checked)}
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>{t("b2bToggle")}</span>
        </label>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("firstName")}
              autoComplete="given-name"
              required
              value={checkout.firstName}
              onChange={(e) => checkout.setAddress({ firstName: e.target.value })}
            />
            <Input
              label={t("lastName")}
              autoComplete="family-name"
              required
              value={checkout.lastName}
              onChange={(e) => checkout.setAddress({ lastName: e.target.value })}
            />
          </div>
          <Input
            label={t("street")}
            autoComplete="street-address"
            required
            value={checkout.street}
            onChange={(e) => checkout.setAddress({ street: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label={t("postal")}
              autoComplete="postal-code"
              required
              value={checkout.postal}
              onChange={(e) => checkout.setAddress({ postal: e.target.value })}
            />
            <Input
              label={t("city")}
              autoComplete="address-level2"
              required
              className="sm:col-span-2"
              value={checkout.city}
              onChange={(e) => checkout.setAddress({ city: e.target.value })}
            />
          </div>
          <div>
            <label
              htmlFor="checkout-country"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              {t("country")}
            </label>
            <select
              id="checkout-country"
              required
              value={checkout.country}
              onChange={(e) => checkout.setAddress({ country: e.target.value })}
              className="h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {checkout.b2b ? (
            <div>
              <Input
                placeholder={t("vatPlaceholder")}
                label={t("vatId")}
                autoComplete="off"
                value={checkout.vatId}
                onChange={(e) => checkout.setVatId(e.target.value)}
              />
            </div>
          ) : null}

          <Button type="submit" size="lg" fullWidth>
            {t("continueToShipping")} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    )
  }

  if (step === "shipping") {
    return (
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Truck className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">{t("shipping")}</h2>
        <fieldset className="mt-6">
          <legend className="sr-only">{t("shipping")}</legend>
          <div className="space-y-2">
            {rates.length === 0 ? (
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingShipping")}
              </div>
            ) : (
              rates.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center justify-between rounded-[var(--radius)] border border-line bg-surface p-4 hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={checkout.shippingMethod === opt.id}
                      onChange={() => checkout.setShippingMethod(opt.id)}
                      className="h-4 w-4 text-accent focus:ring-accent"
                    />
                    <div>
                      <p className="font-medium">
                        {opt.carrier} {opt.service}
                      </p>
                      <p className="text-xs text-ink-muted">{opt.eta}</p>
                    </div>
                  </div>
                  <span className="font-display">
                    {formatCurrency(opt.priceCents, "EUR", locale)}
                  </span>
                </label>
              ))
            )}
          </div>
        </fieldset>
        <Button size="lg" fullWidth className="mt-6" onClick={next} disabled={!selectedRate}>
          {t("continueToPayment")} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (step === "payment") {
    return (
      <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <CreditCard className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">{t("payment")}</h2>

        {/* Order summary */}
        <div className="mt-6 rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-sm">
          <p className="font-medium text-ink">{t("orderSummary")}</p>
          <div className="mt-2 space-y-1 text-ink-muted">
            <div className="flex justify-between">
              <span>{t("subtotalItems", { count: items.length })}</span>
              <span>{formatCurrency(subtotal, "EUR", locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {t("shipping")}
                {selectedRate ? ` (${selectedRate.carrier} ${selectedRate.service})` : ""}
              </span>
              <span>{formatCurrency(shippingCents, "EUR", locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {t("vat")} ({VAT_LABEL})
              </span>
              <span>{formatCurrency(vatCents, "EUR", locale)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
              <span>{t("total")}</span>
              <span>{formatCurrency(orderTotal, "EUR", locale)}</span>
            </div>
          </div>
        </div>

        {!clientSecret ? (
          <div className="mt-6 space-y-4">
            {/* Payment method */}
            <fieldset>
              <legend className="sr-only">{t("paymentMethodLabel")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "stripe"}
                    onChange={() => setPaymentMethod("stripe")}
                    className="h-4 w-4 text-accent focus:ring-accent"
                  />
                  <CreditCard className="h-4 w-4" />
                  <span>{t("cardSepa")}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "coinbase"}
                    onChange={() => setPaymentMethod("coinbase")}
                    className="h-4 w-4 text-accent focus:ring-accent"
                  />
                  <Bitcoin className="h-4 w-4" />
                  <span>{t("crypto")}</span>
                </label>
              </div>
            </fieldset>

            {/* Consent checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-line bg-surface-2/40 p-4 text-sm">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <span className="text-xs leading-relaxed text-ink-muted">
                {t("consentTerms")}{" "}
                <Link
                  href={`/${locale}/legal/terms`}
                  className="text-accent hover:underline"
                  target="_blank"
                >
                  {t("consentTermsLink")}
                </Link>{" "}
                {t("consentAnd")}{" "}
                <Link
                  href={`/${locale}/legal/privacy`}
                  className="text-accent hover:underline"
                  target="_blank"
                >
                  {t("consentPrivacy")}
                </Link>
                . {t("consentResearch")}
              </span>
            </label>

            <Button
              size="lg"
              fullWidth
              onClick={createOrderAndIntent}
              disabled={processing || !consented || !selectedRate}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creatingOrder")}
                </>
              ) : (
                <>
                  {t("placeOrder")} · {formatCurrency(orderTotal, "EUR", locale)}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <StripeProvider clientSecret={clientSecret}>
              <PaymentStep
                orderId={orderId ?? ""}
                orderTotal={orderTotal}
                locale={locale}
                onSuccess={handlePaymentSuccess}
                onError={(msg) => toast.error(msg)}
              />
            </StripeProvider>
          </div>
        )}
      </div>
    )
  }

  return null
}
