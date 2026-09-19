/**
 * Generate a UUID that survives environments without `crypto.randomUUID()`
 * (very old browsers + a few edge runtimes). All newer Node versions and
 * every evergreen browser expose it, so the fallback is rarely exercised —
 * but it's cheap insurance against "all writes share the same id" outages.
 *
 * Usage: prefer `crypto.randomUUID()` directly when you're sure the runtime
 * has it (Node 14.17+, all browsers since 2020). This helper exists for the
 * cross-runtime hot paths: client components, Edge runtime, Deno tests.
 */
export function safeUuid(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  // base36 timestamp + random suffix — collision risk is negligible for our
  // use cases (per-session message ids, ticket ids, etc.).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
