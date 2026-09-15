import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

const faqs = [
  {
    q: "Are your products for human consumption?",
    a: "No. All products sold by AverianLabs are intended strictly for laboratory research and in-vitro studies. They are not for human or veterinary use.",
  },
  {
    q: "How long does shipping take?",
    a: "We dispatch within 24 hours from our Helsinki warehouse. EU delivery is typically 1–3 business days via Posti or DHL.",
  },
  {
    q: "Do you provide Certificates of Analysis?",
    a: "Yes. Every batch ships with a batch-specific COA (HPLC purity, mass-spec confirmation) and endotoxin report. PDFs are available publicly at /coa.",
  },
  {
    q: "Which countries do you ship to?",
    a: "We ship to all EU countries plus UK, NO, CH, and TR. We do not ship to a small number of restricted jurisdictions (see terms).",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cards (Visa, MC, Amex), Apple Pay, Google Pay, iDEAL, Klarna, SEPA Direct Debit, and crypto (BTC, ETH, USDC) via Coinbase Commerce.",
  },
  {
    q: "Do you offer volume / B2B pricing?",
    a: "Yes — apply for our partner program. Universities, research labs, and resellers get up to 35% off and NET-14 invoicing.",
  },
]

export const generateMetadata = makePageMetadata("faq", "/faq")

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Container className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Frequently asked
      </h1>
      <p className="mt-3 max-w-xl text-ink-muted">Quick answers to the questions we get most.</p>

      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-b border-line">
            <AccordionTrigger className="py-5 text-left font-medium hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-ink-muted text-pretty">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  )
}
