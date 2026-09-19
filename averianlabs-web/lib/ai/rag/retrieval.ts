/**
 * Hybrid retrieval over `ai_document_chunks`.
 *
 * Combines two signals with Reciprocal Rank Fusion (RRF):
 *   - BM25 over the generated `tsv` tsvector column (Postgres `ts_rank`)
 *   - Cosine similarity over the `embedding` column (pgvector)
 *
 * Each ranker returns its top-K. We compute `score = Σ 1/(k + rank)` for both
 * lists per chunk id, sort by score, return the top-N.
 *
 * Falls back to BM25-only when embeddings aren't available (e.g. the indexer
 * hasn't been run, or the embedding call failed).
 */

import { EMBEDDING_DIM, aiDocumentChunks, aiDocuments } from "@/db/schema/ai"
import { embedText } from "@/lib/ai/providers/minimax"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { and, eq, inArray, sql } from "drizzle-orm"

export interface RetrievedChunk {
  id: string
  documentId: string
  source: string
  sourceId: string
  locale: string
  title: string
  url: string | null
  content: string
  /** Hybrid score after RRF. */
  score: number
  /** Individual ranker scores for diagnostics. */
  bm25Rank: number | null
  vectorRank: number | null
  /** 0-based position of the chunk within its source document. */
  position: number
}

export interface RetrieveOptions {
  query: string
  locale: string
  /** Final top-N after fusion. Default 8. */
  topK?: number
  /** Per-ranker candidate pool size. Default 30. */
  candidateK?: number
  /** RRF k constant. Default 60. */
  rrfK?: number
  /** Restrict to a single source (e.g. "product"). Optional. */
  source?: string
  /** Pre-computed query embedding (used by the eval runner to batch calls). */
  embedding?: number[]
}

const DEFAULT_TOP_K = 8
const DEFAULT_CANDIDATE_K = 30
const DEFAULT_RRF_K = 60

/**
 * Postgres text-search config per locale — gives stemming for fi/de/sv/nl
 * instead of the language-agnostic `simple` config. (For very large corpora
 * this expression scan should be replaced with per-locale generated tsvector
 * columns + GIN indexes; at the current corpus size it is comfortably fast.)
 */
const LOCALE_TS_CONFIG: Record<string, string> = {
  en: "english",
  fi: "finnish",
  de: "german",
  sv: "swedish",
  nl: "dutch",
}

function tsConfigFor(locale: string): string {
  return LOCALE_TS_CONFIG[locale] ?? "simple"
}

