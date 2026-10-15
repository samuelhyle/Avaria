import { BrandSymbol } from "@/components/media/BrandSymbol"
import Link from "next/link"

/** Legacy home wrapper, rendered with the canonical brand symbol. */
export function BrandMark({ locale, asLink = true }: { locale: string; asLink?: boolean }) {
  const inner = (
    <span className="inline-flex items-center gap-3">
      <Monogram />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-2xl font-semibold tracking-tight text-ink">
          AverianLabs
        </span>
        <span className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-subtle">
          {locale.toUpperCase()} · {locale === "fi" ? "tutkimus" : "research"}
        </span>
      </span>
    </span>
  )
  if (!asLink) return inner
  return (
    <Link
      href={`/${locale}`}
      className="group inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label={locale === "fi" ? "AverianLabs, etusivu" : "AverianLabs, home"}
    >
      {inner}
    </Link>
  )
}

function Monogram() {
  return <BrandSymbol className="h-14 w-14 shrink-0" />
}
