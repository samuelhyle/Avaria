import type { SVGProps } from "react"

/**
 * Averia brand glyph — a stylized double-helix inspired by the AverianLabs
 * wordmark. Used as the assistant avatar in the chat widget.
 */
export function HelixGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" {...props}>
      <title>Averia</title>
      <path
        d="M5 3c4 3 10 3 14 0M5 21c4-3 10-3 14 0M5 3c0 6 4 9 7 12M19 3c0 6-4 9-7 12M5 21c0-6 4-9 7-12M19 21c0-6-4-9-7-12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="3" r="1.4" fill="currentColor" />
      <circle cx="19" cy="3" r="1.4" fill="currentColor" />
      <circle cx="5" cy="21" r="1.4" fill="currentColor" />
      <circle cx="19" cy="21" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
