import { afterEach, describe, expect, it, vi } from "vitest"

import { assertCsrfOr403, checkCsrf, csrfAllowsDevHosts } from "./csrf"

const SITE = "https://averianlabs-demo.netlify.app"

function post(headers: Record<string, string> = {}, url = `${SITE}/api/contact`) {
  return new Request(url, { method: "POST", headers })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE)
  vi.stubEnv("BUILD_MODE", "")
  vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", "")
  // The check reads every configured origin the deployment serves. A
  // developer's shell may export any of them — a local `.env.local` names
  // `http://localhost:3000` — and an origin that happens to be allowed
  // changes what the check answers. They are all pinned here.
  vi.stubEnv("AUTH_URL", "")
  vi.stubEnv("URL", "")
  vi.stubEnv("DEPLOY_PRIME_URL", "")
})

describe("CSRF origin checks", () => {
  it("accepts a request from the site's own origin", () => {
    vi.stubEnv("URL", SITE)
    expect(checkCsrf(post({ origin: SITE })).ok).toBe(true)
    expect(checkCsrf(post({ referer: `${SITE}/en/contact` })).ok).toBe(true)
  })

  it("refuses a request from another origin", () => {
    vi.stubEnv("URL", SITE)
    const result = checkCsrf(post({ origin: "https://evil.example" }))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("origin_mismatch")

    const viaReferer = checkCsrf(post({ referer: "https://evil.example/page" }))
    expect(viaReferer.ok).toBe(false)
    expect(viaReferer.reason).toBe("referer_mismatch")
  })

  it("refuses a request with neither origin nor referer", () => {
    vi.stubEnv("URL", SITE)
    const result = checkCsrf(post())
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_origin_and_referer")
  })

  it("exempts read-only methods", () => {
    vi.stubEnv("URL", SITE)
    const request = new Request(`${SITE}/api/catalogue`, { method: "GET" })
    expect(checkCsrf(request).ok).toBe(true)
  })

  it("accepts a deploy preview origin, because it is the same application", () => {
    vi.stubEnv("URL", SITE)
    vi.stubEnv("DEPLOY_PRIME_URL", "https://6ae468585c36ac4889ec3b54--averianlabs-demo.netlify.app")
    expect(
      checkCsrf(post({ origin: "https://6ae468585c36ac4889ec3b54--averianlabs-demo.netlify.app" }))
        .ok,
    ).toBe(true)
  })

  it("accepts the request's own host, so a deploy preview can post to itself", () => {
    // Netlify serves a deploy preview under a unique hostname that
    // DEPLOY_PRIME_URL does not always name. The page and its API share
    // that hostname, so the Origin and the Host agree and the request is
    // same-site by the browser's own reckoning.
    vi.stubEnv("URL", SITE)
    const preview = "https://6ae5e227--averianlabs-demo.netlify.app"
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { origin: preview, host: "6ae5e227--averianlabs-demo.netlify.app" },
    })
    expect(checkCsrf(request).ok).toBe(true)
  })

  it("accepts a loopback origin in development", () => {
    vi.stubEnv("URL", SITE)
    vi.stubEnv("NODE_ENV", "development")
    expect(checkCsrf(post({ origin: "http://localhost:3000" }), { allowDevHosts: true }).ok).toBe(
      true,
    )
    // Without the dev-host allowance it is refused, exactly like any other
    // foreign origin.
    expect(checkCsrf(post({ origin: "http://localhost:3000" })).ok).toBe(false)
  })

  it("returns a 403 response from the wrapper when the check fails", () => {
    vi.stubEnv("URL", SITE)
    const response = assertCsrfOr403(post({ origin: "https://evil.example" }))
    expect(response?.status).toBe(403)
    expect(assertCsrfOr403(post({ origin: SITE }))).toBeNull()
  })

  it("allows dev hosts outside production, and inside CI", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CI", "")
    expect(csrfAllowsDevHosts()).toBe(false)
    vi.stubEnv("CI", "true")
    expect(csrfAllowsDevHosts()).toBe(true)
  })
})
