import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default async function EmailStep({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CheckoutForm step="email" locale={locale} />
}
