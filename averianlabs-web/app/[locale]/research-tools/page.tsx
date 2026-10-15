import { Container } from "@/components/ui/Container"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "research" })
  return {
    title: t("tools"),
    description: t("toolsIntro"),
    alternates: { canonical: `/${locale}/research-tools` },
  }
}
export default async function ResearchTools({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("research")
  const links = [
    { path: "peptide-calculator", title: t("calculator"), body: t("calculatorNotice") },
    { path: "assistant", title: "Averia", body: t("assistantIntro") },
    { path: "community", title: t("communityTitle"), body: t("communityIntro") },
    { path: "lab-tests", title: t("methodology"), body: t("methodologyCard") },
  ]
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-7 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("tools")}</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{t("toolsIntro")}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.path}
            href={`/${locale}/${link.path}`}
            className="rounded-xl border border-line bg-surface p-6 hover:border-accent/50"
          >
            <h2 className="text-lg font-semibold">{link.title} →</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">{link.body}</p>
          </Link>
        ))}
      </div>
    </Container>
  )
}
