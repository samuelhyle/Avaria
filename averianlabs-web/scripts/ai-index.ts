/**
 * `pnpm ai:index` — CLI entry point for indexing the catalog into the RAG
 * tables. Idempotent; safe to run on every deploy.
 */

import { indexAll } from "@/lib/ai/rag/indexer"

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Aborting.")
    process.exit(1)
  }
  if (!process.env.MINIMAX_API_KEY) {
    console.error("MINIMAX_API_KEY is not set. Aborting.")
    process.exit(1)
  }

  console.log("[ai-index] starting")
  const report = await indexAll()
  console.log(
    `[ai-index] done · docs=${report.documents} chunks=${report.chunks} embedded=${report.embedded} skipped=${report.skippedEmbeddings} in ${report.durationMs}ms`,
  )
  if (report.skippedEmbeddings > 0) {
    console.error(
      `[ai-index] ${report.skippedEmbeddings} chunk(s) were written WITHOUT embeddings — vector search will miss them. Check MiniMax embeddings access/quota and re-run.`,
    )
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("[ai-index] failed", err)
  process.exit(1)
})
