import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default async function ShippingStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CheckoutForm step="shipping" locale={locale} />
}
