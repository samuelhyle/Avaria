/**
 * Client-side consent + anonymous identity helpers.
 *
 * The chat widget reads/writes these via `localStorage` and `document.cookie`.
 * The cookie is the source of truth for the server (route handlers), the
 * localStorage value is used as a fast client cache for the anon id.
 */

import { CONSENT_COOKIE } from "@/lib/ai/memory/cookies"

const ANON_LS_KEY = "averia:anon"
const PROVISIONED_KEY = "averia:identity-provisioned"

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Asks the server to issue a signed, httpOnly identity cookie. */
async function provisionAnonIdentity(id: string): Promise<void> {
  try {
    await fetch("/api/ai/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: id }),
    })
  } catch {
    // Non-blocking: chat still works without persisted anonymous identity.
  }
}

export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "ssr"

  let id = window.localStorage.getItem(ANON_LS_KEY)
  if (!id) {
    id = uuid()
    window.localStorage.setItem(ANON_LS_KEY, id)
    void provisionAnonIdentity(id)
    return id
  }

  // Existing visitors may hold an unsigned cookie from before signing shipped.
  if (!window.sessionStorage.getItem(PROVISIONED_KEY)) {
    window.sessionStorage.setItem(PROVISIONED_KEY, "1")
    void provisionAnonIdentity(id)
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
