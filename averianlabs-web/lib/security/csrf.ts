import { NextResponse } from "next/server"

import { siteOrigin } from "@/lib/seo/site-origin"

/**
 * CSRF defence for state-changing API routes (POST/PUT/DELETE/PATCH).
 *
 * The session cookie is `SameSite=Lax`, which covers the common CSRF
 * vectors — but Lax does not stop:
 *
 *   - a cross-site POST that submits with `Content-Type: text/plain` and a
 *     crafted body,
 *   - a sibling subdomain inheriting the session cookie,
 *   - a GET-shaped form submission against an endpoint that also accepts
 *     POST and behaves differently by method.
 *
 * The defence: when the `Origin` header is present (every modern browser
 * sends it on a state-changing request) it must match an origin this
 * deployment actually serves. When it is absent, `Referer` is the fallback.
 * If neither is present the request is refused.
 *
 * The comparison is against the *deployment's* configured origins rather
 * than the request's own URL. On Netlify the function's `request.url` origin
 * is the deployment's internal address, which differs from the public site
 * origin on a deploy preview and behind the proxy, so comparing against it
 * would reject every legitimate request.
 *
 * Webhook routes (`/api/webhooks/*`) and the Telegram endpoint verify their
 * caller by HMAC signature instead, and do not use this helper.
 */

export interface CsrfCheckResult {
  ok: boolean
  reason?: "missing_origin_and_referer" | "origin_mismatch" | "referer_mismatch" | "unsafe_method"
}

/** Methods that change state on the server. GET/HEAD/OPTIONS are exempt. */
const UNSAFE_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"])

function isLoopbackHost(hostname: string): boolean {
  if (!hostname) return false
  const h = hostname.toLowerCase()
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "::1" ||
    h.endsWith(".localhost")
  )
}

function safeOrigin(input: string | null): string | null {
  if (!input) return null
  try {
    return new URL(input).origin
  } catch {
    return null
  }
}

/**
 * The origins this deployment serves.
 *
 * The configured site origin is authoritative. The host's own `URL` and
 * `DEPLOY_PRIME_URL` are included as well so a deploy preview — which is
 * served under its own unique hostname — passes the check: the preview is
 * the same application, and a legitimate visitor on it is not an attacker.
 * A request from any *other* origin is refused.
 */
function allowedOrigins(): Set<string> {
  const origins = new Set<string>()
  const configured = safeOrigin(siteOrigin())
  if (configured) origins.add(configured)
  for (const value of [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.AUTH_URL]) {
    const origin = safeOrigin(value ?? null)
    if (origin) origins.add(origin)
  }
  return origins
}

/**
 * Verify the request's `Origin` (preferred) or `Referer` (fallback) matches
 * an origin this deployment serves.
 *
 * `allowDevHosts` accepts loopback origins regardless of the configured
 * origin, so the dev server and the browser suite keep working when the
 * site origin points at production.
 */
export function checkCsrf(
  request: Request,
  opts: { allowDevHosts?: boolean } = {},
): CsrfCheckResult {
  const method = request.method.toUpperCase()
  if (!UNSAFE_METHODS.has(method)) return { ok: true }

  const allowed = allowedOrigins()

  const accept = (origin: string | null): CsrfCheckResult | null => {
    if (!origin) return null
    if (allowed.has(origin)) return { ok: true }
    if (opts.allowDevHosts && isLoopbackHost(new URL(origin).hostname)) return { ok: true }
    return null
  }

  // 1. Origin header — what the browser says the request is FROM.
  const fromOrigin = safeOrigin(request.headers.get("origin"))
  if (fromOrigin) {
    return accept(fromOrigin) ?? { ok: false, reason: "origin_mismatch" }
  }

  // 2. Fall back to Referer. Browsers that omit Origin on a same-origin
  //    POST (rare but permitted) usually still send Referer.
  const fromReferer = safeOrigin(request.headers.get("referer"))
  if (fromReferer) {
    return accept(fromReferer) ?? { ok: false, reason: "referer_mismatch" }
  }

  // 3. Neither present → refuse. A real browser POST always sends one or
  //    the other; the absence is a sign of a forged request from curl, a
  //    proxy that strips headers, or a misbehaving client.
  return { ok: false, reason: "missing_origin_and_referer" }
}

/**
 * Convenience wrapper: returns a 403 `NextResponse` when the check fails
 * and `null` when it passes.
 *
 *   const csrf = assertCsrfOr403(request)
 *   if (csrf) return csrf
 *
 * It returns a `NextResponse` so a handler that also calls
 * `NextResponse.json(...)` keeps a single return-type contract.
 */
export function assertCsrfOr403(
  request: Request,
  opts: { allowDevHosts?: boolean } = {},
): NextResponse | null {
  const result = checkCsrf(request, opts)
  if (result.ok) return null
  return NextResponse.json({ error: "csrf_forbidden", reason: result.reason }, { status: 403 })
}

/**
 * Whether loopback origins should be accepted.
 *
 * True in development and in the browser suite, where the site origin is
 * configured for production but the request arrives from `localhost`.
 */
export function csrfAllowsDevHosts(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.CI === "true"
}
