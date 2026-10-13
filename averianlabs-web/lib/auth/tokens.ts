import crypto from "node:crypto"
import { verificationTokens } from "@/db/schema"
import { db } from "@/lib/db"
import type { DbExecutor } from "@/lib/email/outbox"
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

export async function createToken(
  identifier: string,
  ttlMs: number,
  executor: DbExecutor = db,
): Promise<string> {
  const token = generateToken()
  await executor.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier))
  await executor
    .insert(verificationTokens)
    .values({ identifier, token: hashToken(token), expires: new Date(Date.now() + ttlMs) })
  return token
}

/** Single-use: deletes the row whether or not it had expired. */
export async function consumeToken(identifier: string, token: string): Promise<boolean> {
  const hashed = hashToken(token)
  // DELETE RETURNING is atomic: concurrent requests cannot both consume a token.
  const [row] = await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, hashed)))
    .returning({ expires: verificationTokens.expires })
  return Boolean(row && row.expires.getTime() > Date.now())
}
