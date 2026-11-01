import { cn } from "@/lib/utils/cn"
import type { ReactNode } from "react"

/**
 * The head of a band: an optional eyebrow, the band's heading, an optional
 * introduction and an optional action.
 *
 * Four of the storefront's bands each wrote this same block out by hand —
 * the same class strings, four times, drifting apart. One definition means
 * every band on the page introduces itself the same way.
 */
export function SectionHeader({
  eyebrow,
  title,
  titleId,
  subtitle,
  action,
  className,
  headingClassName,
  subtitleClassName,
}: {
  /** The small uppercase label above the heading. */
  eyebrow?: string
  /** The band's heading. */
  title: string
  /** The id the band is labelled by. */
  titleId: string
  /** One or two sentences under the heading. */
  subtitle?: string
  /** A link or button beside the heading. */
  action?: ReactNode
  className?: string
  headingClassName?: string
  subtitleClassName?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={titleId} className={cn("h-section", eyebrow && "mt-2", headingClassName)}>
          {title}
        </h2>
        {subtitle ? (
          <p className={cn("mt-2 text-sm leading-relaxed text-ink-muted", subtitleClassName)}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  )
}
