import { productTranslations, productWaitlist, products, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { and, desc, eq, sql } from "drizzle-orm"

export interface WaitlistEntry {
  id: string
  sku: string
  email: string
  name: string | null
  locale: string
  status: string
  createdAt: Date
  notifiedAt: Date | null
  productSlug: string | null
  productName: string | null
}

/**
 * The addresses that asked to be told when a lot was released.
 *
 * The storefront promises the mail and the maintenance sweep sends it, but
 * the promise is only worth something if the team can see who is waiting —
 * and if the mail provider is not configured, the outbox is where the
 * addresses are still sitting.
 */
export async function listWaitlistEntries(
  limit = 200,
  status?: "open" | "notified",
): Promise<WaitlistEntry[]> {
  const rows = await db
    .select({
      id: productWaitlist.id,
      sku: productWaitlist.sku,
      email: productWaitlist.email,
      name: productWaitlist.name,
      locale: productWaitlist.locale,
      status: productWaitlist.status,
      createdAt: productWaitlist.createdAt,
      notifiedAt: productWaitlist.notifiedAt,
      productSlug: products.slug,
      productName: productTranslations.name,
    })
    .from(productWaitlist)
    .leftJoin(vials, eq(vials.sku, productWaitlist.sku))
    .leftJoin(products, eq(products.id, vials.productId))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "en")),
    )
    .where(status ? eq(productWaitlist.status, status) : undefined)
    .orderBy(desc(productWaitlist.createdAt))
    .limit(limit)
  return rows
}

export async function countWaitlistEntries(): Promise<{ open: number; notified: number }> {
  const rows = await db
    .select({ status: productWaitlist.status, count: sql<number>`count(*)::int` })
    .from(productWaitlist)
    .groupBy(productWaitlist.status)
  const counts = { open: 0, notified: 0 }
  for (const row of rows) {
    if (row.status === "notified") counts.notified = row.count
    else counts.open = row.count
  }
  return counts
}
