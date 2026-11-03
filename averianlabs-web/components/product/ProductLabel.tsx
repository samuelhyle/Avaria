import type { Batch, VialSize } from "@/lib/products/types"
import type { Locale, Product } from "@/lib/products/types"
import { formatDate } from "@/lib/utils/format"

/**
 * The label of a lot, at reading size.
 *
 * A vial label is 20 mm wide. In a shop it is unreadable, and the shopper
 * ends up trusting the picture rather than the record — so the label is
 * drawn here at the size it would be read at, carrying the numbers of the
 * lot in hand: its batch code, the purity that lot was measured at, its
 * molecular weight, how it is stored and when it expires.
 *
 * The artwork is a rendering of the label, not a photograph of one; the
 * numbers on it are the lot's own.
 */

/** The printed code on the label: "BPC157-10" → "BPC". */
function labelCode(sku?: string, slug?: string): string {
  const source = sku?.split("-")[0]?.trim() ?? slug?.split("-")[0]?.trim() ?? "LAB"
  return (
    source
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase() || "LAB"
  )
}

/** Barcode bar offsets, in user units. */
const BARS = [
  0, 2.4, 4.8, 7.2, 9.6, 12, 14.4, 16.8, 19.2, 21.6, 24, 26.4, 28.8, 31.2, 33.6, 36, 38.4, 40.8,
  43.2, 45.6, 48, 50.4, 52.8, 55.2, 57.6, 60,
] as const

export function ProductLabel({
  product,
  vial,
  batch,
  locale,
  name,
}: {
  product: Product
  vial?: VialSize
  batch?: Batch
  locale: Locale
  name: string
}) {
  const hue = product.hue ?? 184
  const code = labelCode(vial?.sku, product.slug)
  const purity = batch?.hplcPurity ?? product.purityPercent
  const mw = product.molecularWeight
  const expires = batch?.expiresAt
  /**
   * The record on the label.
   *
   * A label carries what a buyer needs to identify the material without
   * opening the paperwork: the lot, the purity, the molar mass, the CAS
   * number, how it is stored and when it expires. A value the lot does not
   * have is left out rather than printed as a dash — a printed dash reads
   * as a measurement that was taken and came to nothing.
   */
  const rows = (
    [
      [batch ? "Lot" : "Batch", batch?.code ?? ""],
      ["Purity", purity ? `${purity} % HPLC` : ""],
      ["MW", mw ? `${mw} g/mol` : ""],
      ["CAS", product.casNumber ?? ""],
      ["Storage", product.storageTemp ?? ""],
      ["Expiry", expires ? formatDate(expires, locale) : ""],
      ["SKU", vial?.sku ?? ""],
    ] as Array<[string, string]>
  ).filter(([, value]) => value.length > 0)

  return (
    <svg
      viewBox="0 0 460 660"
      fill="none"
      role="img"
      aria-label={`Label of ${name}`}
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="label-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f6" />
        </linearGradient>
        <linearGradient id="label-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={`hsl(${hue} 55% 22%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 60% 30%)`} />
        </linearGradient>
      </defs>

      {/* the label itself */}
      <rect x="10" y="10" width="440" height="640" rx="14" fill="url(#label-paper)" />
      <rect x="10" y="10" width="440" height="600" rx="14" stroke="#c9d4d9" strokeWidth="1.5" />

      {/* brand band */}
      <path d="M10 24a14 14 0 0 1 14-14h412a14 14 0 0 1 14 14v66H10z" fill="url(#label-band)" />
      <text
        x="34"
        y="46"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="17"
        letterSpacing="4.5"
        fill="#ffffff"
        fillOpacity=".95"
      >
        AVERIANLABS
      </text>
      <text
        x="34"
        y="68"
        fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
        fontSize="12.5"
        letterSpacing="2.4"
        fill="#ffffff"
        fillOpacity=".7"
      >
        RESEARCH USE ONLY
      </text>

      {/* the code, as printed */}
      <text
        x="34"
        y="150"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="54"
        fontWeight="600"
        letterSpacing="2"
        fill="#16323f"
      >
        {code}
      </text>
      <text
        x="34"
        y="180"
        fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
        fontSize="17"
        fill="#4d6273"
      >
        {name.length > 34 ? `${name.slice(0, 33)}…` : name}
      </text>
      <line x1="34" y1="202" x2="426" y2="202" stroke="#d7e0e4" strokeWidth="1.5" />

      {/* the record */}
      {rows.map(([label, value], index) => {
        const y = 236 + index * 46
        return (
          <g key={label}>
            <text
              x="34"
              y={y}
              fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
              fontSize="12"
              letterSpacing="1.8"
              fill="#8aa0ac"
            >
              {label.toUpperCase()}
            </text>
            <text
              x="426"
              y={y}
              textAnchor="end"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontSize="19"
              fill="#16323f"
            >
              {value.length > 26 ? `${value.slice(0, 25)}…` : value}
            </text>
            <line x1="34" y1={y + 14} x2="426" y2={y + 14} stroke="#eef2f4" strokeWidth="1" />
          </g>
        )
      })}

      {/* barcode */}
      <g opacity=".6">
        <path
          d={BARS.map((offset, index) =>
            index % 3 === 0
              ? `M${44 + offset} 560h2.1v34h-2.1z`
              : `M${44 + offset} 560h1.1v34h-1.1z`,
          ).join("")}
          fill="#2f4b58"
        />
      </g>
      <text
        x="44"
        y="616"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="12"
        fill="#7d919c"
      >
        {vial?.sku ?? "—"}
      </text>
      <text
        x="426"
        y="616"
        textAnchor="end"
        fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
        fontSize="12"
        fill="#8aa0ac"
      >
        averianlabs.eu
      </text>
    </svg>
  )
}
