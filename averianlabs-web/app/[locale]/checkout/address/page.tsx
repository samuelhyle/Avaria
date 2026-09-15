import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default async function AddressStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CheckoutForm step="address" locale={locale} />
}
