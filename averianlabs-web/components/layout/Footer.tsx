"use client"

import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import type { FooterContent } from "@/lib/layout/footer-content"
import { cn } from "@/lib/utils/cn"
import { ChevronDown, CreditCard, FlaskConical } from "lucide-react"
import Link from "next/link"
import { CookieSettings } from "./CookieSettings"

export function Footer({ content }: { content: FooterContent }) {
  const { locale, cols } = content
  const links = (col: (typeof cols)[number]) => (
    <ul className="mt-3 space-y-0.5">
      {col.links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            prefetch={false}
            className="inline-flex min-h-9 max-w-full items-center break-words hyphens-auto text-sm text-ink-muted transition-colors hover:text-accent"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <footer className="platform-bottom-safe mt-16 border-t border-line bg-surface">
      <Container>
        <div className="grid gap-8 py-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          <div>
            <Logo href={`/${locale}`} size="md" />
            <p className="mt-3.5 max-w-sm text-sm leading-relaxed text-ink-muted">
              {content.tagline}
            </p>
            <Link
              href={`/${locale}/lab-tests`}
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent hover:underline underline-offset-4"
            >
              {content.testResultsLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {cols.map((col) => (
              <div key={col.title} className="min-w-0">
                <div className="hidden sm:block">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {col.title}
                  </h3>
                  {links(col)}
                </div>
                <details className="group border-b border-line sm:hidden">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {col.title}
                    <ChevronDown
                      aria-hidden
                      className="h-4 w-4 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="pb-3">{links(col)}</div>
                </details>
              </div>
            ))}
          </div>
        </div>

        {/* Research-use restriction — always visible, never in the way. */}
        <div className="flex items-start gap-3 border-t border-line py-5">
          <FlaskConical aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="fine-print max-w-4xl">{content.researchUse}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            {content.paymentsLabel ? (
              <span className="flex items-center gap-1.5">
                <CreditCard aria-hidden className="h-4 w-4" />
                {content.paymentsLabel}
              </span>
            ) : null}
            {content.paymentsLabel ? (
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
            ) : null}
            <span>Visa · Mastercard · EUR · USDC</span>
          </div>
          <CookieSettings />
        </div>

        <div
          className={cn(
            "grid gap-3 border-t border-line py-6 text-xs text-ink-muted",
            "sm:grid-cols-[1fr_2fr]",
          )}
        >
          <p>{content.rightsReserved}</p>
          <div className="space-y-1.5">
            {content.businessIdentity ? (
              <p className="font-mono">{content.businessIdentity}</p>
            ) : (
              <p>{content.legalPending}</p>
            )}
            <address className="not-italic">
              <a
                href={`mailto:${content.contactEmail}`}
                className="text-accent underline underline-offset-4"
              >
                {content.contactEmail}
              </a>
              {content.address ? " · " : ""}
              {content.address}
            </address>
          </div>
        </div>
      </Container>
    </footer>
  )
}
