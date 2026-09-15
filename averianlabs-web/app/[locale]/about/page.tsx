import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { FlaskConical, Shield, Truck, Users } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("about", "/about")

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <Badge tone="accent" className="mb-4">
        About AverianLabs
      </Badge>
      <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Built by researchers, for researchers.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-ink-muted text-pretty">
        We started AverianLabs because the research peptide supply chain was opaque, slow, and
        inconsistent. Every batch should come with a public COA, every question should get a real
        answer, and every order should ship within 24 hours from an EU lab.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Shield, k: "100%", v: "COA on every batch" },
          { icon: FlaskConical, k: "98.9%", v: "Average HPLC purity" },
          { icon: Truck, k: "24h", v: "EU dispatch" },
          { icon: Users, k: "2,400+", v: "Verified institutions" },
        ].map(({ icon: Icon, k, v }) => (
          <div
            key={v}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-center shadow-sm"
          >
            <Icon className="mx-auto h-5 w-5 text-accent" />
            <div className="mt-3 font-display text-3xl font-semibold">{k}</div>
            <div className="mt-1 text-sm text-ink-muted">{v}</div>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-[var(--radius-xl)] bg-ink p-12 text-white">
        <h2 className="font-display text-3xl font-semibold">Our values</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            ["Transparency", "Every test result, every supplier, every price. Open by default."],
            ["Purity", "We sell fewer peptides so we can test every batch more thoroughly."],
            ["Speed", "Research doesn't wait. 24h dispatch from our EU hub in Helsinki."],
          ].map(([k, v]) => (
            <div key={k}>
              <h3 className="font-display text-lg font-semibold">{k}</h3>
              <p className="mt-2 text-sm text-white/70 text-pretty">{v}</p>
            </div>
          ))}
        </div>
      </section>
    </Container>
  )
}
