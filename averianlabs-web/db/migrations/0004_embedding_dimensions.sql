-- Align fresh databases with the current local embedding model and schema.
-- Existing compatible vectors are preserved. Never truncate/drop incompatible vectors.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ai_document_chunks"
    WHERE "embedding" IS NOT NULL AND vector_dims("embedding") <> 384
  ) THEN
    RAISE EXCEPTION 'Existing embeddings have incompatible dimensions; explicitly reindex before migrating to vector(384). No embeddings were removed.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "ai_document_chunks" ALTER COLUMN "embedding" TYPE vector(384) USING "embedding"::vector(384);
