import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Beaker, FileCheck2, Microscope, ShieldCheck, TestTube2 } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("labTests", "/lab-tests")

export default async function LabTestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <header className="mb-12 max-w-3xl">
        <Badge tone="ice" className="mb-4">
          <Microscope className="h-3 w-3" /> ISO 17025 lab partner
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          How we test every batch
        </h1>
        <p className="mt-4 text-ink-muted text-pretty">
          Independent verification at every step. No batch ships without a complete analytical
          fingerprint.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Beaker,
            title: "HPLC purity",
            body: "Reversed-phase HPLC quantifies peptide content against a certified reference standard. Acceptance: ≥ 98%.",
          },
          {
            icon: ShieldCheck,
            title: "Endotoxin (LAL)",
            body: "Kinetic chromogenic LAL per USP <85>. Acceptance: < 5 EU/mg.",
          },
          {
            icon: Microscope,
            title: "Mass spectrometry",
            body: "ESI-MS confirms molecular weight matches theoretical within ±1 Da.",
          },
          {
            icon: FileCheck2,
            title: "Sterility & mycoplasma",
            body: "14-day sterility (USP <71>) and mycoplasma qPCR on every lot.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm"
          >
            <Icon className="h-5 w-5 text-accent" />
            <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-muted text-pretty">{body}</p>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-[var(--radius-xl)] bg-surface-2 p-8">
        <h2 className="font-display text-2xl font-semibold">Test sequence</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Receipt", "Raw peptide enters quarantine"],
            ["02", "Identity", "ESI-MS confirms sequence"],
            ["03", "Purity", "HPLC at 214 nm + 220 nm"],
            ["04", "Safety", "Endotoxin, sterility, mycoplasma"],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-[var(--radius)] border border-line bg-surface p-4">
              <div className="font-mono text-xs text-accent">{n}</div>
              <div className="mt-1 font-display font-semibold">{title}</div>
              <div className="mt-1 text-xs text-ink-muted">{body}</div>
            </li>
          ))}
        </ol>
      </section>
    </Container>
  )
}
