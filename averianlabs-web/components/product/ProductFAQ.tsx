"use client"

import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"

export function ProductFAQ({ pageUrl }: { pageUrl?: string }) {
  const t = useTranslations("research")
  const [open, setOpen] = useState<number | null>(0)
  const id = useId()
  const items = ["Use", "Documents", "Shipping", "Quote"].map((key) => ({
    q: t(`faq${key}Question`),
    a: t(`faq${key}Answer`),
  }))
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }
  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // `replaceAll`, not `replace`: a string pattern replaces only the
          // first match, so a second `<` in the payload would go unescaped.
          __html: JSON.stringify(schema).replaceAll("<", "\\u003c"),
        }}
      />
      <h2 className="p-6 font-display text-xl font-semibold">{t("faqTitle")}</h2>
      <ul className="divide-y divide-line">
        {items.map((item, index) => (
          <li key={item.q}>
            <button
              type="button"
              aria-expanded={open === index}
              aria-controls={`${id}-${index}`}
              onClick={() => setOpen(open === index ? null : index)}
              className="flex w-full justify-between gap-4 px-6 py-4 text-left font-medium"
            >
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <div
              id={`${id}-${index}`}
              hidden={open !== index}
              className="px-6 pb-5 text-sm leading-relaxed text-ink-muted"
            >
              {item.a}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
