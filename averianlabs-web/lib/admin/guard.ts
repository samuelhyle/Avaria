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

import { AdminAccessError, type AdminMember, type AdminRole, mapUserRoleToAdmin } from "./types"

export type { AdminRole, AdminMember, AdminTier } from "./types"
export { AdminAccessError, adminErrorStatus, mapUserRoleToAdmin } from "./types"

export type { ReputationTier }

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

  const role = mapUserRoleToAdmin(r.role)
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
export async function getAdminOrNull(): Promise<Awaited<ReturnType<typeof requireAdmin>> | null> {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}
