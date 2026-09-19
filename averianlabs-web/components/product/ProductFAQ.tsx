"use client"

import { cn } from "@/lib/utils/cn"
import { ChevronDown, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

interface ProductFAQProps {
  items?: { q: string; a: string }[]
  pageUrl?: string
}

export function ProductFAQ({ items: itemsProp, pageUrl }: ProductFAQProps) {
  const t = useTranslations("product")
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const items =
    itemsProp ??
    Array.from({ length: 6 }, (_, i) => ({
      q: t(`faq${i + 1}Q`),
      a: t(`faq${i + 1}A`),
    }))

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
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw <script>; content is JSON.stringify of values we control.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="flex items-center gap-3 border-b border-line px-6 py-5">
        <Star className="h-4 w-4 text-warn" />
        <h2 className="font-display text-lg font-semibold">{t("faqHeading")}</h2>
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
