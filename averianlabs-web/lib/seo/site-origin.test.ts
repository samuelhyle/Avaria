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
  it("rejects unsafe schemes and credentials, while allowing local development", () => {
    expect(
      siteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://name:secret@example.com",
        AUTH_URL: "javascript:alert(1)",
      }),
    ).toBe("https://averianlabs.eu")
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "http://localhost:3217/en" })).toBe(
      "http://localhost:3217",
    )
    expect(siteOrigin({ NEXT_PUBLIC_SITE_URL: "http://untrusted.example" })).toBe(
      "https://averianlabs.eu",
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
