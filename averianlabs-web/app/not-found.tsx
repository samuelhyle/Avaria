import Link from "next/link"

/**
 * Root 404 boundary.
 *
 * Every storefront URL lives under `/{locale}`, so this only handles paths
 * that never reached the locale segment — a mistyped URL, a stale link or a
 * bot hitting the site root without a locale prefix.
 */
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-ink">
      <div className="w-full max-w-lg text-center">
        <p className="font-mono text-3xs uppercase tracking-[0.2em] text-ink-subtle">Error 404</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          The address you followed does not exist. The storefront lives under a language prefix.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { code: "en", label: "English" },
            { code: "fi", label: "Suomi" },
            { code: "sv", label: "Svenska" },
            { code: "ru", label: "Русский" },
          ].map((locale) => (
            <li key={locale.code}>
              <Link
                href={`/${locale.code}/`}
                className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
              >
                <span>{locale.label}</span>
                <span className="font-mono text-3xs uppercase text-ink-subtle">{locale.code}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
