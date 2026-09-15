import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata(
  "legalResearchDisclaimer",
  "/legal/research-disclaimer",
)

export default async function DisclaimerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container size="narrow" className="py-16">
      <Badge tone="warn" className="mb-4">
        Research use only
      </Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Research disclaimer</h1>

      <section className="prose prose-lg mt-10 max-w-none space-y-6 text-ink">
        <p className="rounded-[var(--radius)] border border-warn/30 bg-warn-soft/40 p-4 text-sm font-medium">
          All products sold by AverianLabs Oy are intended strictly for laboratory research and
          in-vitro studies.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Not for human consumption</h2>
        <p>
          The products listed on averianlabs.eu are not intended for human or veterinary use,
          consumption, administration, or application to the body in any form.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">No medical claims</h2>
        <p>
          Information provided on this website is for research and educational purposes only. It is
          not intended as medical advice, diagnosis, or treatment recommendation. AverianLabs Oy
          does not endorse, recommend, or support the off-label use of any product.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Buyer's responsibility</h2>
        <p>
          By purchasing from AverianLabs, you confirm that you are a qualified researcher or
          institutional buyer, and that the products will be used solely for legitimate laboratory
          research in compliance with all applicable local, national, and international laws and
          regulations.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Compliance</h2>
        <p>
          It is the buyer's responsibility to ensure that the import, possession, and use of
          research peptides complies with all applicable regulations in their jurisdiction.
          AverianLabs Oy reserves the right to refuse service to any buyer or jurisdiction at its
          sole discretion.
        </p>
      </section>
    </Container>
  )
}
