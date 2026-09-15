import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("legalPrivacy", "/legal/privacy")

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container size="narrow" className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: 1 September 2026 · GDPR compliant</p>

      <section className="prose prose-lg mt-10 max-w-none space-y-6 text-ink">
        <p>
          This policy explains how AverianLabs Oy ("we") processes personal data on averianlabs.eu
          and affiliated domains, in compliance with the EU General Data Protection Regulation
          (GDPR) and the Finnish Personal Data Act.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Data we collect</h2>
        <ul>
          <li>Account data: email, name, hashed password (if you create an account).</li>
          <li>Order data: shipping/billing address, order history.</li>
          <li>Technical data: IP (truncated), user agent, referrer (kept 30 days).</li>
          <li>Analytics: only with your explicit consent via the cookie banner.</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-8">Lawful basis</h2>
        <p>
          Contract (Art. 6(1)(b)) for orders, consent (Art. 6(1)(a)) for analytics, legal obligation
          (Art. 6(1)(c)) for accounting.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Subprocessors</h2>
        <ul>
          <li>Stripe Payments Europe Ltd — payment processing (EU)</li>
          <li>Coinbase Commerce — crypto payments</li>
          <li>Resend — transactional email (EU)</li>
          <li>PostHog Cloud EU — product analytics (consent-gated)</li>
          <li>Sanity Inc. — content (US, EU data residency)</li>
          <li>Cloudflare — CDN / DDoS</li>
          <li>Neon — database (Frankfurt)</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-8">Your rights</h2>
        <p>
          You have the right to access, rectify, erase, restrict, port, and object. Email
          privacy@averianlabs.eu. You may also lodge a complaint with your national supervisory
          authority (in Finland: tietosuojavaltuutettu).
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Retention</h2>
        <p>Account data: until deletion. Order data: 7 years (accounting). Analytics: 14 months.</p>

        <h2 className="font-display text-2xl font-semibold mt-8">Contact</h2>
        <p>Data Protection Officer: dpo@averianlabs.eu · AverianLabs Oy, Helsinki, Finland.</p>
      </section>
    </Container>
  )
}
