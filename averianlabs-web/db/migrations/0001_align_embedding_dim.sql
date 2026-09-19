-- Align ai_document_chunks.embedding to EMBEDDING_DIM.
--
-- Why this migration exists:
-- The initial migration created the column as vector(1024), which matched
-- the original EMBEDDING_DIM value. When the local embedder (all-MiniLM-L6-v2)
-- was introduced, EMBEDDING_DIM was reduced to 384 to match the model's
-- native dimensionality, but the column was never resized. As a result,
-- inserts of 384-dim vectors into vector(1024) silently fail at runtime —
-- pgvector enforces exact dims, so the indexer would have crashed the
-- first time it tried to write a chunk.
--
-- At the time this migration was authored, no chunks had ever been written
-- (MiniMax is rate-limited for the project; the indexer only ever ran
-- against the local fallback, which surfaced its own 1002 cooldown error
-- before any insert). Recreating the column is therefore safe.
--
-- If you have existing 1024-dim embeddings you want to keep, write a
-- data-migration that projects them to 384 first (e.g. via PCA) before
-- running this schema change.

ALTER TABLE "ai_document_chunks" DROP COLUMN "embedding";
--> statement-breakpoint
ALTER TABLE "ai_document_chunks" ADD COLUMN "embedding" vector(384);
--> statement-breakpoint
-- Re-create the HNSW index on the new column. The previous index was
-- dropped implicitly when we dropped the column.
CREATE INDEX IF NOT EXISTS "ai_chunks_embedding_hnsw_idx" ON "ai_document_chunks" USING HNSW ("embedding" vector_cosine_ops);
--> statement-breakpoint
-- The `tsv` generated column was already created in the original migration;
-- recreated implicitly above via the table's GENERATED clause.