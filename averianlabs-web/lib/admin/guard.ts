/**
 * Centralized admin role-gating.
 *
 * Replaces the per-page `requireRole(["admin", "moderator"])` calls with
 * a single typed helper that returns a typed `AdminMember` and throws
 * an `AdminAccessError` that maps cleanly to a 403 response.
 *
 * Pages should:
 *
 *   import { requireAdmin } from "@/lib/admin/guard";
 *
 *   const member = await requireAdmin().catch(() => null);
 *   if (!member) return <ForbiddenShell />;
 */

import { users } from "@/db/schema"
import { auth } from "@/lib/auth"
import { type ReputationTier, tierFor } from "@/lib/community/reputation"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

export type AdminRole = "admin" | "moderator"

export interface AdminMember {
  id: string
  email: string
  name: string | null
  image: string | null
  role: AdminRole
  reputation: number
  tier: ReputationTier
}

export class AdminAccessError extends Error {
  readonly code: "unauthenticated" | "insufficient"
  constructor(code: "unauthenticated" | "insufficient", message: string) {
    super(message)
    this.code = code
    this.name = "AdminAccessError"
  }
}

/**
 * Returns the current member if they have admin or moderator role.
 * Throws `AdminAccessError` otherwise.
 *
 * Use this in server components + route handlers. For pages, prefer
 * `getAdminOrNull()` which returns null instead of throwing.
 */
export async function requireAdmin(): Promise<AdminMember> {
  const session = await auth()
  const u = session?.user as { id?: string } | undefined
  const userId = u?.id
  if (!userId) {
    throw new AdminAccessError("unauthenticated", "Authentication required.")
  }

  const row = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      reputation: users.reputation,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const r = row[0]
  if (!r) {
    throw new AdminAccessError("unauthenticated", "User not found.")
  }

  const role: AdminRole | null =
    r.role === "admin" ? "admin" : r.role === "moderator" ? "moderator" : null
  if (!role) {
    throw new AdminAccessError("insufficient", "Admin or moderator role required.")
  }

  return {
    id: r.id,
    email: r.email,
    name: r.name,
    image: r.image,
    role,
    reputation: r.reputation ?? 0,
    tier: tierFor(r.reputation ?? 0).id,
  }
}

/**
 * Same as `requireAdmin()` but returns null on failure instead of throwing.
 * Use in React Server Components that want to render a "Forbidden" shell.
 */
export async function getAdminOrNull(): Promise<AdminMember | null> {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}

/**
 * Determine the HTTP status code for an admin-access error.
 */
export function adminErrorStatus(err: AdminAccessError): 401 | 403 {
  return err.code === "unauthenticated" ? 401 : 403
}
