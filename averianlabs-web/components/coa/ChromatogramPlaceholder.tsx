import { getTranslations } from "next-intl/server"

interface ChromatogramPlaceholderProps {
  locale: string
}

export async function ChromatogramPlaceholder({ locale }: ChromatogramPlaceholderProps) {
  const t = await getTranslations({ locale, namespace: "coa" })

  return (
    <figure className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm">
      <svg
        viewBox="0 0 600 220"
        role="img"
        aria-label={t("chromatogramHeading")}
        className="block h-48 w-full"
      >
        <defs>
          <linearGradient id="chromFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <pattern id="chromGrid" width="60" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="600" height="220" fill="url(#chromGrid)" className="text-ink" />
        <path
          d="M0,180 L40,178 60,176 80,170 100,160 120,140 140,90 160,55 180,80 200,140 220,165 240,172 260,176 280,178 300,179 320,180 340,180 360,180 380,180 400,180 420,180 440,180 460,180 480,180 500,180 520,180 540,180 560,180 580,180 600,180"
          fill="url(#chromFill)"
          className="text-accent"
        />
        <path
          d="M0,180 L40,178 60,176 80,170 100,160 120,140 140,90 160,55 180,80 200,140 220,165 240,172 260,176 280,178 300,179 320,180 340,180 360,180 380,180 400,180 420,180 440,180 460,180 480,180 500,180 520,180 540,180 560,180 580,180 600,180"
          fill="none"
          className="text-accent"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="0"
          y1="180"
          x2="600"
          y2="180"
          className="text-ink-subtle"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeDasharray="4 4"
        />
      </svg>
      <figcaption className="border-t border-line/60 bg-surface-2 px-4 py-3 text-xs text-ink-muted">
        {t("chromatogramNote")}
      </figcaption>
    </figure>
  )
}
