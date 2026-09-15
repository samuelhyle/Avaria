import crypto from "node:crypto"
import { getServerEnv } from "@/lib/env"

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header on cron routes.
 *
 * Fails closed: when CRON_SECRET is unset, no request is authorized — the
 * previous implementation compared against the literal string "Bearer undefined".
 * Comparison is timing-safe.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = getServerEnv().CRON_SECRET
  if (!secret) return false

  const header = req.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`

  const provided = Buffer.from(header)
  const wanted = Buffer.from(expected)
  if (provided.length !== wanted.length) return false
  return crypto.timingSafeEqual(provided, wanted)
}
