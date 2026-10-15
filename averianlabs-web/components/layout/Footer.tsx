import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { ChevronDown, FlaskConical } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { CookieSettings } from "./CookieSettings"

export async function Footer({ locale }: { locale: string }) {
  const [t, r, e] = await Promise.all([
    getTranslations("footer"),
    getTranslations("research"),
    getTranslations("experience"),
  ])
  const legal = getLegalIdentity()
  const cols = [
    {
      title: t("research"),
      links: [
        { href: `/${locale}/shop`, label: t("shop") },
        { href: `/${locale}/documents`, label: e("documents") },
        { href: `/${locale}/research-tools`, label: r("tools") },
        { href: `/${locale}/community`, label: t("community") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: `/${locale}/about`, label: t("about") },
        { href: `/${locale}/quality`, label: t("quality") },
        { href: `/${locale}/partner`, label: t("partner") },
      ],
    },
    {
      title: t("support"),
      links: [
        { href: `/${locale}/faq`, label: t("faq") },
        { href: `/${locale}/support/shipping-returns`, label: t("shipping") },
        { href: `/${locale}/contact`, label: t("contact") },
        { href: `/${locale}/account`, label: t("account") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: `/${locale}/legal/terms`, label: t("terms") },
        { href: `/${locale}/legal/privacy`, label: t("privacy") },
        { href: `/${locale}/legal/cookies`, label: t("cookies") },
        { href: `/${locale}/legal/research-disclaimer`, label: t("disclaimer") },
      ],
    },
  ]
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
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{t("tagline")}</p>
            <Link
              href={`/${locale}/lab-tests`}
              className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-accent hover:underline underline-offset-4"
            >
              {t("verifiedBy")} →
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
          {process.env.STRIPE_SECRET_KEY ? (
            <span>
              {t("paymentsTitle")} · {r("card")}
            </span>
          ) : null}
          <CookieSettings />
        </div>
        <div className="grid gap-4 border-t border-line py-6 text-sm text-ink-muted sm:grid-cols-[1fr_2fr]">
          <p className="flex items-start gap-2">
            <FlaskConical aria-hidden className="mt-1 h-4 w-4 shrink-0 text-accent" />
            <span>{t("researchUse")}</span>
          </p>
          <div className="space-y-2">
            <p>{t("rightsReserved", { year: new Date().getFullYear() })}</p>
            {legal.businessId && legal.vatId ? (
              <p className="font-mono text-xs">
                {r("businessId")} {legal.businessId} · VAT {legal.vatId}
              </p>
            ) : (
              <p>{r("legalPending")}</p>
            )}
            <address className="not-italic">
              <a
                href={`mailto:${legal.contactEmail}`}
                className="text-accent underline underline-offset-4"
              >
                {legal.contactEmail}
              </a>
              {legal.addressLine1 || legal.addressLine2 ? " · " : ""}
              {[legal.addressLine1, legal.addressLine2].filter(Boolean).join(", ")}
            </address>
          </div>
        </div>
      </Container>
    </footer>
  )
}
