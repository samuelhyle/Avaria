import type { BlogPostRecord } from "./posts"

/**
 * Finding the article that is about a compound.
 *
 * The research desk writes one article per compound it sells, and the
 * article's address is not the compound's address: BPC-157 is written up in
 * "bpc-157-overview", GHK-Cu in "ghk-cu-copper". A product page that only
 * linked to the blog would leave the reader to find the article themselves.
 *
 * The match is made on the compound's own name, so it stays right when an
 * article is renamed — a slug that starts with the compound's slug, or a
 * title that contains the compound's name.
 */

/** The letters and digits of a name, with everything else removed. */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

/**
 * A name short enough that matching it would match half the catalogue.
 */
const MINIMUM_KEY = 4

/** Whether an article is about this compound. */
export function isArticleAbout(
  post: BlogPostRecord,
  productSlug: string,
  productName: string,
): boolean {
  const slugKey = normalise(productSlug)
  const nameKey = normalise(productName)
  const postKey = normalise(post.slug)
  const titleKey = normalise(post.title)

  if (slugKey.length >= MINIMUM_KEY && postKey.length >= MINIMUM_KEY) {
    if (postKey.startsWith(slugKey) || slugKey.startsWith(postKey)) return true
  }
  if (nameKey.length >= MINIMUM_KEY) {
    if (postKey.includes(nameKey) || titleKey.includes(nameKey)) return true
  }
  return false
}

/**
 * The articles about a compound, followed by the articles on the same
 * subject.
 *
 * The article about the compound comes first, and the rest are the articles
 * tagged with the same subject — a reader who wanted to know what BPC-157
 * does usually wants to know what its neighbours do too.
 */
export function relatedPostsFor(
  productSlug: string,
  productName: string,
  posts: BlogPostRecord[],
  tag?: string | null,
  limit = 4,
): { about: BlogPostRecord[]; nearby: BlogPostRecord[] } {
  const about = posts.filter((post) => isArticleAbout(post, productSlug, productName))
  const aboutKeys = new Set(about.map((post) => post.slug))
  // The article's tag is written in the research desk's own capitalisation
  // ("Recovery"), the product's category in the catalogue's ("recovery").
  const wanted = tag?.toLowerCase()
  const nearby = posts
    .filter((post) => !aboutKeys.has(post.slug))
    .filter((post) => (wanted ? post.tag.toLowerCase() === wanted : true))
    .slice(0, Math.max(0, limit - about.length))
  return { about, nearby }
}
