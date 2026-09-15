import { ContactForm } from "@/components/support/ContactForm"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Mail, MessageCircle } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("contact", "/contact")

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Contact</h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        Real scientists, real fast. We answer within 24 hours, weekdays.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">Email</p>
              <a
                href="mailto:hello@averianlabs.eu"
                className="text-sm text-ink-muted hover:text-ink"
              >
                hello@averianlabs.eu
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-1 h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">Lab inquiries</p>
              <a href="mailto:lab@averianlabs.eu" className="text-sm text-ink-muted hover:text-ink">
                lab@averianlabs.eu
              </a>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4 text-xs text-ink-muted">
            HQ: Helsinki, Finland · Warehouse: Vantaa · Lab partner: Eurofins Biolab (DE)
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-sm">
          <ContactForm />
        </div>
      </div>
    </Container>
  )
}
