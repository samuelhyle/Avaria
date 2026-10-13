import { makeCheckoutMetadata } from "@/lib/seo/metadata"
export const generateMetadata = makeCheckoutMetadata("shipping")

import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default async function ShippingStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CheckoutForm step="shipping" locale={locale} />
}
