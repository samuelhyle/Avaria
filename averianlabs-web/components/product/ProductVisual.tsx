import type { Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"

/**
 * Deterministic product renderer.
 *
 * The storefront needs product imagery that reads like a photograph of the
 * packaged item, without shipping photography we do not have rights to.
 * Every visual is generated from the product record itself: the SKU prefix
 * becomes the label code, the recorded purity and molar mass are printed on
 * the label, and the category hue tints the glass and the stage behind it.
 *
 * The render is illustrative — it depicts the presentation format we supply,
 * not the contents of the vial.
 */

export type ProductVisualForm = "vial" | "bottle" | "pair"

export interface ProductVisualProps {
  product: Pick<Product, "slug" | "category" | "hue" | "purityPercent" | "molecularWeight">
  /** Primary SKU. Only the prefix is used, for the printed label code. */
  sku?: string
  form?: ProductVisualForm
  /** Rendered size of the artwork box. */
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_CLASS: Record<NonNullable<ProductVisualProps["size"]>, string> = {
  sm: "h-16 w-14",
  md: "h-40 w-32",
  lg: "h-full w-full",
}

/** Stable small integer used to vary the render slightly per product. */
function seedFrom(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 100000
  }
  return hash
}

/** "RETA-20" → "RETA". Used as the printed code on the label. */
function labelCode(sku?: string, slug?: string): string {
  const source = sku?.split("-")[0]?.trim() ?? slug?.split("-")[0]?.trim() ?? "LAB"
  return (
    source
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase() || "LAB"
  )
}

/** Crimp-cap ridge offsets, in user units. */
const CAP_RIDGES = [0, 6.4, 12.8, 19.2, 25.6, 32, 38.4, 44.8, 51.2] as const
/** Bottle-cap ridge offsets, in user units. */
const BOTTLE_RIDGES = [0, 6.2, 12.4, 18.6, 24.8, 31, 37.2, 43.4] as const
/** Barcode bar offsets, in user units. */
const BARCODE_BARS = [
  0, 2.1, 4.2, 6.3, 8.4, 10.5, 12.6, 14.7, 16.8, 18.9, 21, 23.1, 25.2, 27.3, 29.4, 31.5, 33.6, 35.7,
  37.8, 39.9, 42, 44.1,
] as const
/** Barcode bar offsets for the bottle label. */
const BOTTLE_BARS = [
  0, 2.3, 4.6, 6.9, 9.2, 11.5, 13.8, 16.1, 18.4, 20.7, 23, 25.3, 27.6, 29.9, 32.2, 34.5, 36.8, 39.1,
  41.4, 43.7, 46, 48.3, 50.6, 52.9, 55.2, 57.5,
] as const

/** Truncate a label line so it never overflows the printed area. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function ProductVisual({ product, sku, form, size = "md", className }: ProductVisualProps) {
  const hue = product.hue ?? 184
  const resolvedForm: ProductVisualForm =
    form ??
    (product.category === "supplies" ? "bottle" : product.category === "blend" ? "pair" : "vial")
  const code = labelCode(sku, product.slug)
  const seed = seedFrom(product.slug)
  const tilt = ((seed % 7) - 3) * 0.5
  const purity = product.purityPercent
  const mw = product.molecularWeight

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{ ["--cat-hue" as string]: String(hue) }}
      className={cn("relative", SIZE_CLASS[size], className)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 240 300"
        fill="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`glass-${product.slug}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".92" />
            <stop offset="14%" stopColor="#eef6f8" stopOpacity=".55" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity=".12" />
            <stop offset="72%" stopColor="#9fb4bd" stopOpacity=".22" />
            <stop offset="100%" stopColor="#7d949e" stopOpacity=".42" />
          </linearGradient>
          <linearGradient id={`liquid-${product.slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 68% 76%)`} stopOpacity=".95" />
            <stop offset="100%" stopColor={`hsl(${hue} 62% 58%)`} stopOpacity=".9" />
          </linearGradient>
          <linearGradient id={`cap-${product.slug}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8d2d7" />
            <stop offset="22%" stopColor="#f3f7f8" />
            <stop offset="48%" stopColor="#dbe4e8" />
            <stop offset="76%" stopColor="#aab8bf" />
            <stop offset="100%" stopColor="#8fa1a9" />
          </linearGradient>
          <linearGradient id={`label-${product.slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eef2f4" />
          </linearGradient>
          <radialGradient id={`glow-${product.slug}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${hue} 70% 82%)`} stopOpacity=".85" />
            <stop offset="100%" stopColor={`hsl(${hue} 70% 82%)`} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`shadow-${product.slug}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0b2a38" stopOpacity=".26" />
            <stop offset="70%" stopColor="#0b2a38" stopOpacity=".12" />
            <stop offset="100%" stopColor="#0b2a38" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`clip-${product.slug}`}>
            <rect x="86" y="62" width="68" height="206" rx="14" />
          </clipPath>
        </defs>

        <ellipse cx="120" cy="112" rx="104" ry="96" fill={`url(#glow-${product.slug})`} />

        {resolvedForm === "pair" ? (
          <g transform={`translate(-34 26) rotate(${tilt} 60 120)`}>
            <VialArt product={product} code={code} purity={purity} mw={mw} />
          </g>
        ) : null}

        {resolvedForm === "bottle" ? (
          <g>
            <BottleArt product={product} code={code} />
          </g>
        ) : null}

        {resolvedForm !== "bottle" ? (
          <g
            transform={
              resolvedForm === "pair"
                ? `translate(34 26) rotate(${-tilt} 60 120)`
                : `rotate(${tilt} 120 170)`
            }
          >
            <VialArt product={product} code={code} purity={purity} mw={mw} />
          </g>
        ) : null}
      </svg>
    </div>
  )
}

function VialArt({
  product,
  code,
  purity,
  mw,
}: {
  product: ProductVisualProps["product"]
  code: string
  purity?: number
  mw?: number
}) {
  const slug = product.slug
  const hue = product.hue ?? 184
  return (
    <>
      {/* contact shadow */}
      <ellipse cx="120" cy="276" rx="48" ry="9" fill={`url(#shadow-${slug})`} />

      {/* crimp cap */}
      <rect x="90" y="26" width="60" height="28" rx="5" fill={`url(#cap-${slug})`} />
      <path
        d={CAP_RIDGES.map((offset) => `M${94 + offset} 31v18`).join("")}
        stroke="#6f828b"
        strokeOpacity=".35"
        strokeWidth="1.4"
      />
      <rect x="90" y="26" width="60" height="6" rx="3" fill="#ffffff" fillOpacity=".65" />
      <rect x="97" y="53" width="46" height="12" rx="3" fill={`url(#cap-${slug})`} />

      {/* glass body */}
      <rect
        x="86"
        y="62"
        width="68"
        height="206"
        rx="14"
        fill={`url(#glass-${slug})`}
        stroke="#ffffff"
        strokeOpacity=".55"
        strokeWidth="1.5"
      />

      {/* contents */}
      <g clipPath={`url(#clip-${slug})`}>
        <rect x="88" y="132" width="64" height="134" fill={`url(#liquid-${slug})`} opacity=".85" />
        <ellipse cx="120" cy="132" rx="32" ry="5" fill={`hsl(${hue} 70% 88%)`} opacity=".9" />
        <rect x="88" y="132" width="64" height="134" fill="#ffffff" opacity=".08" />
      </g>

      {/* specular highlight */}
      <rect x="94" y="70" width="6" height="186" rx="3" fill="#ffffff" opacity=".62" />
      <rect x="146" y="76" width="3" height="150" rx="1.5" fill="#ffffff" opacity=".3" />

      {/* printed label */}
      <rect
        x="91"
        y="140"
        width="58"
        height="94"
        rx="4"
        fill={`url(#label-${slug})`}
        stroke="#c9d4d9"
        strokeWidth="1"
      />
      <rect x="91" y="140" width="58" height="16" rx="4" fill={`hsl(${hue} 55% 24%)`} />
      <rect x="91" y="150" width="58" height="6" fill={`hsl(${hue} 55% 24%)`} />
      <text
        x="120"
        y="151.5"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize="7"
        letterSpacing="1.4"
        fill="#ffffff"
        fillOpacity=".92"
      >
        AVERIANLABS
      </text>

      <text
        x="120"
        y="176"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize="16"
        fontWeight="600"
        letterSpacing="0.5"
        fill="#16323f"
      >
        {code}
      </text>
      <line x1="99" y1="184" x2="141" y2="184" stroke="#c9d4d9" strokeWidth="1" />
      <text
        x="120"
        y="196"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), ui-sans-serif, sans-serif"
        fontSize="8"
        fill="#5b7280"
      >
        {purity ? `HPLC ≥ ${purity}%` : "RESEARCH GRADE"}
      </text>
      {mw ? (
        <text
          x="120"
          y="207"
          textAnchor="middle"
          fontFamily="var(--font-geist-sans), ui-sans-serif, sans-serif"
          fontSize="7.5"
          fill="#7d919c"
        >
          {`${mw.toLocaleString("en-US")} g/mol`}
        </text>
      ) : null}

      {/* barcode strip */}
      <g opacity=".55">
        <path
          d={BARCODE_BARS.map((offset, index) =>
            index % 3 === 0 ? `M${97 + offset} 214h1.3v13h-1.3z` : `M${97 + offset} 214h.7v13h-.7z`,
          ).join("")}
          fill="#2f4b58"
        />
      </g>

      {/* glass base */}
      <rect x="86" y="258" width="68" height="10" rx="5" fill="#ffffff" fillOpacity=".45" />
    </>
  )
}

