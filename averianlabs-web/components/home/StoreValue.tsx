import { Container } from "@/components/ui/Container"
import { cn } from "@/lib/utils/cn"
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
    <section aria-labelledby="value-title" className={cn("py-12 sm:py-16", className)}>
      <Container>
        <h2
          id="value-title"
          className="text-balance font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {t("title")}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["price", "purity", "delivery", "support"] as const).map((key) => {
            const Icon = ICONS[key]
            return (
              <li
                key={key}
                className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-3.5 text-sm font-semibold tracking-tight text-ink">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  {t(`items.${key}.body`)}
                </p>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
