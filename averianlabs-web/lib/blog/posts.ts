/**
 * Blog post loader — Sanity-backed with hardcoded fallback for dev.
 *
 * Mirrors `lib/blog/authors.ts` — falls back to the local `posts` map in
 * `app/[locale]/blog/[slug]/page.tsx` so the route always renders.
 *
 * To migrate fully to Sanity:
 *   1. Author posts in Sanity Studio
 *   2. Delete the hardcoded `posts` map in the route
 *   3. The fallback in `listPosts()` (returns []) handles empty Sanity
 */

import { demoCache } from "@/lib/demo/cache"
import { isDemoBuild } from "@/lib/demo"
import { DEMO_POSTS } from "@/lib/demo/fixtures"
import { sanity } from "@/sanity/client"

export interface BlogPostRecord {
  slug: string
  title: string
  excerpt: string
  tag: string
  publishedAt: string // ISO date
  readMin: number
  authorSlug: string | null
  relatedSlugs: string[]
  body: unknown // Portable Text — left as unknown, rendered via small renderer
  i18n?: {
    fi?: string
    de?: string
    sv?: string
    nl?: string
  }
}

function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) && !isDemoBuild()
}

const POSTS_QUERY = /* groq */ `
  *[_type == "blogPost"] | order(publishedAt desc) {
    "slug": slug.current,
    title,
    excerpt,
    tag,
    publishedAt,
    readMin,
    "authorSlug": author->slug.current,
    relatedSlugs,
    body,
    "i18n": { "fi": i18n.fi->slug.current, "de": i18n.de->slug.current, "sv": i18n.sv->slug.current, "nl": i18n.nl->slug.current }
  }
`

const POST_BY_SLUG_QUERY = /* groq */ `
  *[_type == "blogPost" && slug.current == $slug][0] {
    "slug": slug.current,
    title,
    excerpt,
    tag,
    publishedAt,
    readMin,
    "authorSlug": author->slug.current,
    relatedSlugs,
    body,
    "i18n": { "fi": i18n.fi->slug.current, "de": i18n.de->slug.current, "sv": i18n.sv->slug.current, "nl": i18n.nl->slug.current }
  }
`

export const listPosts = demoCache(
  async (): Promise<BlogPostRecord[]> => {
    if (isDemoBuild()) return DEMO_POSTS
    if (!isConfigured()) return []
    try {
      return await sanity.fetch<BlogPostRecord[]>(POSTS_QUERY)
    } catch {
      return []
    }
  },
  ["blog:posts"],
  { revalidate: 3600, tags: ["blog"] },
)

export const getPostBySlug = demoCache(
  async (slug: string): Promise<BlogPostRecord | null> => {
    if (isDemoBuild()) return DEMO_POSTS.find((p) => p.slug === slug) ?? null
    if (!isConfigured()) return null
    try {
      const r = await sanity.fetch<BlogPostRecord | null>(POST_BY_SLUG_QUERY, { slug })
      return r ?? null
    } catch {
      return null
    }
  },
  ["blog:post"],
  { revalidate: 3600, tags: ["blog"] },
)

export const getAuthorPosts = demoCache(
  async (authorSlug: string): Promise<BlogPostRecord[]> => {
    if (isDemoBuild()) return DEMO_POSTS.filter((p) => p.authorSlug === authorSlug)
    if (!isConfigured()) return []
    try {
      return await sanity.fetch<BlogPostRecord[]>(
        `*[_type == "blogPost" && author->slug.current == $slug] | order(publishedAt desc) {
        "slug": slug.current,
        title,
        excerpt,
        tag,
        publishedAt,
        readMin,
        "authorSlug": author->slug.current,
        relatedSlugs,
        body
      }`,
        { slug: authorSlug },
      )
    } catch {
      return []
    }
  },
  ["blog:author-posts"],
  { revalidate: 3600, tags: ["blog"] },
)

export async function listAllPostSlugs(): Promise<string[]> {
  const posts = await listPosts()
  return posts.map((p) => p.slug)
}
