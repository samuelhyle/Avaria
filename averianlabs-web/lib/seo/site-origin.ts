type SiteEnvironment = Record<string, string | undefined>

function validOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.username || url.password) return undefined
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return undefined
    return url.origin
  } catch {
    return undefined
  }
}

/**
 * The origin that serves the site.
 *
 * Build/runtime configuration only: never trust an arbitrary request Host
 * header, or a visitor could point every canonical link and structured-data
 * URL at a host they control.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when it is set, because it is the one value
 * the operator controls deliberately. `AUTH_URL` comes next: Auth.js derives
 * its callback URLs from it, so the canonical origin and the auth origin
 * should agree. `URL` and `DEPLOY_PRIME_URL` are set by the host — on
 * Netlify, `URL` is the site's own domain and `DEPLOY_PRIME_URL` is the
 * unique URL of one deployment.
 *
 * The fallback is the live site's own origin rather than a hardcoded
 * domain: `averianlabs.eu` is not a registered domain, so every canonical
 * URL and every sitemap entry pointing at it was a dead link. When the
 * custom domain is registered and connected, set `NEXT_PUBLIC_SITE_URL` and
 * every origin follows it.
 */
export function siteOrigin(environment: SiteEnvironment = process.env): string {
  const review = environment.NEXT_PUBLIC_REVIEW_SITE === "true" || environment.BUILD_MODE === "demo"
  const candidates = review
    ? [
        environment.URL,
        environment.DEPLOY_PRIME_URL,
        environment.AUTH_URL,
        environment.NEXT_PUBLIC_SITE_URL,
      ]
    : [
        environment.NEXT_PUBLIC_SITE_URL,
        environment.AUTH_URL,
        environment.URL,
        environment.DEPLOY_PRIME_URL,
      ]
  for (const value of candidates) {
    const origin = validOrigin(value)
    if (origin) return origin
  }
  return "https://averianlabs-demo.netlify.app"
}

/** Locale in the path gives caches an unambiguous image identity. */
export function socialImagePath(
  kind: "default" | "glossary" | "thread" | "plan" | "document",
  locale: string,
  id?: string,
): string {
  const language = locale === "fi" ? "fi" : "en"
  return kind === "default"
    ? `/api/og/default/${language}`
    : `/api/og/${kind}/${encodeURIComponent(id ?? "")}/${language}`
}
