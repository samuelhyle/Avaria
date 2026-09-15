import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("legalTerms", "/legal/terms")

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container size="narrow" className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: 1 September 2026</p>

      <section className="prose prose-lg mt-10 max-w-none space-y-6 text-ink">
        <p>
          By accessing averianlabs.eu or any affiliated domain, you agree to these Terms of Service.
          All products are sold under a strict research-use-only license.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">1. Eligibility</h2>
        <p>
          You must be 18 years or older and a qualified researcher or institutional buyer to
          purchase from AverianLabs.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">2. Research use only</h2>
        <p className="rounded-[var(--radius)] border border-warn/30 bg-warn-soft/40 p-4 text-sm">
          All products are intended strictly for laboratory research and in-vitro studies. They are
          NOT intended for human consumption, diagnostic use, or therapeutic applications.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">3. Pricing & VAT</h2>
        <p>
          Prices are inclusive of EU VAT (OSS scheme). B2B customers with a valid VAT ID may
          purchase reverse-charge at checkout.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">4. Shipping</h2>
        <p>
          We dispatch within 24 hours from our Helsinki warehouse. Risk of loss passes to the buyer
          upon carrier scan.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">5. Returns</h2>
        <p>
          Due to the nature of research-grade peptides, opened or temperature-compromised vials are
          not returnable. Unopened product may be returned within 14 days for exchange or refund.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">6. Liability</h2>
        <p>
          AverianLabs' liability is limited to the purchase price of the product. We do not warrant
          fitness for any particular research application beyond the published Certificate of
          Analysis.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">7. Governing law</h2>
        <p>
          These terms are governed by Finnish law. Disputes are subject to the exclusive
          jurisdiction of the Helsinki District Court.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">8. Contact</h2>
        <p>Questions: legal@averianlabs.eu</p>
      </section>
    </Container>
  )
}
