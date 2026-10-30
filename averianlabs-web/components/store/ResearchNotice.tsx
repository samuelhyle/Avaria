"use client"

import { Container } from "@/components/ui/Container"
import { cn } from "@/lib/utils/cn"
import { FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

/**
 * The research-use restriction.
 *
 * It has to be visible wherever a purchase decision happens — the product
 * page, the cart, the checkout and the footer — but it must never compete
 * with the price or the buy button. The `inline` variant is a single quiet
 * line; the `block` variant is a bordered panel used on the product page.
 */
export function ResearchNotice({
  variant = "inline",
  locale,
  className,
}: {
  variant?: "inline" | "block"
  locale?: string
  className?: string
}) {
  const t = useTranslations("store")

  if (variant === "block") {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-line bg-surface-2/70 p-4",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          <FlaskConical aria-hidden className="h-4 w-4 text-accent" />
          {t("researchNotice.title")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          {t("researchNotice.body")}
        </p>
        {locale ? (
          <Link
            href={`/${locale}/legal/research-disclaimer`}
            className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-accent underline underline-offset-4 hover:no-underline"
          >
            {t("researchNotice.link")}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <p className={cn("fine-print flex items-start gap-1.5", className)}>
      <FlaskConical aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-ink-subtle" />
      <span>{t("researchNotice.short")}</span>
    </p>
  )
}

/**
 * Page-level fine print. Sits at the very bottom of the storefront chrome so
 * the restriction is present on every page without adding noise to the
 * shopping surfaces.
 */
export function ResearchFooterNote({ locale }: { locale?: string }) {
  const t = useTranslations("store")
  return (
    <div className="border-t border-line bg-surface-2">
      <Container>
        <div className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="fine-print max-w-3xl">
            <strong>{t("researchNotice.title")}.</strong> {t("researchNotice.body")}
          </p>
          {locale ? (
            <Link
              href={`/${locale}/legal/research-disclaimer`}
              className="fine-print shrink-0 font-medium text-accent underline underline-offset-4 hover:no-underline"
            >
              {t("researchNotice.link")}
            </Link>
          ) : null}
        </div>
      </Container>
    </div>
  )
}
