import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("legalCookies", "/legal/cookies")

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container size="narrow" className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Cookies</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: 1 September 2026</p>

      <section className="prose prose-lg mt-10 max-w-none space-y-6 text-ink">
        <p>
          We use a minimal set of cookies. Essential cookies cannot be disabled; analytics cookies
          require your consent.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Essential</h2>
        <ul>
          <li>
            <code>averianlabs-cart</code> — saves your cart (1 year)
          </li>
          <li>
            <code>averianlabs-age-confirmed</code> — remembers age-gate confirmation (1 year)
          </li>
          <li>
            <code>averianlabs-cookie-consent</code> — remembers your cookie choice (1 year)
          </li>
          <li>Stripe / Coinbase session cookies (set by payment provider)</li>
        </ul>

        <h2 className="font-display text-2xl font-semibold mt-8">Analytics (consent)</h2>
        <p>
          PostHog (EU) and Plausible are loaded only after you click "Accept all" on the cookie
          banner. They collect anonymised, aggregated usage data.
        </p>

        <h2 className="font-display text-2xl font-semibold mt-8">Change your choice</h2>
        <p>Click the small "Cookies" link in the footer, or clear your browser data.</p>
      </section>
    </Container>
  )
}
