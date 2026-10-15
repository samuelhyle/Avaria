"use client"

import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import type { FooterContent } from "@/lib/layout/footer-content"
import { ChevronDown, FlaskConical } from "lucide-react"
import Link from "next/link"
import { CookieSettings } from "./CookieSettings"

export function Footer({ content }: { content: FooterContent }) {
  const { locale, cols } = content
  const links = (col: (typeof cols)[number]) => (
    <ul className="mt-3 space-y-1">
      {col.links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            prefetch={false}
            className="inline-flex min-h-9 max-w-full items-center break-words hyphens-auto text-sm text-ink-muted hover:text-ink hover:underline underline-offset-4"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <footer className="platform-bottom-safe mt-12 border-t border-line bg-surface-2">
      <Container>
        <div className="grid gap-7 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <Logo href={`/${locale}`} size="md" />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {content.tagline}
            </p>
            <Link
              href={`/${locale}/lab-tests`}
              className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-accent hover:underline underline-offset-4"
            >
              {content.testResultsLabel} →
            </Link>
          </div>
          <div className="grid gap-x-6 sm:grid-cols-4">
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-4 text-sm text-ink-muted">
          {content.paymentsLabel ? <span>{content.paymentsLabel}</span> : null}
          <CookieSettings />
        </div>
        <div className="grid gap-4 border-t border-line py-6 text-sm text-ink-muted sm:grid-cols-[1fr_2fr]">
          <p className="flex items-start gap-2">
            <FlaskConical aria-hidden className="mt-1 h-4 w-4 shrink-0 text-accent" />
            <span>{content.researchUse}</span>
          </p>
          <div className="space-y-2">
            <p>{content.rightsReserved}</p>
            {content.businessIdentity ? (
              <p className="font-mono text-xs">{content.businessIdentity}</p>
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
