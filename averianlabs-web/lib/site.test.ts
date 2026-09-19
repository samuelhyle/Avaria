/**
 * Site URL helpers — the single source of truth for canonical URLs.
 *
 * Security relevance: JSON-LD, sitemap.xml, and email links all funnel
 * through `getSiteUrl()` so a misconfigured `NEXT_PUBLIC_SITE_URL` cannot
 * silently turn into a phishing-host link in the wrong environment.
 */

import { DEFAULT_SITE_URL, absoluteUrl, getSiteUrl } from "@/lib/site"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("getSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = original
  })

  it("falls back to the canonical production domain when env is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL)
    expect(DEFAULT_SITE_URL).toBe("https://averianlabs.eu")
  })

  it("strips trailing slashes from the configured site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview--abc.netlify.app/"
    expect(getSiteUrl()).toBe("https://preview--abc.netlify.app")
  })

  it("returns the configured value verbatim when already clean", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.averianlabs.eu"
    expect(getSiteUrl()).toBe("https://staging.averianlabs.eu")
  })
})

describe("absoluteUrl", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
  })
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it("prepends a leading slash if missing", () => {
    expect(absoluteUrl("shop/bpc-157")).toBe("https://averianlabs.eu/shop/bpc-157")
  })

  it("preserves a leading slash", () => {
    expect(absoluteUrl("/shop/bpc-157")).toBe("https://averianlabs.eu/shop/bpc-157")
  })

  it("joins without producing a double slash between base and path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://averianlabs.eu/"
    expect(absoluteUrl("/shop")).toBe("https://averianlabs.eu/shop")
  })
})
