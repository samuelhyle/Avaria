import crypto from "node:crypto"
import { verificationTokens } from "@/db/schema"
import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"

export const TOKEN_TTL_MS = {
  emailVerification: 24 * 60 * 60 * 1000,
  passwordReset: 60 * 60 * 1000,
} as const

export const tokenIdentifiers = {
  emailVerification: (email: string) => `email-verify:${email}`,
  passwordReset: (email: string) => `password-reset:${email}`,
} as const

/** Tokens are stored hashed; a database leak cannot be replayed. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url")
}

export async function createToken(identifier: string, ttlMs: number): Promise<string> {
  const token = generateToken()
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier))
  await db.insert(verificationTokens).values({
    identifier,
    token: hashToken(token),
    expires: new Date(Date.now() + ttlMs),
  })
  return token
}

/** Single-use: deletes the row whether or not it had expired. */
export async function consumeToken(identifier: string, token: string): Promise<boolean> {
  const hashed = hashToken(token)
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, hashed)))
    .limit(1)

  if (!row) return false

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, hashed)))

  return row.expires.getTime() > Date.now()
}
