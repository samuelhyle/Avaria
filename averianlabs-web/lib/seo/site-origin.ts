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

/** Build/runtime configuration only: never trust an arbitrary request Host header. */
export function siteOrigin(environment: SiteEnvironment = process.env): string {
  const review = environment.NEXT_PUBLIC_REVIEW_SITE === "true" || environment.BUILD_MODE === "demo"
  const candidates = review
    ? [
        environment.URL,
        environment.DEPLOY_PRIME_URL,
        environment.AUTH_URL,
        environment.NEXT_PUBLIC_SITE_URL,
      ]
    : [environment.NEXT_PUBLIC_SITE_URL, environment.AUTH_URL, environment.URL]
  for (const value of candidates) {
    const origin = validOrigin(value)
    if (origin) return origin
  }
  return review ? "https://averianlabs-demo.netlify.app" : "https://averianlabs.eu"
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
