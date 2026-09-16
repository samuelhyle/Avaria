import { NewsletterForm } from "@/components/home/NewsletterForm"
import { Logo } from "@/components/layout/Logo"
import { Container } from "@/components/ui/Container"
import { getLegalIdentity } from "@/lib/legal"
import { FlaskConical, Github, Linkedin, Lock, ShieldCheck, Truck, Twitter } from "lucide-react"
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
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Stripe-secured
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-success" />
              GDPR compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-accent" />
              24h EU dispatch
            </span>
          </div>
          <PaymentIcons />
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

function PaymentIcons() {
  const items = [
    {
      label: "Visa",
      svg: (
        <path d="M14.5 4.5h2.7l-2 11h-2.7l2-11zm6.8 7.4-1.2-3.3-1.4 3.3h2.6zm.6 3.6h2.5l-2.2-11h-2.3c-.5 0-1 .3-1.2.7l-4 10.3h2.8l.6-1.7h3.4l.3 1.7zm-7.6-9.6-4.2 11h-2.9l-2.1-8.5c-.1-.5-.3-.7-.7-.9-1.1-.5-2.2-.9-3.4-1.3l.1-.3h5.2c.6 0 1.2.4 1.3 1.2l1.1 5.8 2.7-7h2.9z" />
      ),
    },
    {
      label: "Mastercard",
      svg: (
        <g>
          <circle cx="9" cy="12" r="5.5" />
          <circle cx="15" cy="12" r="5.5" />
        </g>
      ),
    },
    {
      label: "Amex",
      svg: (
        <path d="M2 6h20v12H2V6zm3 2v8h14V8H5zm3 2h4v1.5H9V13H8v-3zm6 0h2v3l-1.5-2-1.5 2v-3h1z" />
      ),
    },
    {
      label: "PayPal",
      svg: (
        <path d="M7.5 5h6.7c1.6 0 2.6 1.1 2.3 2.6-.5 2.4-2.4 3.7-4.7 3.7h-1.4c-.4 0-.7.3-.8.7l-.7 4c0 .2-.2.4-.4.4H6.2c-.2 0-.4-.2-.4-.4l1.3-7.6c.1-.5.5-.9 1-1.1.4-.2.9-.3 1.4-.3zm.3 1.5-.7 4h1.4c1.3 0 2.5-.5 2.7-2 .1-.8-.4-1.5-1.2-1.7-.5-.2-1-.2-1.5-.2-.3 0-.6-.1-.7-.1z" />
      ),
    },
    {
      label: "Apple Pay",
      svg: (
        <path d="M16.5 13.5c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.5-.1-2.8.9-3.6.9-.7 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1-.1-2.6-1-2.6-3.8zM14 6.4c.7-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.2-.5 2.9-1.4z" />
      ),
    },
    {
      label: "Google Pay",
      svg: (
        <g>
          <path d="M12 11v2.4h3.4c-.1.7-.7 2-2.4 2-1.5 0-2.6-1.2-2.6-2.6s1.2-2.6 2.6-2.6c.8 0 1.4.4 1.7.7l2-2c-.9-.8-2.1-1.4-3.7-1.4-3.1 0-5.6 2.5-5.6 5.6s2.5 5.6 5.6 5.6c3.2 0 5.3-2.3 5.3-5.5 0-.4 0-.7-.1-1H12z" />
        </g>
      ),
    },
    {
      label: "Coinbase",
      svg: <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />,
    },
    {
      label: "SEPA",
      svg: (
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700">
          SEPA
        </text>
      ),
    },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          role="img"
          title={it.label}
          aria-label={it.label}
          className="inline-flex h-7 min-w-[36px] items-center justify-center rounded border border-line bg-surface px-1.5 text-ink-muted"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-7" fill="currentColor" aria-hidden="true">
            {it.svg}
          </svg>
        </span>
      ))}
    </div>
  )
}
