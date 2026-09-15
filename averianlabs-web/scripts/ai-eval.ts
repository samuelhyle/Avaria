/**
 * `pnpm ai:eval` — measures retrieval recall@K against the golden dataset.
 *
 * Reports per-locale and overall recall, plus the queries that failed so a
 * reviewer can decide whether the goldens are wrong or the indexer needs
 * work. Exit code 1 if overall recall drops below `MIN_RECALL` (default 0.7).
 */

import { GOLDEN } from "@/lib/ai/eval/goldens"
import { embedBatch } from "@/lib/ai/rag/embeddings"
import { retrieveContext } from "@/lib/ai/rag/retrieval"
import type { Locale as ProductLocale } from "@/lib/products/types"

const TOP_K = 6
const MIN_RECALL = 0.7

interface EvalRow {
  locale: ProductLocale
  query: string
  expect: string[]
  retrieved: string[]
  hits: number
  recall: number
  passed: boolean
}

async function main() {
  // Retrieval hits the DB + embeddings; skip cleanly when the environment
  // doesn't have them (e.g. a CI runner without secrets) instead of failing.
  if (!process.env.DATABASE_URL || !process.env.MINIMAX_API_KEY) {
    console.warn("[ai-eval] DATABASE_URL and/or MINIMAX_API_KEY not set — skipping eval (exit 0).")
    process.exit(0)
  }

  // Optional cap for quick local smoke runs (e.g. AI_EVAL_LIMIT=8).
  const limit = Number.parseInt(process.env.AI_EVAL_LIMIT ?? "", 10)
  const entries = Number.isFinite(limit) && limit > 0 ? GOLDEN.slice(0, limit) : GOLDEN

  // Batch-embed every query up front (MiniMax accepts arrays; 1 RPM limit).
  console.log(`[ai-eval] embedding ${entries.length} queries (batched)...`)
  const embeddings = await embedBatch(entries.map((e) => e.query))

  const rows: EvalRow[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue
    const retrieved = await retrieveContext({
      query: entry.query,
      locale: entry.locale,
      topK: TOP_K,
      embedding: embeddings[i] ?? undefined,
    })
    const retrievedIds = retrieved.map((r) => r.sourceId)
    const hits = entry.expectSourceIds.filter((id) => retrievedIds.includes(id)).length
    const recall = entry.expectSourceIds.length > 0 ? hits / entry.expectSourceIds.length : 1
    rows.push({
      locale: entry.locale,
      query: entry.query,
      expect: entry.expectSourceIds,
      retrieved: retrievedIds,
      hits,
      recall,
      passed: hits === entry.expectSourceIds.length,
    })
  }

  const overallRecall = rows.reduce((acc, r) => acc + r.recall, 0) / rows.length
  const byLocale = new Map<ProductLocale, { total: number; sum: number; queries: number }>()
  for (const r of rows) {
    const cur = byLocale.get(r.locale) ?? { total: 0, sum: 0, queries: 0 }
    cur.total += 1
    cur.sum += r.recall
    cur.queries += 1
    byLocale.set(r.locale, cur)
  }

  console.log("\n=== Averia retrieval eval ===")
  console.log(`queries:  ${rows.length}`)
  console.log(`top-K:    ${TOP_K}`)
  console.log(`overall recall: ${(overallRecall * 100).toFixed(1)}%`)
  console.log("\nper-locale:")
  const localeOrder: ProductLocale[] = ["en", "fi", "de", "sv", "nl"]
  for (const loc of localeOrder) {
    const agg = byLocale.get(loc)
    if (!agg) continue
    const mean = agg.sum / agg.total
    const bar = "█".repeat(Math.round(mean * 10)) + "░".repeat(10 - Math.round(mean * 10))
    console.log(`  ${loc}  ${(mean * 100).toFixed(1).padStart(5)}%  ${bar}  ${agg.queries} queries`)
  }

  const failures = rows.filter((r) => !r.passed)
  if (failures.length > 0) {
    console.log(`\nfailures (${failures.length}):`)
    for (const f of failures) {
      const missing = f.expect.filter((id) => !f.retrieved.includes(id))
      console.log(`  [${f.locale}] "${f.query}"`)
      console.log(`     expected: ${JSON.stringify(f.expect)}`)
      console.log(`     got:      ${JSON.stringify(f.retrieved)}`)
      console.log(`     missing:  ${JSON.stringify(missing)}`)
    }
  }

  if (overallRecall < MIN_RECALL) {
    console.error(`\nFAIL: recall ${overallRecall.toFixed(3)} < ${MIN_RECALL}`)
    process.exit(1)
  }

  console.log("\nOK")
  process.exit(0)
}

main().catch((err) => {
  console.error("[ai-eval] failed", err)
  process.exit(1)
})
