import { Card } from "@/components/ui/Card"
import { Section } from "@/components/ui/Section"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { getTranslations } from "next-intl/server"

const STEPS = ["1", "2", "3", "4"] as const

/**
 * How ordering works. Four numbered steps — the reassurance a first-time
 * buyer needs before they trust a shop with a payment form.
 */
export async function StoreHowItWorks() {
  const t = await getTranslations("store.how")

  return (
    <Section aria-labelledby="how-title" tone="raised">
      <SectionHeader
        title={t("title")}
        titleId="how-title"
        subtitle={t("subtitle")}
        className="max-w-2xl"
      />

      <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step}>
            <Card className="h-full bg-bg">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent"
              >
                {step}
              </span>
              <h3 className="h-card mt-3.5">{t(`steps.${step}.title`)}</h3>
              <p className="card-copy">{t(`steps.${step}.body`)}</p>
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  )
}
