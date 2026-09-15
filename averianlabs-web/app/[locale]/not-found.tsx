import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { ArrowLeft, FlaskConical } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFound" })

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <FlaskConical className="h-7 w-7" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">Error 404</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl text-balance">
          {t("title")}
        </h1>
        <p className="mt-4 text-ink-muted text-pretty">{t("body")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={`/${locale}`}>
              <ArrowLeft className="h-4 w-4" />
              {t("backHome")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/shop`}>{t("browseCatalog")}</Link>
          </Button>
        </div>
        <p className="mt-12 text-xs text-ink-subtle">
          {t("searchHint")}{" "}
          <kbd className="rounded border border-line bg-surface px-1 font-mono">⌘K</kbd>
        </p>
      </div>
    </Container>
  )
}
