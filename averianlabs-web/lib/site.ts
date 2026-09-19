/**
 * Canonical site URL helpers.
 *
 * All user-facing absolute URLs (OpenGraph metadata, sitemap.xml, JSON-LD,
 * emails, etc.) MUST resolve through this module so a single env var —
 * `NEXT_PUBLIC_SITE_URL` — controls the production domain. Hardcoding
 * `averianlabs.eu` in any file outside this module is a deploy bug.
 *
 * Why an env var: the production site is `averianlabs.eu`, but previews
 * run on `*.netlify.app` and demos may run on a custom staging host. The
 * Netlify Next.js plugin automatically injects `NEXT_PUBLIC_SITE_URL` for
 * previews and the canonical URL for production.
 */
export const DEFAULT_SITE_URL = "https://averianlabs.eu"

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || DEFAULT_SITE_URL
}

/**
 * Build an absolute URL from a path. The path is normalised to start with
 * `/`; locale-prefixed paths should already include the segment
 * (e.g. `/${locale}/shop/${slug}`).
 */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  const normalised = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalised}`
}
