import { Container } from "@/components/ui/Container"
import { cn } from "@/lib/utils/cn"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

/**
 * A band of the page.
 *
 * The page's vertical rhythm was set by hand in every component — one band
 * used `py-12 sm:py-16`, the next `py-8 sm:py-12`, and none of them had a
 * step for large screens, so a wide viewport got the same air as a phone.
 * This is the one place the rhythm is decided.
 *
 *     <Section>                    the standard band
 *     <Section tone="sunken">      a band that sits a shade deeper
 *     <Section tone="raised">      a band that sits a shade above
 *     <Section tone="divided">     a band with a hairline above and below
 */
export function Section({
  children,
  className,
  tone = "plain",
  size = "default",
  containerClassName,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  /** The band's background. */
  tone?: "plain" | "sunken" | "raised" | "divided"
  /** The band's vertical rhythm. */
  size?: "default" | "tight" | "loose"
  /** Extra classes for the container inside the band. */
  containerClassName?: string
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        size === "default" && "section",
        size === "tight" && "section-tight",
        size === "loose" && "section-loose",
        tone === "sunken" && "bg-surface-2/60",
        tone === "raised" && "bg-surface",
        tone === "divided" && "border-y border-line bg-surface",
        className,
      )}
      {...props}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}
