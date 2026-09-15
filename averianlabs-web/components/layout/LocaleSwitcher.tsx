"use client"

import { type Locale, localeLabels, locales } from "@/lib/i18n/config"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

interface LocaleSwitcherProps {
  currentLocale: string
}

/**
 * Native `<select>` — fully keyboard- and screen-reader-accessible, and it
 * gives mobile users the platform picker for free.
 */
export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const t = useTranslations("nav")
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const switchTo = (target: Locale) => {
    const segments = pathname.split("/").filter(Boolean)
    if ((locales as readonly string[]).includes(segments[0] ?? "")) {
      segments[0] = target
    } else {
      segments.unshift(target)
    }
    const newPath = `/${segments.join("/")}`
    startTransition(() => router.push(newPath))
  }

  return (
    <div className="relative">
      <select
        value={currentLocale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        aria-label={t("language")}
        disabled={isPending}
        className="h-9 appearance-none rounded-[var(--radius)] border border-line bg-surface pl-3 pr-8 text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()} · {localeLabels[loc]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
    </div>
  )
}
