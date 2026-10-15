import { BRAND_MARK_PATH } from "@/lib/brand/mark"
import type { SVGProps } from "react"

/** Decorative when adjacent to the readable AverianLabs wordmark. */
export function BrandSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={BRAND_MARK_PATH} />
    </svg>
  )
}
