"use client"

import { cn } from "@/lib/utils/cn"
import { ChevronDown, Star } from "lucide-react"
import { useState } from "react"

interface ProductFAQProps {
  items?: { q: string; a: string }[]
  pageUrl?: string
}

const DEFAULTS = [
  {
    q: "How is each batch verified?",
    a: "Every batch is third-party tested by an ISO 17025-certified lab (Eurofins Biolab, Synlab, or Biolab GmbH). HPLC purity, endotoxin levels, and mass-spec identity are confirmed before the batch is released. You can find the COA PDF for each batch in the Documents tab.",
  },
  {
    q: "What does the Certificate of Analysis include?",
    a: "The COA includes HPLC purity %, endotoxin (EU/mg), mass-spec confirmation, batch ID, manufacturing date, expiry, and the testing lab. Each batch has a unique code you can use to look up its specific COA in /coa.",
  },
  {
    q: "How should I store the vial after opening?",
    a: "For lyophilized peptides, store at -20 °C in a desiccated environment. After reconstitution, store at 2-8 °C and use within the timeframe indicated by your protocol. Each product's data sheet lists the specific storage temperature.",
  },
  {
    q: "Do you ship to my country?",
    a: "We currently ship to all EU member states plus Norway, Switzerland, and the UK. A handful of jurisdictions are restricted by local regulation — see the full list at checkout. Banned countries (per the EU restricted-substances directive) cannot be served.",
  },
  {
    q: "Can I get a VAT refund as a non-EU researcher?",
    a: "If you provide a valid non-EU VAT registration or research-institution ID, we'll zero-rate VAT on your order. Email the document to billing@averianlabs.eu after placing your order and we'll refund the VAT line.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Stripe (card, Apple Pay, Google Pay), PayPal, SEPA bank transfer for institutional orders over €1000, and Coinbase Commerce for BTC / ETH / USDC. EU consumer protection law applies to every payment method.",
  },
]

export function ProductFAQ({ items = DEFAULTS, pageUrl }: ProductFAQProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
    ...(pageUrl ? { url: pageUrl } : {}),
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <script
        type="application/ld+json"
        id="ld-faq"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="flex items-center gap-3 border-b border-line px-6 py-5">
        <Star className="h-4 w-4 text-warn" />
        <h2 className="font-display text-lg font-semibold">Frequently asked</h2>
      </header>
      <ul className="divide-y divide-line">
        {items.map((item, i) => {
          const open = openIdx === i
          return (
            <li key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface-2/60"
              >
                <span className="font-medium text-ink">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-ink-muted transition-transform",
                    open && "rotate-180 text-ink",
                  )}
                />
              </button>
              {open ? (
                <div className="px-6 pb-5 text-sm leading-relaxed text-ink-muted text-pretty">
                  {item.a}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
