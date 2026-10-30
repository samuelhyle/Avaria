import { Container } from "@/components/ui/Container"
import { cn } from "@/lib/utils/cn"
import { BadgeCheck, FlaskConical, MessagesSquare, PackageCheck } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * The four promises that make a peptide shop trustworthy. Rendered as a
 * single strip on the home page and in a quieter form on the product page.
 */
const ITEMS = [
  { key: "batch", icon: BadgeCheck },
  { key: "coa", icon: FlaskConical },
  { key: "shipping", icon: PackageCheck },
  { key: "support", icon: MessagesSquare },
] as const

export function TrustBar({
  variant = "strip",
  className,
}: {
  variant?: "strip" | "grid"
  className?: string
}) {
  const t = useTranslations("store.trust")

  if (variant === "grid") {
    return (
      <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {ITEMS.map(({ key, icon: Icon }) => (
          <li key={key} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <h3 className="mt-3.5 text-sm font-semibold tracking-tight text-ink">
              {t(`${key}.title`)}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{t(`${key}.body`)}</p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className={cn("border-y border-line bg-surface", className)}>
      <Container>
        <ul className="grid gap-x-6 gap-y-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold tracking-tight text-ink">
                  {t(`${key}.title`)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {t(`${key}.body`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  )
}
