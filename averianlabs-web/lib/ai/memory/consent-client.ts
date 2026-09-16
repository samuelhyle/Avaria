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

const ANON_LS_KEY = "averia:anon"

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "ssr"

  let id = window.localStorage.getItem(ANON_LS_KEY)
  if (!id) {
    id = uuid()
    window.localStorage.setItem(ANON_LS_KEY, id)
  }
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
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${opts.maxAge}; path=${opts.path}; SameSite=Lax; Secure`
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1] ?? "") : null
}
