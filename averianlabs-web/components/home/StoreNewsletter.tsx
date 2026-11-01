import { NewsletterForm } from "@/components/home/NewsletterForm"
import { Section } from "@/components/ui/Section"
import { Mail } from "lucide-react"
import { getTranslations } from "next-intl/server"

/** Newsletter capture, framed as restock and lab-result updates. */
export async function StoreNewsletter() {
  const t = await getTranslations("home")

  return (
    <Section aria-labelledby="newsletter-title">
      <div className="grid items-center gap-6 rounded-[var(--radius-xl)] border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Mail aria-hidden className="h-5 w-5" />
          </span>
          <h2 id="newsletter-title" className="h-section mt-3.5 sm:text-2xl">
            {t("newsletterTitle")}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
            {t("newsletterSubtitle")}
          </p>
        </div>
        <NewsletterForm size="lg" className="w-full" />
      </div>
    </Section>
  )
}
