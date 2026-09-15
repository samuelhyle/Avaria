/**
 * Averia consent — GDPR-aware cookie + ownership helpers.
 *
 * - The client generates an anonymous UUID on first visit (`averia:anon`)
 *   and stores it in `localStorage`. It's used as the conversation owner
 *   when the visitor hasn't logged in.
 * - Consent (`averia:consent`) is a separate cookie set by the opt-in banner.
 *   - "accepted"  → conversations are persisted to the DB
 *   - "declined"  → conversations stay in-memory only (Phase A0 behavior)
 *   - "unset"     → banner is shown on first chat open
 *
 * Server-side helpers below read/write the cookies from a Next.js Request.
 * Client-side helpers live in `lib/ai/memory/consent-client.ts`.
 */

import { cookies } from "next/headers"
import { verifyAnonCookie } from "./anon"
import { ANON_COOKIE, CONSENT_COOKIE, type ConsentState } from "./cookies"

export { ANON_COOKIE, CONSENT_COOKIE }
export type { ConsentState }

export function getConsentFromRequest(request: Request): ConsentState {
  const c = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CONSENT_COOKIE}=`))
  if (!c) return "unset"
  const value = decodeURIComponent(c.split("=")[1] ?? "")
  if (value === "accepted" || value === "declined") return value
  return "unset"
}

/** Only signed cookies are accepted — unsigned ids cannot claim an identity. */
export function getAnonFromRequest(request: Request): string | null {
  const c = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ANON_COOKIE}=`))
  if (!c) return null
  const value = decodeURIComponent(c.split("=")[1] ?? "")
  return verifyAnonCookie(value)
}

/** Used by Server Actions / Route Handlers — reads the request cookies. */
export async function getConsent(): Promise<ConsentState> {
  const c = (await cookies()).get(CONSENT_COOKIE)?.value
  if (c === "accepted" || c === "declined") return c
  return "unset"
}

export async function getAnonId(): Promise<string | null> {
  const c = (await cookies()).get(ANON_COOKIE)?.value
  return verifyAnonCookie(c ?? null)
}
