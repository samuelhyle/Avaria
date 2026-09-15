/**
 * Consent cookie names + states.
 *
 * Kept in a module with **no** server imports so both the server helpers
 * (`consent.ts`) and client helpers (`consent-client.ts`) can share them
 * without dragging `next/headers` into the client bundle.
 *
 * Cookie names are RFC 6265 tokens — letters, digits, `_` and `-` only.
 */

export const ANON_COOKIE = "averia_anon"
export const CONSENT_COOKIE = "averia_consent"

export type ConsentState = "accepted" | "declined" | "unset"
