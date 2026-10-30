import { Container } from "@/components/ui/Container"
import { getTranslations } from "next-intl/server"

const STEPS = ["1", "2", "3", "4"] as const

/**
 * How ordering works. Four numbered steps — the reassurance a first-time
 * buyer needs before they trust a shop with a payment form.
 */
export async function StoreHowItWorks() {
  const t = await getTranslations("store.how")

  return (
    <section aria-labelledby="how-title" className="border-y border-line bg-surface py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl">
          <h2
            id="how-title"
            className="text-balance font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("subtitle")}</p>
        </div>

        <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li
              key={step}
              className="relative rounded-[var(--radius-lg)] border border-line bg-bg p-5"
            >
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent"
              >
                {step}
              </span>
              <h3 className="mt-3.5 text-sm font-semibold tracking-tight text-ink">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
