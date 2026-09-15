import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { products } from "@/lib/products/data"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("coa", "/coa")

export default async function CoaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const _t = await getTranslations({ locale, namespace: "product" })

  return (
    <Container className="py-16">
      <header className="mb-10 max-w-2xl">
        <Badge tone="accent" className="mb-4">
          Public COA registry
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Certificates of Analysis
        </h1>
        <p className="mt-3 text-ink-muted">
          Every batch we ship is independently tested. Browse the latest Certificates below.
        </p>
      </header>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">HPLC</th>
              <th className="px-4 py-3">Endotoxin</th>
              <th className="px-4 py-3">Lab</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products
              .filter((p) => p.latestBatch)
              .map((p) => (
                <tr key={p.slug} className="hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-mono text-xs">{p.latestBatch?.code}</td>
                  <td className="px-4 py-3 font-medium">{p.defaultTranslation.name}</td>
                  <td className="px-4 py-3 font-mono">{p.latestBatch?.hplcPurity}%</td>
                  <td className="px-4 py-3 font-mono">{p.latestBatch?.endotoxinEUPerMg} EU/mg</td>
                  <td className="px-4 py-3 text-ink-muted">{p.latestBatch?.lab}</td>
                  <td className="px-4 py-3">
                    <Badge tone="success">PASS</Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Container>
  )
}
