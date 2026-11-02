import { cn } from "@/lib/utils/cn"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /**
   * The heading level of the title.
   *
   * An empty state is still a section of the page, so its title belongs in
   * the document outline. A page that has no heading of its own can pass
   * `headingLevel={3}` to sit one step below the heading above it.
   */
  headingLevel?: 2 | 3 | 4
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4"
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-line bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <Heading className="font-display text-base font-semibold text-ink">{title}</Heading>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-muted text-pretty">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
