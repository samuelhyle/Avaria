import { describe, expect, it } from "vitest"
import type { BlogPostRecord } from "./posts"
import { isArticleAbout, relatedPostsFor } from "./related"

function post(overrides: Partial<BlogPostRecord> = {}): BlogPostRecord {
  return {
    slug: "bpc-157-overview",
    title: "BPC-157: a 15-amino-acid fragment and what it does in tissue models",
    excerpt: "We review the literature.",
    tag: "Recovery",
    publishedAt: "2026-08-12",
    readMin: 9,
    authorSlug: "averia-research-desk",
    relatedSlugs: [],
    body: [],
    ...overrides,
  }
}

describe("isArticleAbout", () => {
  it("matches an article whose address starts with the compound's", () => {
    expect(isArticleAbout(post(), "bpc-157", "BPC-157")).toBe(true)
  })

  it("matches an article whose address starts with a longer form", () => {
    expect(isArticleAbout(post({ slug: "ghk-cu-copper" }), "ghk-cu", "GHK-Cu")).toBe(true)
  })

  it("matches an article whose title carries the compound's name", () => {
    expect(
      isArticleAbout(
        post({ slug: "tissue-recovery-101", title: "What TB-500 does" }),
        "tb-500",
        "TB-500",
      ),
    ).toBe(true)
  })

  it("does not match an article about another compound", () => {
    expect(
      isArticleAbout(
        post({ slug: "ghk-cu-copper", title: "GHK-Cu and copper-peptide research" }),
        "bpc-157",
        "BPC-157",
      ),
    ).toBe(false)
  })

  it("does not match on a name too short to be meaningful", () => {
    expect(isArticleAbout(post({ slug: "re-cut" }), "re", "Re")).toBe(false)
  })
})

describe("relatedPostsFor", () => {
  it("puts the article about the compound first", () => {
    const posts = [
      post({ slug: "ghk-cu-copper", title: "GHK-Cu and copper-peptide research", tag: "Cosmetic" }),
      post({ slug: "bpc-157-overview", tag: "Recovery" }),
    ]
    const { about, nearby } = relatedPostsFor("bpc-157", "BPC-157", posts, "Recovery")
    expect(about.map((entry) => entry.slug)).toEqual(["bpc-157-overview"])
    // The other article is on a different subject, so it is not offered as
    // nearby reading for this one.
    expect(nearby.map((entry) => entry.slug)).toEqual([])
  })

  it("keeps the articles about the compound out of the nearby list", () => {
    const posts = [
      post({ slug: "bpc-157-overview" }),
      post({ slug: "bpc-157-second", title: "BPC-157, second look" }),
    ]
    const { about, nearby } = relatedPostsFor("bpc-157", "BPC-157", posts, "Recovery")
    expect(about).toHaveLength(2)
    expect(nearby).toHaveLength(0)
  })

  it("returns nothing when no article is about the compound", () => {
    const { about, nearby } = relatedPostsFor("klow", "KLOW", [post()], "Recovery")
    expect(about).toHaveLength(0)
    expect(nearby.map((entry) => entry.slug)).toEqual(["bpc-157-overview"])
  })
})
