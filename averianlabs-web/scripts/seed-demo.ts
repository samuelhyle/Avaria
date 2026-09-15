/**
 * Seed demo data — community plans, threads, posts, reactions, and documents.
 *
 * Idempotent: re-running won't duplicate records (uses ON CONFLICT / unique
 * slugs where possible, and checks for existing rows before inserting).
 *
 * Usage:
 *   pnpm tsx scripts/seed-demo.ts
 */

import {
  batches,
  documents,
  forumCategories,
  forumPosts,
  forumReactions,
  forumThreads,
  products,
  researchPlanItems,
  researchPlans,
  users,
} from "@/db/schema"
import { emitActivity } from "@/lib/activity/emit"
import { CATEGORY_SEEDS } from "@/lib/community/categories"
import { tierFor } from "@/lib/community/reputation"
import { db } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"

const DEMO_USER_ID = "demo-user-alex"

async function seedUser() {
  const existing = await db.select().from(users).where(eq(users.id, DEMO_USER_ID)).limit(1)
  if (existing[0]) return existing[0]
  const [row] = await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      email: "alex@example.org",
      name: "Alex Mercier",
      role: "customer",
      reputation: 42,
      reputationTier: "analyst",
      emailVerifiedAt: new Date(),
    })
    .returning()
  return row
}

async function seedCategories() {
  const existing = await db.select({ slug: forumCategories.slug }).from(forumCategories)
  const existingSlugs = new Set(existing.map((r) => r.slug))
  for (const seed of CATEGORY_SEEDS) {
    if (existingSlugs.has(seed.slug)) continue
    await db
      .insert(forumCategories)
      .values({
        slug: seed.slug,
        nameKey: seed.nameKey,
        descriptionKey: seed.descriptionKey,
        sortOrder: seed.sortOrder,
      })
      .onConflictDoNothing()
  }
  return db.select().from(forumCategories)
}

async function seedThreads(userId: string) {
  const categories = await db.select().from(forumCategories)
  const bySlug = new Map(categories.map((c) => [c.slug, c]))
  const announcements = bySlug.get("announcements")
  const research = bySlug.get("research-discussion")
  const methods = bySlug.get("methods-analysis")
  const documentation = bySlug.get("documentation-coa")
  if (!announcements || !research || !methods || !documentation) {
    console.warn("[seed] categories missing — skipping thread seed")
    return
  }

  const seeds = [
    {
      categoryId: announcements.id,
      title: "New 2026 batch release schedule",
      slug: "2026-batch-schedule",
      body: "We've released the 2026-Q2 batches for BPC-157, TB-500, GHK-Cu, and Tirzepatide. All lots carry full COA + mass-spec confirmation. Endotoxin panels are below 2 EU/mg across the board.",
    },
    {
      categoryId: research.id,
      title: "Anyone running head-to-head BPC-157 vs TB-500 in tendon models?",
      slug: "bpc-vs-tb-tendon-models",
      body: "Curious if anyone has a reproducible in vitro assay comparing fibroblast outgrowth between the two. BPC alone, TB-500 alone, and combo. We've been seeing interesting synergy in the combo wells.",
    },
    {
      categoryId: methods.id,
      title: "How do you read endotoxin curves when LAL is borderline?",
      slug: "endotoxin-lal-borderline",
      body: "Got a batch at 4.8 EU/mg. Spec is <5 EU/mg. Technically passes, but the LAL curve looks odd — anyone seen this before? Recalibrated with a fresh standard and got the same number.",
    },
    {
      categoryId: documentation.id,
      title: "COA request — what's the typical turnaround?",
      slug: "coa-request-turnaround",
      body: "I asked for an older batch's COA via support. They came back in 24h with a signed PDF and revision history. Has anyone seen them decline a request?",
    },
  ]

  for (const s of seeds) {
    const existing = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.slug, s.slug))
      .limit(1)
    if (existing[0]) continue
    const threadId = crypto.randomUUID()
    const postId = crypto.randomUUID()
    await db.insert(forumThreads).values({
      id: threadId,
      categoryId: s.categoryId,
      authorId: userId,
      slug: s.slug,
      title: s.title,
      status: "active",
      viewCount: Math.floor(Math.random() * 200),
      replyCount: 1,
    })
    await db.insert(forumPosts).values({
      id: postId,
      threadId,
      authorId: userId,
      body: s.body,
      status: "active",
    })
    emitActivity({
      kind: "thread_created",
      actorId: userId,
      actorName: "Alex Mercier",
      targetType: "thread",
      targetId: threadId,
      targetSlug: s.slug,
      targetTitle: s.title,
    })
  }
}

