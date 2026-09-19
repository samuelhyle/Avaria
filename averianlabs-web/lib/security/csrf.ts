/**
 * CSRF defense for state-changing API routes (POST/PUT/DELETE/PATCH).
 *
 * Auth.js relies on `SameSite=Lax` cookies which covers the most common
 * CSRF vectors — but Lax does NOT block:
 *   - cross-site POSTs that submit with `Content-Type: text/plain` and a
 *     crafted body (older browsers used to follow this; modern ones
 *     require preflight but server handlers shouldn't rely on the browser),
 *   - same-site subdomain cookie inheritance (a vuln site on a sibling
 *     subdomain can ride on the session cookie),
 *   - GET-shaped form submissions against endpoints that also accept POST
 *     and behave differently by method.
 *
 * The defense: when the `Origin` header is present (all modern browsers send
 * it on POST/PUT/DELETE), it must match the request's own origin. When it's
 * absent (server-to-server, curl, same-origin older fetch), we fall back to
 * the `Referer` header. If both are missing on a state-changing request we
 * REFUSE — a SameSite=Lax cookie never travels without one of those headers
 * in modern browsers.
 *
 * Webhook routes (`/api/webhooks/*`) and Server Actions (which Next.js
 * already protects with its own nonce-based CSRF token) skip this helper.
 */

import { NextResponse } from "next/server"

export interface CsrfCheckResult {
  ok: boolean
  reason?: "missing_origin_and_referer" | "origin_mismatch" | "referer_mismatch" | "unsafe_method"
}

/**
 * Methods that change state on the server. GET/HEAD/OPTIONS are exempt.
 */
const UNSAFE_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"])

function isLoopbackHost(hostname: string): boolean {
  if (!hostname) return false
  const h = hostname.toLowerCase()
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h.endsWith(".localhost") ||
    h === "::1"
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
 * Verify the request's `Origin` (preferred) or `Referer` (fallback) matches
 * the server's own origin. When `allowDevHosts` is true, loopback hosts
 * (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost`) are accepted regardless
 * of the configured origin so the dev server + Playwright tests still work.
 */
export function checkCsrf(
  request: Request,
  opts: { allowDevHosts?: boolean } = {},
): CsrfCheckResult {
  const m = request.method.toUpperCase()
  if (!UNSAFE_METHODS.has(m)) return { ok: true }

  const requestOrigin = safeOrigin(request.url)

  // 1. Origin header — what the browser says the request is FROM.
  const originHeader = request.headers.get("origin")
  const fromOrigin = safeOrigin(originHeader)

  if (fromOrigin && requestOrigin) {
    if (fromOrigin === requestOrigin) return { ok: true }
    if (opts.allowDevHosts && isLoopbackHost(new URL(fromOrigin).hostname)) return { ok: true }
    return { ok: false, reason: "origin_mismatch" }
  }

  // 2. Fall back to Referer. Browsers that omit Origin on same-origin POST
  //    (rare but spec-allowed) usually still send Referer.
  const refererHeader = request.headers.get("referer")
  const fromReferer = safeOrigin(refererHeader)
  if (fromReferer && requestOrigin) {
    if (fromReferer === requestOrigin) return { ok: true }
    if (opts.allowDevHosts && isLoopbackHost(new URL(fromReferer).hostname)) return { ok: true }
    return { ok: false, reason: "referer_mismatch" }
  }

  // 3. Neither present → refuse. A real browser POST always sends one or
  //    the other; the absence is a sign of a forged request from curl,
  //    a server-side proxy that strips headers, or a misbehaving client.
  //    (Server-to-server webhook deliveries legitimately omit these — they
  //    bypass `checkCsrf` and verify via HMAC instead.)
  return { ok: false, reason: "missing_origin_and_referer" }
}

/**
 * Convenience wrapper: returns a 403 `NextResponse` when the check fails,
 * `null` when it passes. Compose into any POST handler:
 *
 *   const csrf = assertCsrfOr403(request)
 *   if (csrf) return csrf
 *
 * Returns `NextResponse` so handlers that also call `NextResponse.json(...)`
 * keep a single return-type contract.
 */
export function assertCsrfOr403(
  request: Request,
  opts: { allowDevHosts?: boolean } = {},
): NextResponse | null {
  const result = checkCsrf(request, opts)
  if (result.ok) return null
  return NextResponse.json({ error: "csrf_forbidden", reason: result.reason }, { status: 403 })
}
