const KEY = "averianlabs-recently-viewed"

export function getRecentlyViewedSlugs(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function trackRecentlyViewed(slug: string): void {
  if (typeof window === "undefined") return
  try {
    const arr = getRecentlyViewedSlugs()
    const next = [slug, ...arr.filter((s) => s !== slug)].slice(0, 12)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
}
