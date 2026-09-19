import { productTranslations, products, researchPlanItems, researchPlans } from "@/db/schema"
import { emitActivity } from "@/lib/activity/emit"
import { requireMember } from "@/lib/community/auth"
import { db } from "@/lib/db"
/**
 * Saved research plans — CRUD + share slugs.
 *
 * A "research plan" is a curated bundle of products + notes that a member
 * can save privately or share publicly via a 9-byte base64url slug.
 *
 * Ported from helix-labs-store v1 (`app/api/plans/`). Reuses the existing
 * `lib/community` auth helpers for session resolution.
 */
import { and, asc, desc, eq, inArray, or } from "drizzle-orm"
import { cache } from "react"
import { generateShareSlug } from "./share-slug"

export interface PlanItemView {
  id: string
  productId: string
  productSlug: string
  productName: string
  productTagline: string | null
  quantity: number
  sortOrder: number
}

export interface PlanView {
  id: string
  ownerId: string
  title: string
  notes: string | null
  shareSlug: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  items: PlanItemView[]
}

type PlanRow = typeof researchPlans.$inferSelect

interface RawItem {
  id: string
  planId: string
  productId: string
  quantity: number
  sortOrder: number
  slug: string
  name: string | null
  tagline: string | null
}

function toItemView(it: RawItem): PlanItemView {
  return {
    id: it.id,
    productId: it.productId,
    productSlug: it.slug,
    productName: it.name ?? it.slug,
    productTagline: it.tagline ?? null,
    quantity: it.quantity,
    sortOrder: it.sortOrder,
  }
}

function toPlanView(plan: PlanRow, items: PlanItemView[]): PlanView {
  return {
    id: plan.id,
    ownerId: plan.ownerId,
    title: plan.title,
    notes: plan.notes,
    shareSlug: plan.shareSlug,
    isPublic: plan.isPublic,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    items,
  }
}

/** Loads items for many plans in one query (previously one query per plan). */
async function loadItemsByPlan(planIds: string[]): Promise<Map<string, PlanItemView[]>> {
  const grouped = new Map<string, PlanItemView[]>()
  if (planIds.length === 0) return grouped

  const rows = await db
    .select({
      id: researchPlanItems.id,
      planId: researchPlanItems.planId,
      productId: researchPlanItems.productId,
      quantity: researchPlanItems.quantity,
      sortOrder: researchPlanItems.sortOrder,
      slug: products.slug,
      name: productTranslations.name,
      tagline: productTranslations.tagline,
    })
    .from(researchPlanItems)
    .innerJoin(products, eq(researchPlanItems.productId, products.id))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "en")),
    )
    .where(inArray(researchPlanItems.planId, planIds))
    .orderBy(asc(researchPlanItems.sortOrder))

  for (const row of rows) {
    const list = grouped.get(row.planId) ?? []
    list.push(toItemView(row))
    grouped.set(row.planId, list)
  }
  return grouped
}

export async function listPlansForOwner(ownerId: string): Promise<PlanView[]> {
  const rows = await db
    .select()
    .from(researchPlans)
    .where(eq(researchPlans.ownerId, ownerId))
    .orderBy(desc(researchPlans.updatedAt))

  if (rows.length === 0) return []

  const itemsByPlan = await loadItemsByPlan(rows.map((p) => p.id))
  return rows.map((p) => toPlanView(p, itemsByPlan.get(p.id) ?? []))
}

export async function getPlanForOwner(planId: string, ownerId: string): Promise<PlanView | null> {
  const [plan] = await db
    .select()
    .from(researchPlans)
    .where(and(eq(researchPlans.id, planId), eq(researchPlans.ownerId, ownerId)))
    .limit(1)
  if (!plan) return null
  const items = await loadItemsByPlan([plan.id])
  return toPlanView(plan, items.get(plan.id) ?? [])
}

export const getPlanByShareSlug = cache(async (slug: string): Promise<PlanView | null> => {
  try {
    const [plan] = await db
      .select()
      .from(researchPlans)
      .where(and(eq(researchPlans.shareSlug, slug), eq(researchPlans.isPublic, true)))
      .limit(1)
    if (!plan) return null
    const items = await loadItemsByPlan([plan.id])
    return toPlanView(plan, items.get(plan.id) ?? [])
  } catch {
    // DB unconfigured / unavailable — treat the share as not-found so the
    // /en/plans/[slug] page degrades to a 404 instead of 500. The chat
    // route already does this same pattern (see route.ts).
    return null
  }
})

export interface CreatePlanInput {
  title: string
  notes?: string
}

export async function createPlan(
  input: CreatePlanInput,
): Promise<{ ok: true; planId: string } | { ok: false; reason: string }> {
  const member = await requireMember()
  const title = input.title.trim()
  if (title.length < 3 || title.length > 140) {
    return { ok: false, reason: "Title must be 3–140 characters." }
  }
  const planId = crypto.randomUUID()
  await db.insert(researchPlans).values({
    id: planId,
    ownerId: member.id,
    title,
    notes: input.notes?.trim() || null,
  })
  return { ok: true, planId }
}

