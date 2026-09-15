import { type APIRequestContext, type Page, test as base, expect } from "@playwright/test"

export const LOCALES = ["en", "fi", "de", "sv", "nl"] as const
export type Locale = (typeof LOCALES)[number]

const AGE_GATE_COOKIE = {
  name: "averianlabs-age-confirmed",
  value: "1",
  url: process.env.BASE_URL ?? "http://localhost:3000",
}

type Fixtures = {
  /** Page with age-gate cookie already set and localStorage cleared. */
  cleanPage: Page
}

export const test = base.extend<Fixtures>({
  cleanPage: async ({ context, page }, use) => {
    await context.addCookies([AGE_GATE_COOKIE])
    // Wait for networkidle so lazy-imported widgets (Averia chat, search
    // palette) have time to mount. `domcontentloaded` fires before the
    // requestIdleCallback-triggered dynamic imports resolve.
    await page.goto("/en", { waitUntil: "networkidle" })
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore — storage may be disabled
      }
    })
    await use(page)
  },
})

export { expect }

/**
 * True if /api/health reports the server is "degraded" (no DB) — used to skip
 * tests that require a live database connection.
 */
export async function isDegraded(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get("/api/health", { timeout: 5_000 })
    if (res.status() === 503) return true
    const body = (await res.json().catch(() => null)) as { status?: string } | null
    return Boolean(body?.status && body.status !== "ok")
  } catch {
    return true
  }
}

/**
 * Build an absolute URL for a given locale path.
 * Example: localePath("en", "/shop") -> "/en/shop"
 */
export function localePath(locale: Locale, path = ""): string {
  return `/${locale}${path}`
}

/**
 * Build a localized hreflang lookup table for the given path.
 */
export function hreflangs(path = ""): Array<{ lang: Locale; href: string }> {
  return LOCALES.map((lang) => ({ lang, href: `/${lang}${path}` }))
}

export { AGE_GATE_COOKIE }
