/**
 * Client-side consent + anonymous identity helpers.
 *
 * The chat widget reads/writes these via `localStorage` and `document.cookie`.
 * The cookie is the source of truth for the server (route handlers), the
 * localStorage value is used as a fast client cache for the anon id.
 *
 * The signed cookie itself is now minted server-side from the chat request
 * (see `app/api/ai/chat/route.ts`) — the client just sends the raw UUID it
 * generated and the response carries `Set-Cookie: averia_anon=…`. This
 * eliminates the previous race where the chat request could arrive before
 * the identity round-trip had resolved.
 */

import { CONSENT_COOKIE } from "@/lib/ai/memory/cookies"
import { safeUuid } from "@/lib/utils/uuid"

const ANON_LS_KEY = "averia:anon"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "ssr"

  const stored = window.localStorage.getItem(ANON_LS_KEY)
  // Validate the stored value before reusing — older builds sometimes
  // wrote a non-UUID placeholder, which the server would silently reject.
  if (stored && UUID_RE.test(stored)) {
    return stored
  }
  const id = safeUuid()
  window.localStorage.setItem(ANON_LS_KEY, id)
  return id
}

export function getConsentState(): "accepted" | "declined" | "unset" {
  if (typeof document === "undefined") return "unset"
  const c = readCookie(CONSENT_COOKIE)
  if (c === "accepted" || c === "declined") return c
  return "unset"
}

export function setConsentState(state: "accepted" | "declined"): void {
  if (typeof document === "undefined") return
  setCookie(CONSENT_COOKIE, state, { maxAge: 60 * 60 * 24 * 365, path: "/" })
}

function setCookie(name: string, value: string, opts: { maxAge: number; path: string }): void {
  // `Secure` would block the cookie on `http://localhost` during dev; only
  // attach it when the page is actually served over HTTPS.
  const secure = typeof window !== "undefined" && window.location.protocol === "https:"
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${opts.maxAge}`,
    `path=${opts.path}`,
    "SameSite=Lax",
  ]
  if (secure) parts.push("Secure")
  document.cookie = parts.join("; ")
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1] ?? "") : null
}
