/**
 * `unstable_cache` shim for the static demo build.
 *
 * The Next.js cache runtime is unavailable with `output: "export"`. Calling
 * the real `unstable_cache` from a pre-rendered route throws at build time.
 *
 * In demo mode we return the raw function (no caching). In every other build
 * we delegate to the real `unstable_cache` so production keeps its in-memory
 * caching layer. Top-level await lets us defer the `next/cache` import to
 * non-demo builds only — keeping this module import-safe during static
 * export.
 */
import { isDemoBuild } from "@/lib/demo"

type CacheFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>
type CacheOptions = { revalidate?: number | false; tags?: string[] }
type RealCache = <TArgs extends unknown[], TResult>(
  fn: CacheFn<TArgs, TResult>,
  keyParts: string[],
  options?: CacheOptions,
) => CacheFn<TArgs, TResult>

let realCache: RealCache | null = null

if (!isDemoBuild()) {
  const mod = await import("next/cache")
  realCache = mod.unstable_cache as unknown as RealCache
}

export function demoCache<TArgs extends unknown[], TResult>(
  fn: CacheFn<TArgs, TResult>,
  keyParts: string[],
  options?: CacheOptions,
): CacheFn<TArgs, TResult> {
  if (!realCache) return fn
  return realCache(fn, keyParts, options)
}