import Link from "next/link"

/**
 * The AverianLabs mark. Two pieces:
 *
 *   1. The monogram (an "A" inside a rounded square, drawn as inline SVG so
 *      it ships as a single request, scales sharply at any DPR, and inherits
 *      currentColor for theme variants).
 *   2. The wordmark + a small locale / division marker.
 *
 * The monogram is geometric, with a horizontal crossbar that doubles as the
 * "verifier check" — a subtle nod to the third-party-verified positioning
 * the brand leads with. Two colour variants: `accent` (the brand blue) for
 * the default, and a muted pair for footer / monochrome contexts.
 *
 * The whole thing wraps in a `<Link href={`/${locale}`}>` by default so the mark is
 * the home affordance. Set `asLink={false}` for non-clickable contexts.
 */
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
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        aria-hidden="true"
      >
        {/* Outer "A" — two strokes meeting at a sharp apex, with a slight
            outward flare at the base for stability. Drawn as a single
            closed path so it renders as one shape. */}
        <path
          d="M16 5 L27.5 27 L23 27 L20.4 21.7 L11.6 21.7 L9 27 L4.5 27 L16 5 Z M13.4 18.4 L18.6 18.4 L16 12.5 L13.4 18.4 Z"
          fill="currentColor"
        />
        {/* Verifier check — a small accent-coloured chevron over the A's
            crossbar. Reads as the "verified" mark of the brand. */}
        <path
          d="M22 9.5 L23.6 11.1 L25.4 9.3 L26.4 10.3 L23.6 13.1 L21 10.5 Z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}
