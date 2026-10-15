import Image from "next/image"

export interface ScientificFigureRecord {
  alt?: string
  caption?: string
  credit?: string
  rights?: string
  sourceUrl?: string
  decorative?: boolean
  reviewed?: boolean
  asset?: { url?: string; metadata?: { dimensions?: { width?: number; height?: number } } }
}

export function isPublishableFigure(figure: ScientificFigureRecord): boolean {
  if (
    figure.reviewed !== true ||
    !figure.asset?.url ||
    !figure.caption?.trim() ||
    !figure.credit?.trim() ||
    !figure.rights?.trim()
  )
    return false
  if (!figure.decorative && !figure.alt?.trim()) return false
  try {
    return new URL(figure.sourceUrl ?? "").protocol === "https:"
  } catch {
    return false
  }
}

/** Scientific figures retain their complete frame, labels, caption and source. */
export function ScientificFigure({
  figure,
  locale = "en",
}: { figure: ScientificFigureRecord; locale?: string }) {
  if (!isPublishableFigure(figure)) return null
  const fi = locale === "fi"
  const dimensions = figure.asset?.metadata?.dimensions
  const validDimension = (value: number | undefined, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback
  const width = validDimension(dimensions?.width, 1200)
  const height = validDimension(dimensions?.height, 800)
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-line bg-surface">
      <Image
        src={figure.asset?.url ?? ""}
        alt={figure.decorative ? "" : (figure.alt ?? "")}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 768px, 100vw"
        className="h-auto max-h-[48rem] w-full object-contain"
      />
      <figcaption className="space-y-2 border-t border-line p-4 text-sm leading-relaxed text-ink-muted">
        <p className="text-ink">{figure.caption}</p>
        <p>
          {figure.credit} · {figure.rights}
        </p>
        <a
          href={figure.sourceUrl}
          className="break-words text-accent underline underline-offset-2"
          rel="noreferrer"
        >
          {fi ? "Alkuperäinen lähde" : "Original source"}
        </a>
      </figcaption>
    </figure>
  )
}
