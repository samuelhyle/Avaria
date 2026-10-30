import { NewsletterForm } from "@/components/home/NewsletterForm"
import { Container } from "@/components/ui/Container"
import { Mail } from "lucide-react"
import { getTranslations } from "next-intl/server"

/** Newsletter capture, framed as restock and lab-result updates. */
export async function StoreNewsletter() {
  const t = await getTranslations("home")

  return (
    <section aria-labelledby="newsletter-title" className="py-12 sm:py-16">
      <Container>
        <div className="grid items-center gap-6 rounded-[var(--radius-xl)] border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Mail aria-hidden className="h-5 w-5" />
            </span>
            <h2
              id="newsletter-title"
              className="mt-3.5 text-balance font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
            >
              {t("newsletterTitle")}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
              {t("newsletterSubtitle")}
            </p>
          </div>
          <NewsletterForm size="lg" className="w-full" />
        </div>
      </Container>
    </section>
  )
}
