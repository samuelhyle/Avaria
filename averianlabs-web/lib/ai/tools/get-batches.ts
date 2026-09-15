/**
 * getBatches — list the most recent batches for a product.
 *
 * Reads the live `batches` table first (with the product's vials joined by
 * slug) and falls back to the static catalog's `latestBatch` when the DB has
 * no rows or is unreachable — so stock/COA answers never silently go stale.
 */

import { batches, products as productsTable, vials } from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { products } from "@/lib/products/data"
import { desc, eq } from "drizzle-orm"

interface Args {
  slug: string
}

interface BatchView {
  code: string
  manufacturedAt: string
  expiresAt: string
  hplcPurity: number
  endotoxinEUPerMg: number
  msConfirmed: boolean
  lab: string
}

async function batchesFromDb(slug: string, limit: number): Promise<BatchView[] | null> {
  try {
    const rows = await db
      .select({
        code: batches.code,
        manufacturedAt: batches.manufacturedAt,
        expiresAt: batches.expiresAt,
        hplcPurity: batches.hplcPurity,
        endotoxinEUPerMg: batches.endotoxinEUPerMg,
        msConfirmed: batches.msConfirmed,
        lab: batches.lab,
      })
      .from(batches)
      .innerJoin(vials, eq(vials.id, batches.vialId))
      .innerJoin(productsTable, eq(productsTable.id, vials.productId))
      .where(eq(productsTable.slug, slug))
      .orderBy(desc(batches.manufacturedAt))
      .limit(limit)

    if (rows.length === 0) return null
    return rows.map((r) => ({
      code: r.code,
      manufacturedAt: r.manufacturedAt.toISOString().slice(0, 10),
      expiresAt: r.expiresAt.toISOString().slice(0, 10),
      hplcPurity: r.hplcPurity,
      endotoxinEUPerMg: r.endotoxinEUPerMg,
      msConfirmed: r.msConfirmed,
      lab: r.lab,
    }))
  } catch (err) {
    console.warn("[getBatches] DB lookup failed, falling back to catalog:", err)
    return null
  }
}

export const getBatchesTool: Tool = {
  definition: {
    name: "getBatches",
    description:
      "Return recent batches with HPLC purity, endotoxin level, mass-spec confirmation, and lab for a given product slug. Returns an empty array if no batch data has been published.",
    parameters: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Product slug.",
        },
      },
      required: ["slug"],
    },
  },
  async execute(rawArgs, _ctx: ToolContext): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const p = products.find((x) => x.slug === args.slug)

    const dbBatches = args.slug ? await batchesFromDb(args.slug, 3) : null
    if (dbBatches && dbBatches.length > 0) {
      return {
        content: {
          slug: args.slug,
          productName: p?.defaultTranslation.name ?? args.slug,
          source: "database",
          batches: dbBatches,
        },
      }
    }

    if (!p) return { content: { error: "not_found", slug: args.slug, batches: [] } }
    return {
      content: {
        slug: p.slug,
        productName: p.defaultTranslation.name,
        source: "catalog",
        batches: p.latestBatch ? [p.latestBatch] : [],
      },
    }
  },
}
