/**
 * Pure helpers for the admin guard — exported for unit testing.
 *
 * The async `requireAdmin()` lives in `./runtime.ts` to keep the auth.js
 * import chain out of unit tests.
 */

export type AdminRole = "admin" | "moderator"

export interface AdminMember {
  id: string
  email: string
  name: string | null
  image: string | null
  role: AdminRole
  reputation: number
  tier: "new" | "contributor" | "analyst" | "senior" | "fellow"
}

export class AdminAccessError extends Error {
  readonly code: "unauthenticated" | "insufficient"
  constructor(code: "unauthenticated" | "insufficient", message: string) {
    super(message)
    this.code = code
    this.name = "AdminAccessError"
  }
}

export function adminErrorStatus(err: AdminAccessError): 401 | 403 {
  return err.code === "unauthenticated" ? 401 : 403
}

export function mapUserRoleToAdmin(role: string | null | undefined): AdminRole | null {
  return role === "admin" ? "admin" : role === "moderator" ? "moderator" : null
}

export function tierIdFor(reputation: number): AdminMember["tier"] {
  if (reputation >= 250) return "fellow"
  if (reputation >= 100) return "senior"
  if (reputation >= 25) return "analyst"
  if (reputation >= 5) return "contributor"
  return "new"
}
