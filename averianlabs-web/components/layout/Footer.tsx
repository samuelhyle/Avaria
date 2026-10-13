import { NewsletterForm } from "@/components/home/NewsletterForm"
import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { FlaskConical } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { CookieSettings } from "./CookieSettings"

interface FooterProps {
  locale: string
}

export async function Footer({ locale }: FooterProps) {
  const t = await getTranslations("footer")
  const r = await getTranslations("research")
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
        <div className="grid gap-12 py-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
              <div key={col.title} className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="inline-flex min-h-6 max-w-full items-center break-words hyphens-auto [overflow-wrap:anywhere] text-sm text-ink-muted hover:text-ink"
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
          {process.env.STRIPE_SECRET_KEY && <span>{r("card")}</span>}
          <CookieSettings />
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
            {legal.businessId && legal.vatId ? (
              <span className="font-mono">
                {r("businessId")} {legal.businessId} · VAT {legal.vatId}
              </span>
            ) : (
              <span>{r("legalPending")}</span>
            )}
            <address className="not-italic">
              <a href={`mailto:${legal.contactEmail}`} className="hover:text-ink hover:underline">
                {legal.contactEmail}
              </a>
              {" · "}
              {[legal.addressLine1, legal.addressLine2].filter(Boolean).join(", ")}
            </address>
          </div>
        </div>
      </Container>
    </footer>
  )
}
