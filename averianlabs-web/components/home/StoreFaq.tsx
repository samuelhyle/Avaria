import { Section } from "@/components/ui/Section"
import { buttonClasses } from "@/lib/ui/button-styles"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

const ITEMS = ["1", "2", "3", "4"] as const

/** The questions a first-time buyer asks, answered up front. */
export async function StoreFaq({ locale }: { locale: string }) {
  const t = await getTranslations("store.faq")

  return (
    <Section aria-labelledby="faq-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        {/* The heading column used to hold nothing but the heading, which left
            a column of empty page beside the answers. It now carries the
            introduction and a way to the rest of the questions, and it stays
            put while the answers scroll past it. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="faq-title" className="h-section">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">{t("subtitle")}</p>
          <Link
            href={`/${locale}/faq`}
            className={buttonClasses({ variant: "outline", size: "sm", className: "mt-5" })}
          >
            {t("cta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <dl className="divide-y divide-line border-y border-line">
          {ITEMS.map((item) => (
            <div key={item} className="py-5">
              <dt className="text-[15px] font-semibold tracking-tight text-ink">
                {t(`items.${item}.question`)}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">
                {t(`items.${item}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
