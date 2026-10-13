"use client"

import { Button } from "@/components/ui/Button"
import { formatCurrency } from "@/lib/utils/format"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useTranslations } from "next-intl"
import { useState } from "react"

export function PaymentStep({ orderTotal, locale, confirmationUrl, onSuccess, onError }: { orderTotal: number; locale: string; confirmationUrl: string; onSuccess: () => void; onError: (message: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const t = useTranslations("research")
  const [processing, setProcessing] = useState(false)
  return <form className="space-y-6" onSubmit={async (event) => {
    event.preventDefault()
    if (!stripe || !elements || processing) return
    setProcessing(true)
    try {
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: confirmationUrl }, redirect: "if_required" })
      if (result.error) onError(result.error.message ?? t("checkoutFailed"))
      else if (["succeeded", "processing"].includes(result.paymentIntent?.status ?? "")) onSuccess()
      else onError(t("checkoutFailed"))
    } catch { onError(t("checkoutFailed")) } finally { setProcessing(false) }
  }}><PaymentElement options={{ layout: { type: "tabs", defaultCollapsed: false } }} /><Button type="submit" fullWidth size="lg" disabled={!stripe || !elements || processing}>{processing ? t("processingPayment") : `${t("card")} · ${formatCurrency(orderTotal, "EUR", locale)}`}</Button></form>
}
