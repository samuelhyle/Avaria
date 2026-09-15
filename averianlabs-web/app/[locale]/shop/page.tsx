import { ShopCatalog } from "@/components/shop/ShopCatalog"
import { Container } from "@/components/ui/Container"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Suspense } from "react"

// Static shell — filters/sorting/3D are handled by the client catalog island.
export const revalidate = 3600

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "shop" })

  return (
    <Container className="py-12">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-ink-muted">{t("subtitle")}</p>
      </header>

      <Suspense fallback={<ShopCatalogSkeleton />}>
        <ShopCatalog locale={locale} />
      </Suspense>
    </Container>
  )
}

function ShopCatalogSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
      <div className="hidden h-96 animate-pulse rounded-[var(--radius-lg)] bg-surface-2 lg:block" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((id) => (
          <div
            key={id}
            className="h-80 animate-pulse rounded-[var(--radius-lg)] border border-line bg-surface-2"
          />
        ))}
      </div>
    </div>
  )
}
