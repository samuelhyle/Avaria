/**
 * The routes whose response is the same for every visitor.
 *
 * A shared cache must never serve one visitor's page to another. These
 * routes render the catalogue and the static copy, and nothing about them
 * depends on who is asking. The routes that read the session — the account
 * area, the admin console, the community pages and the product page's saved
 * plan — are not listed and stay uncached.
 *
 * `scripts/analyze-cacheable.mjs` derives the list by walking the route tree
 * and reporting the routes whose page and layout never read the session.
 */

/** The route segments that can be served from the CDN. */
export const CACHEABLE_PREFIXES = [
  "/about",
  "/blog",
  "/coa",
  "/community/rules",
  "/compare",
  "/contact",
  "/documents",
  "/faq",
  "/forgot-password",
  "/glossary",
  "/lab-tests",
  "/legal",
  "/newsletter",
  "/partner",
  "/quality",
  "/register",
  "/research-tools",
  "/reset-password",
  "/rewards",
  "/shop",
  "/support",
  "/verify-email",
  "/wishlist",
] as const

/** Whether the route segment after the locale can be served from the CDN. */
export function isCacheableRoute(route: string): boolean {
  if (route === "/") return true
  return CACHEABLE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))
}
