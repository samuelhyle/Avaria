import { FileCheck2, FlaskConical, Truck } from "lucide-react"
import { getTranslations } from "next-intl/server"

/**
 * Three short, evidence-safe trust statements that live at the bottom
 * of the brand block. Each line is a verifiable fact (HPLC purity
 * threshold, EU dispatch SLA, public COA on every batch) — not a
 * marketing claim. Pulled from `home.heroTrust*` translation keys.
 *
 * Server-rendered, no JS. The icons are larger than the previous
 * iteration so the strip reads at a glance; the line text uses
 * `font-medium` to balance the visual weight of the icon circles.
 */
export async function TrustStrip() {
  const t = await getTranslations("home")
  const lines = [
    { icon: FlaskConical, label: t("heroTrustHplc") },
    { icon: Truck, label: t("heroTrustDispatch") },
    { icon: FileCheck2, label: t("heroTrustCoa") },
  ]
  return (
    <ul
      aria-label={t("heroTrustLabel") ?? undefined}
      className="mt-2 flex flex-col gap-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:gap-6"
    >
      {lines.map((line) => {
        const Icon = line.icon
        return (
          <li
            key={line.label}
            className="group flex items-center gap-2.5 transition-transform duration-300 ease-[var(--ease-crystal)] hover:-translate-y-0.5"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink transition-transform duration-300 ease-[var(--ease-crystal)] group-hover:scale-110"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium text-ink">{line.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
