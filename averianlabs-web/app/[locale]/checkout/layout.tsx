import { CheckoutSteps } from "@/components/checkout/CheckoutSteps"
import { Container } from "@/components/ui/Container"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "checkout" })

  const steps = [
    { id: "email", label: t("email") },
    { id: "address", label: t("address") },
    { id: "shipping", label: t("shipping") },
    { id: "payment", label: t("payment") },
  ]

  return (
    <Container className="py-12">
      <h1 className="sr-only">{t("title")}</h1>
      <CheckoutSteps steps={steps} />
      <div className="mt-10">{children}</div>
    </Container>
  )
}
