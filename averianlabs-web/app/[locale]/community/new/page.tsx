export const dynamic = "force-dynamic"

import { ThreadComposer } from "@/components/community/ThreadComposer"
import { Container } from "@/components/ui/Container"
import { ensureCategories, getCurrentMember, listCategories } from "@/lib/community"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

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
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await ensureCategories()
  const [categories, member] = await Promise.all([listCategories(), getCurrentMember()])

  const query = await searchParams
  const initialBody = typeof query.calculation === "string" ? query.calculation.slice(0, 6000) : ""
  return (
    <Container size="narrow" className="py-12">
      <ThreadComposer
        initialBody={initialBody}
        initialTitle={typeof query.title === "string" ? query.title.slice(0, 140) : ""}
        locale={locale}
        categories={categories.map((c) => ({ slug: c.slug, nameKey: c.nameKey }))}
        isAuthed={!!member}
        signInHref={`/${locale}/account?returnTo=${encodeURIComponent(`/${locale}/community/new?${new URLSearchParams({ calculation: initialBody, title: typeof query.title === "string" ? query.title.slice(0, 140) : "" })}`)}`}
      />
    </Container>
  )
}
