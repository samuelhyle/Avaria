import { PartnerApplicationForm } from "@/components/partner/PartnerApplicationForm"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Building2, FileText, Headphones, Percent } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("partner", "/partner")

export default async function PartnerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <Badge tone="accent" className="mb-4">
            For institutions & resellers
          </Badge>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Partner program
          </h1>
          <p className="mt-4 text-ink-muted text-pretty">
            Volume pricing, NET-14 invoicing, and a dedicated account manager. Apply once, get
            approved within 48 hours.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: Percent,
                title: "Tiered pricing up to 35% off",
                body: "Automatic tier progression as your volume grows.",
              },
              {
                icon: FileText,
                title: "NET-14 invoicing",
                body: "Skip card processing on approved credit accounts.",
              },
              {
                icon: Headphones,
                title: "Dedicated account manager",
                body: "Real human, real lab background. Same day response.",
              },
              {
                icon: Building2,
                title: "White-label & co-branding",
                body: "Ship under your own brand with our COA & testing.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Apply</h2>
          <PartnerApplicationForm />
        </div>
      </div>
    </Container>
  )
}
