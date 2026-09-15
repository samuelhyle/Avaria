"use client"

import { Button } from "@/components/ui/Button"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface PaymentStepProps {
  orderId: string
  orderTotal: number
  locale: string
  onSuccess: () => void
  onError: (message: string) => void
}

export function PaymentStep({ orderId, orderTotal, locale, onSuccess, onError }: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      onError("Stripe is not loaded. Please refresh and try again.")
      return
    }

    setProcessing(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/checkout/confirm/${orderId}`,
      },
      redirect: "if_required",
    })

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.")
      setProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: {
            type: "tabs",
            defaultCollapsed: false,
          },
        }}
      />
      <Button type="submit" size="lg" fullWidth disabled={!stripe || processing}>
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing payment…
          </>
        ) : (
          <>Pay €{(orderTotal / 100).toFixed(2)}</>
        )}
      </Button>
    </form>
  )
}
