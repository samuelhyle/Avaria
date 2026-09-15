import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Award, Globe2, Microscope } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("quality", "/quality")

export default async function QualityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <Badge tone="ice" className="mb-4">
        Quality
      </Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Quality, end to end
      </h1>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: Award,
            title: "EU-GMP vendors",
            body: "We audit every peptide manufacturer annually, on-site, in person.",
          },
          {
            icon: Microscope,
            title: "ISO 17025 testing",
            body: "Independent labs in DE, FI, and NL re-test every batch before it ships.",
          },
          {
            icon: Globe2,
            title: "EU-wide logistics",
            body: "Helsinki → you, in 24h. Tracked, signed-for, ambient or cold-chain as needed.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-sm"
          >
            <Icon className="h-6 w-6 text-accent" />
            <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-muted text-pretty">{body}</p>
          </div>
        ))}
      </div>
    </Container>
  )
}
