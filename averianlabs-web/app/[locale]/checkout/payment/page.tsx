import { makeCheckoutMetadata } from "@/lib/seo/metadata"
export const generateMetadata = makeCheckoutMetadata("payment")

import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default async function PaymentStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CheckoutForm step="payment" locale={locale} />
}
