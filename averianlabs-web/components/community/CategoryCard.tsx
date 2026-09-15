import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils/cn"
import { Beaker, BookOpen, Coffee, FileCheck, Flame, ShieldCheck, Snowflake } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  announcements: Flame,
  "research-discussion": BookOpen,
  "documentation-coa": FileCheck,
  "methods-analysis": Beaker,
  "storage-handling": Snowflake,
  "market-compliance": ShieldCheck,
  "off-topic-lounge": Coffee,
}

interface CategoryCardProps {
  slug: string
  nameKey: string
  descriptionKey: string
  threadCount: number
  href: string
  t: (key: string) => string
}

export function CategoryCard({
  slug,
  nameKey,
  descriptionKey,
  threadCount,
  href,
  t,
}: CategoryCardProps) {
  const Icon = ICONS[slug] ?? BookOpen

  return (
    <a
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-all",
        "hover:border-accent/40 hover:shadow-sm hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <Badge tone="muted" size="sm">
          {threadCount}
        </Badge>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink">{t(`${nameKey}` as never)}</h3>
        <p className="mt-1 text-sm text-ink-muted">{t(`${descriptionKey}` as never)}</p>
      </div>
    </a>
  )
}
