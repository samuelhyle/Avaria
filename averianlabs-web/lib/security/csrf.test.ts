/**
 * CSRF helper unit tests.
 *
 * Build the request objects by hand so we exercise the Origin/Referer
 * extraction without bringing up a full Next.js server.
 */

import { assertCsrfOr403, checkCsrf } from "@/lib/security/csrf"
import { describe, expect, it } from "vitest"

function buildRequest(opts: {
  method?: string
  url?: string
  origin?: string | null
  referer?: string | null
}): Request {
  const headers = new Headers()
  if (opts.origin !== null && opts.origin !== undefined) {
    if (opts.origin) headers.set("origin", opts.origin)
  }
  if (opts.referer !== null && opts.referer !== undefined) {
    if (opts.referer) headers.set("referer", opts.referer)
  }
  return new Request(opts.url ?? "https://averianlabs.eu/api/test", {
    method: opts.method ?? "POST",
    headers,
  })
}

describe("checkCsrf — safe methods", () => {
  it("accepts GET regardless of headers", () => {
    const req = buildRequest({ method: "GET", origin: "https://attacker.example" })
    expect(checkCsrf(req).ok).toBe(true)
  })

  it("accepts HEAD/OPTIONS without any origin check", () => {
    for (const m of ["HEAD", "OPTIONS"]) {
      const req = buildRequest({ method: m })
      expect(checkCsrf(req).ok).toBe(true)
    }
  })
})

describe("checkCsrf — Origin header wins", () => {
  it("accepts POST when Origin matches request origin", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "https://averianlabs.eu",
    })
    expect(checkCsrf(req).ok).toBe(true)
  })

  it("rejects POST when Origin is from a different site", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "https://attacker.example",
    })
    expect(checkCsrf(req).ok).toBe(false)
    expect(checkCsrf(req).reason).toBe("origin_mismatch")
  })

  it("rejects when Origin is a subdomain of the app", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "https://blog.averianlabs.eu",
    })
    expect(checkCsrf(req).ok).toBe(false)
  })

  it("accepts loopback Origin in dev mode even when env is HTTPS", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "http://localhost:3000",
    })
    expect(checkCsrf(req, { allowDevHosts: true }).ok).toBe(true)
    expect(checkCsrf(req).ok).toBe(false)
  })

  it("rejects loopback Origin when allowDevHosts is off", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "http://localhost:3000",
    })
    expect(checkCsrf(req).ok).toBe(false)
  })
})

describe("checkCsrf — Referer fallback", () => {
  it("accepts when Referer matches and Origin is missing", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: null,
      referer: "https://averianlabs.eu/shop",
    })
    expect(checkCsrf(req).ok).toBe(true)
  })

  it("rejects when Referer is from another site", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: null,
      referer: "https://attacker.example/page",
    })
    expect(checkCsrf(req).ok).toBe(false)
    expect(checkCsrf(req).reason).toBe("referer_mismatch")
  })
})

describe("checkCsrf — both missing", () => {
  it("rejects when neither Origin nor Referer is sent", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: null,
      referer: null,
    })
    const result = checkCsrf(req)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("missing_origin_and_referer")
  })

  it("rejects malformed Origin strings", () => {
    const req = buildRequest({
      method: "POST",
      url: "https://averianlabs.eu/api/checkout",
      origin: "not a url",
    })
    expect(checkCsrf(req).ok).toBe(false)
  })
})

describe("assertCsrfOr403 — wrapper contract", () => {
  it("returns null when check passes", () => {
    const req = buildRequest({ method: "POST", origin: "https://averianlabs.eu" })
    expect(assertCsrfOr403(req)).toBeNull()
  })

  it("returns a 403 JSON response when check fails", () => {
    const req = buildRequest({ method: "POST", origin: "https://attacker.example" })
    const res = assertCsrfOr403(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
    expect(res?.headers.get("content-type")).toMatch(/application\/json/)
  })
})
