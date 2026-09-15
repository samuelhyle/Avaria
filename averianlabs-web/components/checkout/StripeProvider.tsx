"use client"

import { Elements } from "@stripe/react-stripe-js"
import { type Stripe, loadStripe } from "@stripe/stripe-js"
import { useTheme } from "next-themes"
import { type ReactNode, useMemo } from "react"

let stripePromise: Promise<Stripe | null> | null = null

function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) return null
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

interface StripeProviderProps {
  clientSecret?: string
  children: ReactNode
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  const stripe = useMemo(() => getStripe(), [])
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!stripe || !clientSecret) {
    return <>{children}</>
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: isDark ? "night" : "stripe",
          variables: {
            colorPrimary: "hsl(214, 95%, 52%)",
            ...(isDark
              ? {
                  colorBackground: "hsl(222, 26%, 9%)",
                  colorText: "hsl(210, 25%, 96%)",
                  colorDanger: "hsl(0, 70%, 65%)",
                }
              : {
                  colorBackground: "hsl(0, 0%, 100%)",
                  colorText: "hsl(220, 30%, 12%)",
                  colorDanger: "hsl(0, 75%, 55%)",
                }),
            fontFamily: "Geist, system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
    >
      {children}
    </Elements>
  )
}