function BottleArt({
  product,
  code,
}: {
  product: ProductVisualProps["product"]
  code: string
}) {
  const slug = product.slug
  const hue = product.hue ?? 198
  return (
    <>
      <ellipse cx="120" cy="274" rx="54" ry="10" fill={`url(#shadow-${slug})`} />

      {/* screw cap */}
      <rect x="94" y="18" width="52" height="26" rx="4" fill={`url(#cap-${slug})`} />
      <path
        d={BOTTLE_RIDGES.map((offset) => `M${98 + offset} 22v18`).join("")}
        stroke="#6f828b"
        strokeOpacity=".35"
        strokeWidth="1.4"
      />
      <rect x="94" y="18" width="52" height="6" rx="3" fill="#ffffff" fillOpacity=".6" />

      {/* neck + shoulder */}
      <rect x="102" y="44" width="36" height="20" fill="#dbe6ea" fillOpacity=".8" />
      <path
        d="M102 64h36v10c0 4 26 10 26 30v140c0 8-6 14-14 14H90c-8 0-14-6-14-14V104c0-20 26-26 26-30z"
        fill={`url(#glass-${slug})`}
        stroke="#ffffff"
        strokeOpacity=".55"
        strokeWidth="1.5"
      />

      {/* liquid */}
      <path
        d="M80 120h80v128c0 8-6 14-14 14H94c-8 0-14-6-14-14z"
        fill={`url(#liquid-${slug})`}
        opacity=".82"
      />

      <rect x="86" y="72" width="5" height="170" rx="2.5" fill="#ffffff" opacity=".55" />

      {/* label */}
      <rect
        x="82"
        y="128"
        width="76"
        height="92"
        rx="4"
        fill={`url(#label-${slug})`}
        stroke="#c9d4d9"
        strokeWidth="1"
      />
      <rect x="82" y="128" width="76" height="16" rx="4" fill={`hsl(${hue} 55% 26%)`} />
      <rect x="82" y="138" width="76" height="6" fill={`hsl(${hue} 55% 26%)`} />
      <text
        x="120"
        y="139.5"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize="7"
        letterSpacing="1.4"
        fill="#ffffff"
        fillOpacity=".92"
      >
        AVERIANLABS
      </text>
      <text
        x="120"
        y="166"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize="15"
        fontWeight="600"
        fill="#16323f"
      >
        {clip(code, 6)}
      </text>
      <line x1="90" y1="174" x2="150" y2="174" stroke="#c9d4d9" strokeWidth="1" />
      <text
        x="120"
        y="187"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), ui-sans-serif, sans-serif"
        fontSize="8"
        fill="#5b7280"
      >
        STERILE SOLUTION
      </text>
      <text
        x="120"
        y="199"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), ui-sans-serif, sans-serif"
        fontSize="7.5"
        fill="#7d919c"
      >
        10 mL
      </text>
      <g opacity=".55">
        <path
          d={BOTTLE_BARS.map((offset, index) =>
            index % 3 === 0 ? `M${88 + offset} 205h1.4v12h-1.4z` : `M${88 + offset} 205h.8v12h-.8z`,
          ).join("")}
          fill="#2f4b58"
        />
      </g>
    </>
  )
}
