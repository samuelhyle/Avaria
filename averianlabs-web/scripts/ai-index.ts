/**
 * `pnpm ai:index` — CLI entry point for indexing the catalog into the RAG
 * tables. Idempotent; safe to run on every deploy.
 */

import { localEmbedderStatus } from "@/lib/ai/providers/local-embeddings"
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
    const local = localEmbedderStatus()
    if (local.error) {
      console.error(
        `[ai-index] ${report.skippedEmbeddings} chunk(s) were written WITHOUT embeddings — local embedder failed: ${local.error}. Vector search will miss them.`,
      )
      process.exit(1)
    }
    console.warn(
      `[ai-index] ${report.skippedEmbeddings} chunk(s) were written WITHOUT embeddings — MiniMax rate-limited and local embedder returned no vector for them. Vector search will miss them, but BM25 retrieval still works.`,
    )
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("[ai-index] failed", err)
  process.exit(1)
})
