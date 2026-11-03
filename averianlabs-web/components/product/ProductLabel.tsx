import { labelIsPending, labelRows } from "@/lib/products/label-record"
import type { Batch, Locale, Product, VialSize } from "@/lib/products/types"
import { useTranslations } from "next-intl"

/**
 * The label of a lot, at reading size.
 *
 * A vial label is 20 mm wide. In a shop it is unreadable, and the shopper
 * ends up trusting the picture rather than the record — so the label is
 * drawn here at the size it would be read at, carrying the numbers of the
 * lot in hand: its batch code, the purity that lot was measured at, its
 * molecular weight, the CAS number, how it is stored and when it expires.
 *
 * The artwork is a rendering of the label, not a photograph of one; the
 * numbers on it are the lot's own. A product with no released lot has no
 * record to print, and says so rather than leaving the reader to guess
 * whether the gaps are omissions or answers.
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

/** The vertical rhythm of the label: a row is this far below the one above it. */
const ROW = 46

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
  const t = useTranslations("product")
  const hue = product.hue ?? 184
  const code = labelCode(vial?.sku, product.slug)
  const rows = labelRows(product, vial, batch, locale)

  /**
   * A product with no released lot.
   *
   * The catalogue's reference entries are browsable but cannot establish
   * availability or quality, so they carry no batch and no specifications.
   * A label with nothing on it but a SKU would read as a record rather than
   * as the absence of one.
   */
  const pending = labelIsPending(rows, batch)

  const rowsTop = pending ? 306 : 236
  const rowsBottom = rowsTop + rows.length * ROW
  const barcode = rowsBottom + 34
  const height = barcode + 96

  return (
    <svg
      viewBox={`0 0 460 ${height}`}
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
      <rect x="10" y="10" width="440" height={height - 20} rx="14" fill="url(#label-paper)" />
      <rect
        x="10"
        y="10"
        width="440"
        height={height - 20}
        rx="14"
        stroke="#c9d4d9"
        strokeWidth="1.5"
      />

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

      {pending ? (
        <>
          <text
            x="34"
            y={rowsTop - 62}
            fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
            fontSize="12"
            letterSpacing="1.8"
            fill="#8aa0ac"
          >
            {t("mediaLabelPendingTitle").toUpperCase()}
          </text>
          <text
            x="34"
            y={rowsTop - 30}
            fontFamily="var(--font-sans), ui-sans-serif, sans-serif"
            fontSize="14"
            fill="#4d6273"
          >
            {t("mediaLabelPendingBody")}
          </text>
        </>
      ) : null}

      {/* the record */}
      {rows.map(({ label, value }, index) => {
        const y = rowsTop + index * ROW
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
              ? `M${44 + offset} ${barcode}h2.1v34h-2.1z`
              : `M${44 + offset} ${barcode}h1.1v34h-1.1z`,
          ).join("")}
          fill="#2f4b58"
        />
      </g>
      <text
        x="44"
        y={barcode + 56}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize="12"
        fill="#7d919c"
      >
        {vial?.sku ?? "—"}
      </text>
      <text
        x="426"
        y={barcode + 56}
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
