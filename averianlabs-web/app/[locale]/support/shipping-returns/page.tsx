import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Package, RefreshCcw, Thermometer, Truck } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("shippingReturns", "/support/shipping-returns")

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container className="py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Shipping & returns
      </h1>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Truck,
            title: "Carriers",
            body: "Posti (FI primary), DHL Express (rest of EU), DPD Classic.",
          },
          {
            icon: Package,
            title: "Dispatch",
            body: "Orders placed before 14:00 EET ship same business day. Others ship within 24h.",
          },
          {
            icon: Thermometer,
            title: "Cold-chain",
            body: "Ambient-stable peptides ship at room temp in protective foam. Refrigerated items ship with cold packs.",
          },
          {
            icon: RefreshCcw,
            title: "Returns",
            body: "Unopened product returnable within 14 days. Opened / temperature-compromised vials not returnable.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-sm"
          >
            <Icon className="h-5 w-5 text-accent" />
            <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-muted text-pretty">{body}</p>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-[var(--radius-xl)] bg-surface-2 p-8">
        <h2 className="font-display text-2xl font-semibold">Rates</h2>
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="pb-2">Region</th>
              <th className="pb-2">Carrier</th>
              <th className="pb-2">ETA</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[
              ["Finland", "Posti Express", "1–2 days", "€9.90"],
              ["EU (rest)", "DHL Express", "1–3 days", "€14.90"],
              ["EU (rest)", "DPD Classic", "3–5 days", "€6.90"],
              ["UK / NO / CH", "DHL Express", "2–4 days", "€19.90"],
            ].map(([region, carrier, eta, price]) => (
              <tr key={region}>
                <td className="py-3 font-medium">{region}</td>
                <td className="py-3 text-ink-muted">{carrier}</td>
                <td className="py-3 text-ink-muted">{eta}</td>
                <td className="py-3 text-right font-mono">{price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-ink-muted">Free shipping on EU orders over €150.</p>
      </section>
    </Container>
  )
}
