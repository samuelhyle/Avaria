import { ThreadComposer } from "@/components/community/ThreadComposer"
import { Container } from "@/components/ui/Container"
import { ensureCategories, getCurrentMember, listCategories } from "@/lib/community"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "community" })
  return {
    title: t("newThreadTitle"),
    alternates: { canonical: `/${locale}/community/new` },
    robots: { index: false, follow: false },
  }
}

export default async function NewThreadPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await ensureCategories()
  const [categories, member] = await Promise.all([listCategories(), getCurrentMember()])

  return (
    <Container size="narrow" className="py-12">
      <ThreadComposer
        locale={locale}
        categories={categories.map((c) => ({ slug: c.slug, nameKey: c.nameKey }))}
        isAuthed={!!member}
        signInHref={`/${locale}/account`}
      />
    </Container>
  )
}
