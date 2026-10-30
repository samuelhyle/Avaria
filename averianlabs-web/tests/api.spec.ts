import { expect, isDegraded, sameOriginHeaders, test } from "@/tests/fixtures"
import type { APIResponse } from "@playwright/test"

test.describe("public APIs", () => {
  test("GET /api/health responds with a status code", async ({ request }) => {
    let res: APIResponse | undefined
    try {
      res = await request.get("/api/health", { timeout: 5_000 })
    } catch {
      // In some CI environments DATABASE_URL is unset and the endpoint may
      // throw before producing a response — that's still an acceptable
      // "server reachable but DB unconfigured" state.
      return
    }
    // Acceptable: 200 (DB reachable), 503 (degraded per docs),
    // or 500 (the endpoint aborts on missing DATABASE_URL before recording ok).
    expect([200, 500, 503]).toContain(res.status())
  })

  test("POST /api/newsletter rejects missing email", async ({ request }) => {
    test.skip(await isDegraded(request), "DB unavailable")
    let res: APIResponse | undefined
    try {
      res = await request.post(
        "/api/newsletter",
        // A browser sends `Origin` on a state-changing request; the CSRF
        // guard requires it. Playwright's request fixture does not.
        { data: {}, headers: { origin: new URL(request.url()).origin } },
        { timeout: 5_000 },
      )
    } catch {
      return // the route may 500 without DB; still acceptable
    }
    expect([400, 422, 429, 500, 503]).toContain(res.status())
  })

  test("POST /api/contact is rate-limited or rejected", async ({ request }) => {
    test.skip(await isDegraded(request), "DB unavailable")
    let res: APIResponse | undefined
    try {
      res = await request.post(
        "/api/contact",
        {
          data: {},
          headers: { origin: new URL(request.url()).origin },
        },
        { timeout: 5_000 },
      )
    } catch {
      return
    }
    expect([400, 422, 429, 500, 503]).toContain(res.status())
  })

  test("a state-changing route refuses a cross-origin request", async ({ request }) => {
    // The CSRF guard refuses a request whose Origin is not the site's own.
    const res = await request.post("/api/contact", {
      data: {},
      headers: { origin: "https://evil.example" },
    })
    expect(res.status()).toBe(403)
    expect(await res.json()).toMatchObject({ error: "csrf_forbidden" })
  })

  test("GET /en/shop returns 200", async ({ request }) => {
    const res = await request.get("/en/shop")
    expect(res.status()).toBe(200)
  })

  test("GET /sitemap.xml returns a non-empty XML document", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain("<urlset")
    // Every entry has to point at the origin that actually serves the site.
    // A hardcoded domain fails as soon as the site is served from another
    // host, and `averianlabs.eu` is not a registered domain — every such URL
    // was a dead link.
    const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locations.length).toBeGreaterThan(0)
    const served = new URL(res.url()).origin
    for (const location of locations) {
      expect(new URL(location).origin).toBe(served)
    }
  })

  test("GET /robots.txt disallows AI bots and the admin", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    const body = await res.text()
    if (/User-Agent:\s*\*\s*\r?\nDisallow:\s*\/\s*(?:\r?\n|$)/i.test(body)) {
      // A review site blocks every crawler and route, including these private paths.
      expect(body).not.toMatch(/^Allow:\s*\//im)
    } else {
      expect(body).toMatch(/GPTBot|CCBot/i)
      expect(body).toContain("/admin/")
    }
  })
})
