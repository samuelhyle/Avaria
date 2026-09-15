import { users } from "@/db/schema"
/**
 * Runtime admin guard. Re-exports the pure helpers from `./types` so the
 * rest of the codebase can keep importing from `@/lib/admin` unchanged,
 * and adds the async server-only functions that need Auth.js.
 */
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import {
  AdminAccessError,
  type AdminMember,
  type AdminRole,
  adminErrorStatus,
  mapUserRoleToAdmin,
  tierIdFor,
} from "./types"

export {
  AdminAccessError,
  adminErrorStatus,
  mapUserRoleToAdmin,
  tierIdFor,
  type AdminMember,
  type AdminRole,
} from "./types"

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
    tier: tierIdFor(r.reputation ?? 0),
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
