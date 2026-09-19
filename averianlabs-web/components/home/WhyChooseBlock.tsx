import { BulkDiscountTierList } from "@/components/cart/BulkDiscount"
import { Container } from "@/components/ui/Container"
import { Reveal } from "@/components/ui/Reveal"
import { Award, FlaskConical, RefreshCw } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Homepage "Why choose AverianLabs" block — surfaces the three co-founder
 * promises (speed, lab-verified purity, 100% guarantee) plus a "Buy in bulk,
 * save more" panel with the tier table.
 *
 * Server component — the bulk tier list uses its own client subcomponent
 * for translations.
 */
export async function WhyChooseBlock({ locale }: { locale: string }) {
  const t = await getTranslations("home")

  const items = [
    {
      icon: RefreshCw,
      title: t("why1Title"),
      body: t("why1Body"),
      hue: 214,
    },
    {
      icon: FlaskConical,
      title: t("why2Title"),
      body: t("why2Body"),
      hue: 152,
    },
    {
      icon: Award,
      title: t("why3Title"),
      body: t("why3Body"),
      hue: 196,
    },
  ]

  return (
    <section className="border-y border-line bg-surface-2/40 py-20" aria-label="why-us">
      <Container>
        <Reveal>
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("whyHeading")}
            </h2>
            <p className="mt-3 text-ink-muted text-pretty">{t("whySub")}</p>
          </header>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.title}
                className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
                  style={{ "--cat-hue": item.hue } as React.CSSProperties}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-ink-muted text-pretty">{item.body}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-16 grid gap-6 rounded-[var(--radius-xl)] border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-surface p-8 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-accent-ink">
                {t("bulkHeading")}
              </p>
              <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("bulkHeading")}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-ink-muted text-pretty">{t("bulkSub")}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/shop`}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
                >
                  {t("bulkCtaShop")}
                </Link>
                <Link
                  href={`/${locale}/contact?topic=bulk`}
                  className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {t("bulkCtaContact")}
                </Link>
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface/80 p-5 shadow-sm backdrop-blur">
              <BulkDiscountTierList />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
