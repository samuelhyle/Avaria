import { CheckoutSteps } from "@/components/checkout/CheckoutSteps"
import { ResearchNotice } from "@/components/store/ResearchNotice"
import { Container } from "@/components/ui/Container"
import { FileCheck2, Lock, Truck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const metadata = { robots: { index: false, follow: false } }

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
    <Container className="py-8 sm:py-10">
      {/* Trust band — placed inside the layout so it persists across steps. */}
      <ul className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-muted">
        <li className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-success" aria-hidden />
          <span>{t("secureCheckout")}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5 text-success" aria-hidden />
          <span>{t("documents")}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span>{t("finlandOnly")}</span>
        </li>
      </ul>

      <div className="mx-auto mt-5 max-w-3xl">
        <CheckoutSteps steps={steps} />
      </div>

      <div className="mt-8">{children}</div>

      <div className="mx-auto mt-8 max-w-3xl">
        <ResearchNotice />
      </div>
    </Container>
  )
}
