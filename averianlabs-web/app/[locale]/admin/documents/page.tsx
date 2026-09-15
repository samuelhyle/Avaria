export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { AdminDocumentsClient } from "@/components/admin/documents-client"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { listRecentDocuments } from "@/lib/documents/service"
import { products as seedProducts } from "@/lib/products/data"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Documents · Admin",
    robots: { index: false, follow: false },
  }
}

export default async function AdminDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")

  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Home
          </Link>
        </ForbiddenShell>
      </Container>
    )
  }

  const docs = await listRecentDocuments({ limit: 100 })
  const productOptions = seedProducts.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.defaultTranslation.name,
  }))

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6">
          <Badge tone="warn" size="sm" className="mb-2">
            Admin · Documents
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("documents")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage the typed documents (COA, SDS, HPLC, METHOD, NMR, SPEC, MSDS) that surface on
            product pages and at /documents/[id].
          </p>
        </header>

        <AdminDocumentsClient
          initialDocs={docs.map((d) => ({
            id: d.id,
            type: d.type,
            title: d.title,
            version: d.version,
            productName: d.productName,
            productSlug: d.productSlug,
            publishedAt: d.publishedAt,
          }))}
          products={productOptions}
        />
      </AdminShell>
    </Container>
  )
}
