import { type SanityClient, createClient } from "@sanity/client"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ""
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"

/**
 * `@sanity/client`'s `createClient` throws synchronously when `projectId` is
 * missing, which crashes every module that imports `@/sanity/client` in
 * local-dev environments where Sanity is intentionally not configured.
 *
 * We defer client creation until first use and provide a no-op stub when
 * the project ID is empty so the rest of the app keeps working.
 */
const noopFetch = async <T>(): Promise<T> => [] as unknown as T

const stub: SanityClient = {
  fetch: noopFetch,
  config: () => ({ projectId: "", dataset, apiVersion: "2026-01-01", useCdn: false }),
} as unknown as SanityClient

export const sanity: SanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: "2026-01-01",
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published",
    })
  : stub

export function isSanityConfigured(): boolean {
  return Boolean(projectId)
}
