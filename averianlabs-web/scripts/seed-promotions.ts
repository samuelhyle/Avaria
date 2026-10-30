/**
 * Seed the promotion codes the storefront advertises.
 *
 * Idempotent: existing codes are updated rather than duplicated, so this can
 * be re-run against a live database without creating a second row per code.
 *
 * These are real, server-side discounts. The client cannot grant itself one —
 * `quoteCart` resolves the code and folds the discount into the quote hash.
 */
import { promotions } from "@/db/schema"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

const seedPromotions = [
  {
    code: "RESEARCH10",
    kind: "percent" as const,
    value: 10,
    minSubtotalCents: 5_000,
    maxRedemptions: null,
    label: "10% off your order",
  },
  {
    code: "WELCOME15",
    kind: "percent" as const,
    value: 15,
    minSubtotalCents: 10_000,
    maxRedemptions: 100,
    label: "15% off your first order",
  },
  {
    code: "FREESHIP",
    kind: "free_shipping" as const,
    value: 0,
    minSubtotalCents: 0,
    maxRedemptions: null,
    label: "Free delivery",
  },
]

async function seed() {
  for (const promo of seedPromotions) {
    const [existing] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.code, promo.code))
      .limit(1)
    if (existing) {
      await db
        .update(promotions)
        .set({
          kind: promo.kind,
          value: promo.value,
          minSubtotalCents: promo.minSubtotalCents,
          maxRedemptions: promo.maxRedemptions,
          label: promo.label,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(promotions.id, existing.id))
      continue
    }
    await db.insert(promotions).values(promo)
  }
  console.log(`Seeded ${seedPromotions.length} promotions.`)
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
