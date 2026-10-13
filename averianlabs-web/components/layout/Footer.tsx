import { NewsletterForm } from "@/components/home/NewsletterForm"
import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { FlaskConical } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

interface FooterProps {
  locale: string
}

export async function Footer({ locale }: FooterProps) {
  const t = await getTranslations("footer")
  const legal = getLegalIdentity()

  const cols = [
    {
      title: t("research"),
      links: [
        { href: `/${locale}/shop`, label: t("shop") },
        { href: `/${locale}/lab-tests`, label: t("labTests") },
        { href: `/${locale}/coa`, label: t("coa") },
        { href: `/${locale}/documents`, label: t("documents") },
        { href: `/${locale}/peptide-calculator`, label: t("calculator") },
        { href: `/${locale}/community`, label: t("community") },
        { href: `/${locale}/glossary`, label: t("glossary") },
        { href: `/${locale}/blog`, label: t("blog") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: `/${locale}/about`, label: t("about") },
        { href: `/${locale}/quality`, label: t("quality") },
        { href: `/${locale}/partner`, label: t("partner") },
        { href: `/${locale}/contact`, label: t("contact") },
        { href: `/${locale}/rewards`, label: t("rewards") ?? "Rewards" },
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

  const year = new Date().getFullYear()

  return (
    <footer className="mt-32 border-t border-line bg-surface-2">
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <Logo href={`/${locale}`} size="md" />
            <p className="mt-3 max-w-md text-sm text-ink-muted text-pretty">{t("tagline")}</p>

            <NewsletterForm className="mt-6 max-w-md" />

            <Link
              href={`/${locale}/lab-tests`}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {t("verifiedBy")} →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="inline-flex min-h-6 items-center text-sm text-ink-muted hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-4 text-xs text-ink-muted">
          <span className="font-semibold uppercase tracking-wider text-ink-subtle">
            {t("paymentsTitle")}
          </span>
          <PaymentIcons stripeCaption={t("stripeCaption")} coinbaseCaption={t("coinbaseCaption")} />
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <FlaskConical className="h-3.5 w-3.5 text-accent" />
            <span>{t("researchUse")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span>
              © {year} {legal.companyName} · {t("rightsReserved", { year })}
            </span>
            <span className="font-mono">
              Y-tunnus {legal.businessId} · VAT {legal.vatId}
            </span>
            <address className="not-italic">
              <a href={`mailto:${legal.contactEmail}`} className="hover:text-ink hover:underline">
                {legal.contactEmail}
              </a>
              {" · "}
              {legal.addressLine1}, {legal.addressLine2}
            </address>
          </div>
        </div>
      </Container>
    </footer>
  )
}

/**
 * Only the methods actually wired into checkout are listed (PAY-01).
 * Visa / Mastercard / Amex / PayPal / Apple Pay / Google Pay / SEPA were
 * decorative icons and have been removed until the corresponding payment
 * providers are integrated and live-tested.
 */
function PaymentIcons({
  stripeCaption,
  coinbaseCaption,
}: {
  stripeCaption: string
  coinbaseCaption: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        role="img"
        aria-label={stripeCaption}
        className="inline-flex h-7 items-center gap-1.5 rounded border border-line bg-surface px-2 text-2xs font-medium text-ink-muted"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M13.5 10.5c0-.8.7-1.1 1.7-1.1 1.5 0 3.5.5 5 1.3V7.2c-1.7-.7-3.3-1-5-1-4 0-6.7 2.1-6.7 5.6 0 5.5 7.5 4.6 7.5 7 0 1-.9 1.3-2 1.3-1.7 0-4-.7-5.7-1.7v3.6c2 .8 3.8 1.2 5.7 1.2 4.2 0 7-2 7-5.6 0-5.9-7.5-4.8-7.5-7.1Z" />
        </svg>
        <span>{stripeCaption}</span>
      </span>
      <span
        role="img"
        aria-label={coinbaseCaption}
        className="inline-flex h-7 items-center gap-1.5 rounded border border-line bg-surface px-2 text-2xs font-medium text-ink-muted"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span>{coinbaseCaption}</span>
      </span>
    </div>
  )
}
