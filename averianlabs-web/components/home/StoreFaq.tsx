import { Container } from "@/components/ui/Container"
import { getTranslations } from "next-intl/server"

const ITEMS = ["1", "2", "3", "4"] as const

/** The questions a first-time buyer asks, answered up front. */
export async function StoreFaq() {
  const t = await getTranslations("store.faq")

  return (
    <section aria-labelledby="faq-title" className="py-12 sm:py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div>
            <h2
              id="faq-title"
              className="text-balance font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {t("title")}
            </h2>
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
      </Container>
    </section>
  )
}
