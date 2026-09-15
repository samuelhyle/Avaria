/**
 * Documents constants — safe to import from client components. Server
 * functions live in `./service`; server-side callers should import those
 * directly to keep this file (and its consumers) free of postgres-js.
 */

export {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  type DocumentType,
} from "./constants"
