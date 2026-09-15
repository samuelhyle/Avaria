import { listPosts } from "@/lib/blog/posts"
import { listGlossaryTerms } from "@/lib/glossary"
import { locales } from "@/lib/i18n/config"
import type { MetadataRoute } from "next"

export const dynamic = "force-static"

const SITE = "https://averianlabs.eu"

function localeAlternates(path: string) {
  return Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}${path}`]))
}

function entry(locale: string, path: string, opts: Partial<MetadataRoute.Sitemap[number]> = {}) {
  return {
    url: `${SITE}/${locale}${path}`,
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency ?? "weekly",
    priority: opts.priority ?? 0.7,
    alternates: { languages: localeAlternates(path) },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const _now = new Date()

  // Static routes — every locale.
  const staticPaths = [
    { path: "", freq: "daily" as const, pri: 1 },
    { path: "/shop", freq: "daily" as const, pri: 0.9 },
    { path: "/blog", freq: "weekly" as const, pri: 0.7 },
    { path: "/glossary", freq: "monthly" as const, pri: 0.6 },
    { path: "/community", freq: "hourly" as const, pri: 0.8 },
    { path: "/lab-tests", freq: "monthly" as const, pri: 0.6 },
    { path: "/peptide-calculator", freq: "monthly" as const, pri: 0.6 },
    { path: "/partner", freq: "monthly" as const, pri: 0.5 },
    { path: "/rewards", freq: "monthly" as const, pri: 0.5 },
    { path: "/about", freq: "monthly" as const, pri: 0.4 },
    { path: "/quality", freq: "monthly" as const, pri: 0.4 },
    { path: "/faq", freq: "monthly" as const, pri: 0.4 },
    { path: "/contact", freq: "monthly" as const, pri: 0.4 },
  ]

  const urls: MetadataRoute.Sitemap = []

  // 1. Static routes
  for (const locale of locales) {
    for (const { path, freq, pri } of staticPaths) {
      urls.push(entry(locale, path, { changeFrequency: freq, priority: pri }))
    }
  }

  // 2. Blog posts (Sanity) + fallback slugs
  try {
    const posts = await listPosts()
    for (const p of posts) {
      for (const locale of locales) {
        urls.push(
          entry(locale, `/blog/${p.slug}`, {
            lastModified: new Date(p.publishedAt),
            changeFrequency: "monthly",
            priority: 0.6,
          }),
        )
      }
    }
  } catch {
    // Sanity unavailable — skip
  }

  // 3. Glossary terms (Sanity)
  try {
    const terms = await listGlossaryTerms()
    for (const t of terms) {
      for (const locale of locales) {
        urls.push(
          entry(locale, `/glossary/${t.slug}`, {
            changeFrequency: "monthly",
            priority: 0.5,
          }),
        )
      }
    }
  } catch {
    // Skip
  }

  return urls
}