import { describe, expect, it } from "vitest"
import { siteOrigin, socialImagePath } from "./site-origin"

describe("social image origins and locale identity", () => {
  it("uses the configured review origin instead of an unconnected canonical domain", () => {
    expect(
      siteOrigin({
        NEXT_PUBLIC_REVIEW_SITE: "true",
        URL: "https://averianlabs-demo.netlify.app",
        NEXT_PUBLIC_SITE_URL: "https://averianlabs.eu",
      }),
    ).toBe("https://averianlabs-demo.netlify.app")
    expect(
      siteOrigin({
        NEXT_PUBLIC_REVIEW_SITE: "true",
        DEPLOY_PRIME_URL: "https://123--averianlabs-demo.netlify.app",
        URL: "https://averianlabs-demo.netlify.app",
      }),
    ).toBe("https://averianlabs-demo.netlify.app")
  })

  it("resolves the production origin from the deployment configuration", () => {
    // The operator's explicit choice wins.
    expect(
      siteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://shop.example.com",
        AUTH_URL: "https://auth.example.com",
        URL: "https://deploy.example.netlify.app",
      }),
    ).toBe("https://shop.example.com")
    // Then AUTH_URL, so the canonical origin and the auth origin agree.
    expect(
      siteOrigin({
        AUTH_URL: "https://auth.example.com",
        URL: "https://deploy.example.netlify.app",
      }),
    ).toBe("https://auth.example.com")
    // Then the host's own URL — the live site's real origin.
    expect(siteOrigin({ URL: "https://deploy.example.netlify.app" })).toBe(
      "https://deploy.example.netlify.app",
    )
    // And the deploy-specific URL when nothing else is configured.
    expect(siteOrigin({ DEPLOY_PRIME_URL: "https://123--example.netlify.app" })).toBe(
      "https://123--example.netlify.app",
    )
  })

  it("falls back to the live site's own origin rather than an unregistered domain", () => {
    // `averianlabs.eu` is not a registered domain, so a hardcoded fallback
    // made every canonical URL and sitemap entry a dead link.
    expect(siteOrigin({})).toBe("https://averianlabs-demo.netlify.app")
  })

  it("rejects unsafe schemes and credentials, while allowing local development", () => {
    expect(
      siteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://name:secret@example.com",
        AUTH_URL: "javascript:alert(1)",
      }),
    ).toBe("https://averianlabs-demo.netlify.app")
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "http://localhost:3217/en" })).toBe(
      "http://localhost:3217",
    )
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "http://untrusted.example" })).toBe(
      "https://averianlabs-demo.netlify.app",
    )
  })

  it("separates Finnish and English image URLs and safely encodes identifiers", () => {
    expect(socialImagePath("default", "fi")).toBe("/api/og/default/fi")
    expect(socialImagePath("default", "en")).toBe("/api/og/default/en")
    expect(socialImagePath("thread", "fi", "a/b?locale=en")).toBe(
      "/api/og/thread/a%2Fb%3Flocale%3Den/fi",
    )
  })
})
