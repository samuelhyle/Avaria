import { promotionRedemptions, promotions } from "@/db/schema"
import { db } from "@/lib/db"
import type { DbExecutor } from "@/lib/email/outbox"
import { and, eq, sql } from "drizzle-orm"

/**
 * Promotions — server-side discount rules.
 *
 * The client never decides a discount. It sends a code, the server resolves the
 * code against the `promotions` table, prices the discount, and folds the
 * result into the quote hash. A quote priced without a code therefore cannot be
 * spent with one, and a client that tampers with a discount amount is ignored
 * because the amount is recomputed from the lines on every request.
 */

export type PromotionKind = "percent" | "fixed" | "free_shipping"

export interface Promotion {
  id: string
  code: string
  kind: PromotionKind
  value: number
  minSubtotalCents: number
  maxRedemptions: number | null
  redemptionCount: number
  active: boolean
  startsAt: Date | null
  endsAt: Date | null
  label: string | null
}

/** Why a code did not apply. Surfaced to the customer verbatim. */
export type PromotionRejection =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "max_redemptions"

export interface PromotionResolution {
  promotion: Promotion | null
  rejection: PromotionRejection | null
  /** Discount on the product subtotal, in cents. Zero for `free_shipping`. */
  discountCents: number
  /** True when the code waives the delivery charge. */
  freeShipping: boolean
  /**
   * The amount the customer would have to reach for a rejected code to apply.
   * Only meaningful for a `min_subtotal` rejection.
   */
  requiredCents: number
}

/** Codes are compared case-insensitively and stored upper-case. */
export function normalisePromotionCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32)
}

const toPromotion = (row: typeof promotions.$inferSelect): Promotion => ({
  id: row.id,
  code: row.code,
  kind: row.kind as PromotionKind,
  value: row.value,
  minSubtotalCents: row.minSubtotalCents,
  maxRedemptions: row.maxRedemptions,
  redemptionCount: row.redemptionCount,
  active: row.active,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  label: row.label,
})

/**
 * Discount produced by a promotion, in cents. Never negative and never more
 * than the subtotal — a 100% code gives the products away, not a credit.
 */
export function computePromotionDiscount(
  promotion: Promotion,
  subtotalCents: number,
): { discountCents: number; freeShipping: boolean } {
  if (promotion.kind === "free_shipping") return { discountCents: 0, freeShipping: true }
  if (promotion.kind === "percent") {
    const percent = Math.min(100, Math.max(0, promotion.value))
    return {
      discountCents: Math.min(subtotalCents, Math.round((subtotalCents * percent) / 100)),
      freeShipping: false,
    }
  }
  const fixed = Math.max(0, promotion.value)
  return {
    discountCents: Math.min(subtotalCents, fixed),
    freeShipping: false,
  }
}

/**
 * Resolve a code against the current cart subtotal.
 *
 * Returns a rejection instead of throwing: the quote endpoint needs to price
 * the cart *without* the discount so the customer sees the real price, and the
 * checkout endpoint needs to reach the same conclusion to keep the quote hash
 * stable. Throwing would make the two paths disagree.
 */
export async function resolvePromotion(
  code: string,
  subtotalCents: number,
  executor: DbExecutor = db,
  now = new Date(),
): Promise<PromotionResolution> {
  const normalised = normalisePromotionCode(code)
  const empty: PromotionResolution = {
    promotion: null,
    rejection: null,
    discountCents: 0,
    freeShipping: false,
    requiredCents: 0,
  }
  if (!normalised) return { ...empty, rejection: "not_found" }
  const [row] = await executor
    .select()
    .from(promotions)
    .where(eq(promotions.code, normalised))
    .limit(1)
  if (!row) return { ...empty, rejection: "not_found" }
  const promotion = toPromotion(row)
  if (!promotion.active) return { ...empty, rejection: "inactive" }
  if (promotion.startsAt && promotion.startsAt > now) return { ...empty, rejection: "not_started" }
  if (promotion.endsAt && promotion.endsAt <= now) return { ...empty, rejection: "expired" }
  if (subtotalCents < promotion.minSubtotalCents)
    return {
      ...empty,
      rejection: "min_subtotal",
      requiredCents: promotion.minSubtotalCents,
    }
  if (promotion.maxRedemptions !== null && promotion.redemptionCount >= promotion.maxRedemptions)
    return { ...empty, rejection: "max_redemptions" }
  const { discountCents, freeShipping } = computePromotionDiscount(promotion, subtotalCents)
  return { promotion, rejection: null, discountCents, freeShipping, requiredCents: 0 }
}

export class PromotionError extends Error {
  constructor(
    message: string,
    readonly code: "promo_exhausted" | "promo_not_found",
  ) {
    super(message)
    this.name = "PromotionError"
  }
}

/**
 * Record one use of a promotion and bump its counter.
 *
 * The counter is incremented with a conditional UPDATE so two concurrent
 * orders cannot both take the last redemption. Runs inside the order
 * transaction, so a failed order rolls the redemption back with it.
 */
export async function recordPromotionRedemption(
  executor: DbExecutor,
  promotion: Promotion,
  orderId: string,
  email: string | undefined,
  discountCents: number,
): Promise<void> {
  const claimed = await executor
    .update(promotions)
    .set({
      redemptionCount: sql`${promotions.redemptionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(promotions.id, promotion.id),
        sql`(${promotions.maxRedemptions} is null or ${promotions.redemptionCount} < ${promotions.maxRedemptions})`,
      ),
    )
    .returning({ id: promotions.id })
  if (!claimed.length)
    throw new PromotionError("This promotion has no uses left", "promo_exhausted")
  await executor.insert(promotionRedemptions).values({
    promotionId: promotion.id,
    orderId,
    email,
    discountCents,
  })
}

/** Redemptions of a promotion, newest first. Used by the admin console. */
export async function listPromotionRedemptions(promotionId: string, limit = 50) {
  return db
    .select()
    .from(promotionRedemptions)
    .where(eq(promotionRedemptions.promotionId, promotionId))
    .orderBy(sql`${promotionRedemptions.createdAt} desc`)
    .limit(limit)
}
