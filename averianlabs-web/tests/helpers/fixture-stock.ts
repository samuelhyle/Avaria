import { vials } from "@/db/schema"
import { db } from "@/lib/db"
import { eq, inArray, sql } from "drizzle-orm"

/**
 * Run a block with a known fixture stock, and restore the original afterwards.
 *
 * Creating an order decrements `vials.stockQty`; deleting the order does not
 * put it back. Other suites in this file consume the same fixtures, so the
 * stock is topped up to `minimum` for the duration of the block — a run must
 * not depend on what ran before it — and the original value is put back when
 * the block ends.
 */
export async function withFixtureStock<T>(
  skus: string[],
  run: () => Promise<T>,
  options: { minimum?: number } = {},
): Promise<T> {
  const minimum = options.minimum ?? 20
  const before = await db
    .select({ sku: vials.sku, stockQty: vials.stockQty })
    .from(vials)
    .where(inArray(vials.sku, skus))
  try {
    await db
      .update(vials)
      .set({ stockQty: sql`greatest(${vials.stockQty}, ${minimum})` })
      .where(inArray(vials.sku, skus))
    return await run()
  } finally {
    for (const row of before)
      await db.update(vials).set({ stockQty: row.stockQty }).where(eq(vials.sku, row.sku))
  }
}