/** Cast to `unknown as number[]` so Drizzle's string-encoded vector binds cleanly. */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`
}

export async function retrieveContext(opts: RetrieveOptions): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? DEFAULT_TOP_K
  const candidateK = opts.candidateK ?? DEFAULT_CANDIDATE_K
  const rrfK = opts.rrfK ?? DEFAULT_RRF_K

  // 1 & 2. BM25 candidates and the query embedding are independent — run them
  //        concurrently, then run the vector search with the embedding.
  const [bm25Candidates, queryEmbedding] = await Promise.all([
    bm25Search({
      query: opts.query,
      locale: opts.locale,
      limit: candidateK,
      source: opts.source,
    }),
    opts.embedding ?? embedText(opts.query),
  ])
  const vectorCandidates = queryEmbedding
    ? await vectorSearch({
        embedding: queryEmbedding,
        locale: opts.locale,
        limit: candidateK,
        source: opts.source,
      })
    : []

  // 3. RRF fusion.
  const byId = new Map<string, RetrievedChunk>()
  const setRank = (id: string, rank: number, kind: "bm25" | "vector") => {
    const existing = byId.get(id)
    if (existing) {
      existing.score += 1 / (rrfK + rank)
      if (kind === "bm25") existing.bm25Rank = rank
      else existing.vectorRank = rank
    } else {
      // Lazy — we'll fill metadata after merge.
      byId.set(id, {
        id,
        documentId: "",
        source: "",
        sourceId: "",
        locale: opts.locale,
        title: "",
        url: null,
        content: "",
        score: 1 / (rrfK + rank),
        bm25Rank: kind === "bm25" ? rank : null,
        vectorRank: kind === "vector" ? rank : null,
        position: 0,
      })
    }
  }

  bm25Candidates.forEach((c, i) => setRank(c.id, i + 1, "bm25"))
  vectorCandidates.forEach((c, i) => setRank(c.id, i + 1, "vector"))

  // 4. Hydrate metadata for surviving ids.
  const ids = Array.from(byId.keys())
  if (ids.length === 0) return []

  const rows = await db
    .select({
      id: aiDocumentChunks.id,
      documentId: aiDocumentChunks.documentId,
      position: aiDocumentChunks.position,
      content: aiDocumentChunks.content,
      locale: aiDocumentChunks.locale,
      source: aiDocuments.source,
      sourceId: aiDocuments.sourceId,
      title: aiDocuments.title,
      url: aiDocuments.url,
    })
    .from(aiDocumentChunks)
    .innerJoin(aiDocuments, eq(aiDocuments.id, aiDocumentChunks.documentId))
    .where(inArray(aiDocumentChunks.id, ids))

  for (const row of rows) {
    const existing = byId.get(row.id)
    if (!existing) continue
    existing.documentId = row.documentId
    existing.position = row.position
    existing.content = row.content
    existing.locale = row.locale
    existing.source = row.source
    existing.sourceId = row.sourceId
    existing.title = row.title
    existing.url = row.url
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

interface RankerOpts {
  query: string
  locale: string
  limit: number
  source?: string
}

interface RankerRow {
  id: string
  score: number
}

async function bm25Search(opts: RankerOpts): Promise<RankerRow[]> {
  const config = tsConfigFor(opts.locale)
  const tsvector = sql`to_tsvector(${config}::regconfig, coalesce(${aiDocumentChunks.content}, ''))`
  // Permissive OR'd lexeme query, built by extracting the stemmed tokens
  // from the input and joining them with `|`. This handles natural-language
  // queries where `websearch_to_tsquery` / `plainto_tsquery` would AND every
  // token (including stems of filler words like "Anything" that don't appear
  // in any chunk) and return zero results. The vector search + RRF still
  // rank the resulting candidates precisely.
  //
  // Edge case: when the input has no usable lexemes (all stop words / pure
  // punctuation), the subquery produces '' which to_tsquery rejects with
  // "text-search query doesn't contain lexemes". Fall back to a non-matching
  // tsquery so the AND filter rejects everything — vector search still runs.
  const tsquery = sql`(
    SELECT CASE
      WHEN string_agg(lexeme, ' | ') IS NULL OR string_agg(lexeme, ' | ') = ''
      THEN '!a'::tsquery
      ELSE to_tsquery(string_agg(lexeme, ' | '))
    END
    FROM unnest(to_tsvector(${config}::regconfig, ${opts.query}))
    WHERE length(lexeme) > 2
  )`

  const filters = [eq(aiDocumentChunks.locale, opts.locale), sql`${tsvector} @@ ${tsquery}`]
  if (opts.source) filters.push(eq(aiDocuments.source, opts.source))

  const result = await db.execute(sql`
    SELECT ${aiDocumentChunks.id} AS id, ts_rank(${tsvector}, ${tsquery}) AS score
    FROM ${aiDocumentChunks}
    INNER JOIN ${aiDocuments} ON ${aiDocuments.id} = ${aiDocumentChunks.documentId}
    WHERE ${and(...filters)}
    ORDER BY score DESC
    LIMIT ${opts.limit}
  `)
  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? [])
  ) as Array<{
    id: string
    score: number
  }>

  return rows.map((r) => ({ id: r.id, score: Number(r.score) }))
}

interface VectorOpts {
  embedding: number[]
  locale: string
  limit: number
  source?: string
}

async function vectorSearch(opts: VectorOpts): Promise<RankerRow[]> {
  if (opts.embedding.length !== EMBEDDING_DIM) {
    // Embedding dim mismatch means the index will silently score everything at
    // distance 1.0 anyway — warn loudly so misconfig doesn't look like "no
    // relevant content".
    logger.warn(
      `[retrieval] embedding dimension mismatch: got ${opts.embedding.length}, expected ${EMBEDDING_DIM}. Falling back to keyword search.`,
    )
    return []
  }

  const filters = [
    eq(aiDocumentChunks.locale, opts.locale),
    sql`${aiDocumentChunks.embedding} IS NOT NULL`,
  ]
  if (opts.source) filters.push(eq(aiDocuments.source, opts.source))

  const rows = await db
    .select({
      id: aiDocumentChunks.id,
      distance: sql<number>`${aiDocumentChunks.embedding} <=> ${toVectorLiteral(opts.embedding)}::vector`,
    })
    .from(aiDocumentChunks)
    .innerJoin(aiDocuments, eq(aiDocuments.id, aiDocumentChunks.documentId))
    .where(and(...filters))
    .orderBy(sql`${aiDocumentChunks.embedding} <=> ${toVectorLiteral(opts.embedding)}::vector`)
    .limit(opts.limit)

  return rows.map((r) => ({ id: r.id, score: 1 - Number(r.distance) }))
}
