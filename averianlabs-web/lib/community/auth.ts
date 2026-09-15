import { auth } from "@/lib/auth"
import { cache } from "react"
import type { ReputationTier } from "./reputation"
import { tierFor } from "./reputation"

export type ForumRole = "member" | "moderator" | "admin"

export interface Member {
  id: string
  email: string
  name: string | null
  image: string | null
  role: ForumRole
  reputation: number
  tier: ReputationTier
}

async function loadCurrentMember(): Promise<Member | null> {
  try {
    const session = await auth()
    const u = session?.user as
      | { id?: string; email?: string | null; name?: string | null; image?: string | null }
      | undefined
    const userId = u?.id
    if (!userId) return null

    const { db } = await import("@/lib/db")
    const { users } = await import("@/db/schema")
    const { eq } = await import("drizzle-orm")
    const row = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!row) return null
    const reputation = row.reputation ?? 0
    const forumRole: ForumRole =
      row.role === "admin" ? "admin" : row.role === "moderator" ? "moderator" : "member"
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? null,
      image: row.image ?? null,
      role: forumRole,
      reputation,
      tier: tierFor(reputation).id,
    }
  } catch {
    return null
  }
}

/**
 * Memoized per-request — several services call this independently (thread
 * page, reactions, plans), which previously produced duplicate auth + user
 * lookups on every render.
 */
export const getCurrentMember = cache(loadCurrentMember)

export async function requireMember(): Promise<Member> {
  const m = await getCurrentMember()
  if (!m) throw new ForumAuthError("Authentication required.")
  return m
}

export async function requireRole(roles: readonly ForumRole[]): Promise<Member> {
  const m = await requireMember()
  if (!roles.includes(m.role)) throw new ForumAuthError("Insufficient permissions.")
  return m
}

export class ForumAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ForumAuthError"
  }
}
