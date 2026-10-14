import { listPosts } from "@/lib/blog/posts"
import { listGlossaryTerms } from "@/lib/glossary"
import { locales } from "@/lib/i18n/config"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { MetadataRoute } from "next"

export const dynamic = "force-dynamic"

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
    { path: "/research-tools", freq: "monthly" as const, pri: 0.6 },
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

  for (const product of await getStorefrontCatalogue()) {
    for (const locale of locales)
      urls.push(entry(locale, `/shop/${product.slug}`, { priority: 0.8 }))
  }
  // Index approved content only in its actual language.
  for (const locale of locales) {
    const [posts, terms] = await Promise.all([
      listPosts(locale).catch(() => []),
      listGlossaryTerms(locale).catch(() => []),
    ])
    for (const post of posts)
      urls.push({
        url: `${SITE}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        priority: 0.6,
      })
    for (const term of terms)
      urls.push({ url: `${SITE}/${locale}/glossary/${term.slug}`, priority: 0.5 })
  }
  return urls
}
