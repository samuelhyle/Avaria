import crypto from "node:crypto"
import { getServerEnv } from "@/lib/env"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidAnonId(value: string): boolean {
  return UUID_RE.test(value)
}

function secret(): string | null {
  return getServerEnv().AUTH_SECRET ?? null
}

function signature(id: string, key: string): string {
  return crypto.createHmac("sha256", key).update(id).digest("base64url")
}

/** Returns `id.signature`, or null when no server secret is configured (dev). */
export function signAnonId(id: string): string | null {
  const key = secret()
  if (!key) return null
  return `${id}.${signature(id, key)}`
}

/**
 * Verifies an `averia_anon` cookie value and returns the id, or null when the
 * value is unsigned, malformed, or forged.
 */
export function verifyAnonCookie(value: string | null | undefined): string | null {
  if (!value) return null
  const idx = value.lastIndexOf(".")
  if (idx <= 0) return null

  const id = value.slice(0, idx)
  const provided = value.slice(idx + 1)
  if (!isValidAnonId(id) || !provided) return null

  const key = secret()
  if (!key) return null

  const expected = signature(id, key)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  return id
}
