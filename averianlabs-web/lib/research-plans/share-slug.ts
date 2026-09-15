/**
 * Pure helpers for the share-slug generator. Lives outside `service.ts`
 * so it can be unit-tested without pulling in the Auth.js chain.
 */

export function generateShareSlug(): string {
  const buf = new Uint8Array(9)
  crypto.getRandomValues(buf)
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}
