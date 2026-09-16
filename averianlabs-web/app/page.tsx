import { isDemoBuild } from "@/lib/demo"
import Link from "next/link"
import { redirect } from "next/navigation"

const LOCALES = [
  { code: "en", label: "English" },
  { code: "fi", label: "Suomi" },
  { code: "de", label: "Deutsch" },
  { code: "sv", label: "Svenska" },
  { code: "nl", label: "Nederlands" },
] as const

export default function RootPage() {
  if (isDemoBuild()) {
    // Static demo build can't run middleware, so render a lightweight
    // language picker. Each link is pre-rendered by its [locale] page.
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-6">
        <div className="w-full max-w-xl rounded-[var(--radius-xl)] border border-line bg-surface p-10 shadow-sm">
          <p className="font-mono text-3xs uppercase tracking-[0.2em] text-ink-subtle">
            AverianLabs · Netlify demo
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Pick a language
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            This is the static demo build. Auth, cart checkout, community, and live integrations are
            disabled. Marketing, catalogue, blog, and glossary are pre-rendered.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {LOCALES.map(({ code, label }) => (
              <li key={code}>
                <Link
                  href={`/${code}/`}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <span>{label}</span>
                  <span className="font-mono text-3xs uppercase text-ink-subtle">{code}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-3xs text-ink-subtle">
            Default:{" "}
            <Link href="/en/" className="underline hover:text-accent">
              /en/
            </Link>
          </p>
        </div>
      </main>
    )
  }

  redirect("/en")
}
