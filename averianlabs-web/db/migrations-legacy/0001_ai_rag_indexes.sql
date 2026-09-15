-- AI / RAG indexes (Phase A1)
--
-- Adds the supporting indexes that Drizzle doesn't model directly:
--   - GIN index on `tsv` for fast BM25 (`ts_rank`) lookups
--   - HNSW index on `embedding` for approximate nearest-neighbor (ANN) search
--     with cosine distance
--
-- Requires the `vector` extension to be installed on the Postgres instance.
-- On Neon, this is `CREATE EXTENSION IF NOT EXISTS vector` which is a
-- privileged operation — Neon supports it directly. On other providers you
-- may need superuser access or a pre-provisioned database.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS "ai_chunks_tsv_gin_idx"
  ON "ai_document_chunks"
  USING GIN ("tsv");

CREATE INDEX IF NOT EXISTS "ai_chunks_embedding_hnsw_idx"
  ON "ai_document_chunks"
  USING HNSW ("embedding" vector_cosine_ops);