export async function updatePlan(
  planId: string,
  input: Partial<{ title: string; notes: string }>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const member = await requireMember()
  const [existing] = await db
    .select({ ownerId: researchPlans.ownerId })
    .from(researchPlans)
    .where(eq(researchPlans.id, planId))
    .limit(1)
  if (!existing) return { ok: false, reason: "Plan not found." }
  if (existing.ownerId !== member.id) return { ok: false, reason: "Not your plan." }

  const patch: Partial<{ title: string; notes: string | null; updatedAt: Date }> = {
    updatedAt: new Date(),
  }
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (t.length < 3 || t.length > 140)
      return { ok: false, reason: "Title must be 3–140 characters." }
    patch.title = t
  }
  if (input.notes !== undefined) {
    patch.notes = input.notes.trim() || null
  }
  await db.update(researchPlans).set(patch).where(eq(researchPlans.id, planId))
  return { ok: true }
}

export async function deletePlan(
  planId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const member = await requireMember()
  const [existing] = await db
    .select({ ownerId: researchPlans.ownerId })
    .from(researchPlans)
    .where(eq(researchPlans.id, planId))
    .limit(1)
  if (!existing) return { ok: false, reason: "Plan not found." }
  if (existing.ownerId !== member.id) return { ok: false, reason: "Not your plan." }
  await db.delete(researchPlans).where(eq(researchPlans.id, planId))
  return { ok: true }
}

export async function addItemToPlan(
  planId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const member = await requireMember()
  const [plan] = await db
    .select({ ownerId: researchPlans.ownerId })
    .from(researchPlans)
    .where(eq(researchPlans.id, planId))
    .limit(1)
  if (!plan) return { ok: false, reason: "Plan not found." }
  if (plan.ownerId !== member.id) return { ok: false, reason: "Not your plan." }

  // Verify product exists — accept either the UUID or the slug so product-page
  // callers can pass the slug they already have.
  const [p] = await db
    .select({ id: products.id })
    .from(products)
    .where(or(eq(products.id, productId), eq(products.slug, productId)))
    .limit(1)
  if (!p) return { ok: false, reason: "Product not found." }

  // Get max sortOrder
  const [maxRow] = await db
    .select({ max: researchPlanItems.sortOrder })
    .from(researchPlanItems)
    .where(eq(researchPlanItems.planId, planId))
    .orderBy(desc(researchPlanItems.sortOrder))
    .limit(1)
  const nextSort = (maxRow?.max ?? -1) + 1

  await db.insert(researchPlanItems).values({
    id: crypto.randomUUID(),
    planId,
    productId: p.id,
    quantity: 1,
    sortOrder: nextSort,
  })
  await db.update(researchPlans).set({ updatedAt: new Date() }).where(eq(researchPlans.id, planId))
  return { ok: true }
}

export async function removeItemFromPlan(
  planId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const member = await requireMember()
  const [plan] = await db
    .select({ ownerId: researchPlans.ownerId })
    .from(researchPlans)
    .where(eq(researchPlans.id, planId))
    .limit(1)
  if (!plan) return { ok: false, reason: "Plan not found." }
  if (plan.ownerId !== member.id) return { ok: false, reason: "Not your plan." }

  await db
    .delete(researchPlanItems)
    .where(and(eq(researchPlanItems.id, itemId), eq(researchPlanItems.planId, planId)))
  await db.update(researchPlans).set({ updatedAt: new Date() }).where(eq(researchPlans.id, planId))
  return { ok: true }
}

/**
 * Toggle a plan's public visibility. When made public, a share slug is generated
 * (and any previous one is overwritten). When made private, the share slug is
 * cleared. Emits a `plan_shared` activity event when visibility flips.
 */
export async function sharePlan(
  planId: string,
  isPublic: boolean,
): Promise<{ ok: true; shareSlug: string | null } | { ok: false; reason: string }> {
  const member = await requireMember()
  const [plan] = await db
    .select({ ownerId: researchPlans.ownerId, title: researchPlans.title })
    .from(researchPlans)
    .where(eq(researchPlans.id, planId))
    .limit(1)
  if (!plan) return { ok: false, reason: "Plan not found." }
  if (plan.ownerId !== member.id) return { ok: false, reason: "Not your plan." }

  let shareSlug: string | null
  if (isPublic) {
    shareSlug = generateShareSlug()
    await db
      .update(researchPlans)
      .set({ isPublic: true, shareSlug, updatedAt: new Date() })
      .where(eq(researchPlans.id, planId))
    await emitActivity({
      kind: "plan_shared",
      actorId: member.id,
      actorName: member.name,
      targetType: "plan",
      targetId: planId,
      targetSlug: shareSlug,
      targetTitle: plan.title,
    })
  } else {
    shareSlug = null
    await db
      .update(researchPlans)
      .set({ isPublic: false, shareSlug: null, updatedAt: new Date() })
      .where(eq(researchPlans.id, planId))
  }
  return { ok: true, shareSlug }
}
