import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { locales } from "@/lib/i18n/config"
import { ArrowRight, FlaskConical } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { headers } from "next/headers"
import Link from "next/link"

/**
 * Root 404 boundary.
 *
 * Every storefront URL lives under `/{locale}`, so this handles paths that
 * never reached the locale segment — a mistyped URL, a stale link or a bot
 * hitting the site root without a locale prefix.
 *
 * A mistyped path that *did* carry a language prefix reaches here too, and
 * telling that visitor to add a prefix they already added is no help. The
 * middleware records the locale it resolved, so the page can answer in the
 * language they asked for and offer the catalogue instead of a language
 * picker.
 */
export default async function RootNotFound() {
  const headerList = await headers()
  const resolved = headerList.get("x-locale")
  const locale =
    resolved && locales.includes(resolved as (typeof locales)[number]) ? resolved : undefined
  const t = await getTranslations({ locale: locale ?? "en", namespace: "notFound" })

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <FlaskConical className="h-7 w-7" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">{t("code")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl text-balance">
          {t("title")}
        </h1>
        <p className="mt-4 text-ink-muted text-pretty">{t("body")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {locale ? (
            <>
              <Button asChild size="lg">
                <Link href={`/${locale}/shop`}>
                  {t("browseCatalog")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}`}>{t("backHome")}</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="w-full text-sm text-ink-muted">
                The storefront lives under a language prefix.
              </p>
              <ul className="mt-2 grid w-full gap-3 sm:grid-cols-2">
                {locales.map((code) => (
                  <li key={code}>
                    <Link
                      href={`/${code}/`}
                      className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      <span>{code.toUpperCase()}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Container>
  )
}
