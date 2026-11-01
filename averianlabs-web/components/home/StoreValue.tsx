import { Card } from "@/components/ui/Card"
import { Section } from "@/components/ui/Section"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { BadgeEuro, FlaskConical, Microscope, Truck } from "lucide-react"
import { getTranslations } from "next-intl/server"

/**
 * Straight answers before you pay — the four arguments a shopper weighs
 * against a cheaper, less transparent competitor.
 */
const ICONS = {
  price: BadgeEuro,
  purity: Microscope,
  delivery: Truck,
  support: FlaskConical,
} as const

export async function StoreValue({ className }: { className?: string }) {
  const t = await getTranslations("store.value")

  return (
    <Section aria-labelledby="value-title" className={className}>
      <SectionHeader title={t("title")} titleId="value-title" />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["price", "purity", "delivery", "support"] as const).map((key) => {
          const Icon = ICONS[key]
          return (
            <li key={key}>
              <Card className="h-full">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="h-card mt-3.5">{t(`items.${key}.title`)}</h3>
                <p className="card-copy">{t(`items.${key}.body`)}</p>
              </Card>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