async function seedDemoPlan(userId: string) {
  const slug = "tendon-repair-panel"
  const existing = await db
    .select()
    .from(researchPlans)
    .where(eq(researchPlans.shareSlug, slug))
    .limit(1)
  if (existing[0]) return existing[0]

  const planId = crypto.randomUUID()
  await db.insert(researchPlans).values({
    id: planId,
    ownerId: userId,
    title: "Tendon repair panel",
    notes:
      "Common combination for tendon-recovery research models in vitro. Each component below ships with a separate COA — this plan just bundles the order.",
    shareSlug: slug,
    isPublic: true,
  })

  const allProducts = await db.select().from(products).limit(8)
  if (allProducts.length === 0) return null

  // Pick BPC-157, TB-500, GHK-Cu by slug if present
  const wanted = ["bpc-157", "tb-500", "ghk-cu"]
  const picks = allProducts.filter((p) => wanted.includes(p.slug))
  if (picks.length === 0) {
    // fall back to first 3
    picks.push(...allProducts.slice(0, 3))
  }
  for (let i = 0; i < picks.length; i++) {
    const item = picks[i]
    if (!item) continue
    await db.insert(researchPlanItems).values({
      id: crypto.randomUUID(),
      planId,
      productId: item.id,
      quantity: 1,
      sortOrder: i,
    })
  }

  emitActivity({
    kind: "plan_shared",
    actorId: userId,
    actorName: "Alex Mercier",
    targetType: "plan",
    targetId: planId,
    targetSlug: slug,
    targetTitle: "Tendon repair panel",
  })

  return { id: planId, slug }
}

async function seedDemoDocuments() {
  // Pick the first 3 products and create a COA + SDS for each.
  const allProducts = await db.select().from(products).limit(3)
  const [b1] = await db.select().from(batches).limit(1)

  for (const p of allProducts) {
    const title = `${p.slug.toUpperCase()} — COA — 2026-Q2 batch`
    const existing = await db
      .select()
      .from(documents)
      .where(and(eq(documents.productId, p.id), eq(documents.title, title)))
      .limit(1)
    if (existing[0]) continue

    await db.insert(documents).values({
      id: crypto.randomUUID(),
      type: "coa",
      productId: p.id,
      batchId: b1?.id ?? null,
      title,
      version: "1.0",
      fileR2Key: `documents/${p.slug}-2026q2-coa.pdf`,
      externalUrl: "https://example.org/sample.pdf",
    })
  }
}

async function seedReaction(userId: string) {
  const [firstThread] = await db
    .select()
    .from(forumThreads)
    .where(eq(forumThreads.slug, "bpc-vs-tb-tendon-models"))
    .limit(1)
  if (!firstThread) return
  const [firstPost] = await db
    .select()
    .from(forumPosts)
    .where(eq(forumPosts.threadId, firstThread.id))
    .limit(1)
  if (!firstPost) return

  const existing = await db
    .select()
    .from(forumReactions)
    .where(
      and(
        eq(forumReactions.postId, firstPost.id),
        eq(forumReactions.userId, userId),
        eq(forumReactions.kind, "insightful"),
      ),
    )
    .limit(1)
  if (existing[0]) return

  await db.insert(forumReactions).values({
    id: crypto.randomUUID(),
    postId: firstPost.id,
    userId,
    kind: "insightful",
  })
  if (firstPost.authorId) {
    await db
      .update(users)
      .set({ reputation: sql`${users.reputation} + 1` })
      .where(eq(users.id, firstPost.authorId))
    const [updated] = await db
      .select({ reputation: users.reputation })
      .from(users)
      .where(eq(users.id, firstPost.authorId))
      .limit(1)
    if (updated) {
      await db
        .update(users)
        .set({ reputationTier: tierFor(updated.reputation ?? 0).id })
        .where(eq(users.id, firstPost.authorId))
    }
  }
}

async function main() {
  console.log("🌱 Seeding demo data…")

  const user = await seedUser()
  if (!user) {
    console.error("Failed to seed demo user")
    process.exit(1)
  }
  console.log(`  ✓ demo user: ${user.email}`)

  const categories = await seedCategories()
  console.log(`  ✓ ${categories.length} forum categories`)

  await seedThreads(user.id)
  console.log("  ✓ 4 demo threads + posts")

  await seedDemoPlan(user.id)
  console.log("  ✓ demo research plan: tendon-repair-panel")

  await seedDemoDocuments()
  console.log("  ✓ 3 demo COA documents")

  await seedReaction(user.id)
  console.log("  ✓ demo reaction + reputation bump")

  console.log("✅ Done. Run pnpm dev to see it.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
