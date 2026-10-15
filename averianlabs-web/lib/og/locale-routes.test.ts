import { beforeEach, describe, expect, it, vi } from "vitest"

const fixtures = vi.hoisted(() => ({
  thread: null as Record<string, unknown> | null,
  plan: null as Record<string, unknown> | null,
}))
vi.mock("@/lib/community", () => ({ getThreadBySlug: vi.fn(async () => fixtures.thread) }))
vi.mock("@/lib/research-plans", () => ({ getPlanByShareSlug: vi.fn(async () => fixtures.plan) }))
vi.mock("@/lib/og/render", () => ({
  ogLocale: (request: Request) =>
    new URL(request.url).searchParams.get("locale") === "fi" ? "fi" : "en",
  renderOg: vi.fn(
    async (input: Record<string, unknown>) =>
      new Response(JSON.stringify(input), {
        headers: { "content-type": "application/json", "cache-control": "private, no-store" },
      }),
  ),
}))

import { GET as defaultAlias } from "@/app/api/og/default/[locale]/route"
import { GET as planAlias } from "@/app/api/og/plan/[slug]/[locale]/route"
import { GET as threadAlias } from "@/app/api/og/thread/[slug]/[locale]/route"

beforeEach(() => {
  fixtures.thread = null
  fixtures.plan = null
})

describe("locale-specific social image aliases", () => {
  it("uses the explicit Finnish path even when a conflicting English query is supplied", async () => {
    const response = await defaultAlias(
      new Request("https://example.com/api/og/default/fi?locale=en"),
      { params: Promise.resolve({ locale: "fi" }) },
    )
    expect(await response.json()).toMatchObject({
      locale: "fi",
      title: "Materiaaleja laboratoriotyöhön",
    })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const english = await defaultAlias(
      new Request("https://example.com/api/og/default/en?locale=fi"),
      { params: Promise.resolve({ locale: "en" }) },
    )
    expect(await english.json()).toMatchObject({
      locale: "en",
      title: "Materials for laboratory research",
    })
  })
  it("rejects unsupported path locales", async () => {
    const response = await defaultAlias(new Request("https://example.com/api/og/default/unknown"), {
      params: Promise.resolve({ locale: "unknown" }),
    })
    expect(response.status).toBe(404)
  })
  it.each(["pending", "held", "removed", "hidden"])(
    "does not expose %s threads through a locale alias",
    async (status) => {
      fixtures.thread = { title: "Private review title", status }
      const response = await threadAlias(
        new Request("https://example.com/api/og/thread/topic/fi"),
        { params: Promise.resolve({ slug: "topic", locale: "fi" }) },
      )
      expect(response.status).toBe(404)
      expect(await response.text()).not.toContain("Private review title")
    },
  )
  it("keeps revoked plan shares unavailable and available shares uncacheable", async () => {
    const context = { params: Promise.resolve({ slug: "share", locale: "fi" }) }
    const request = new Request("https://example.com/api/og/plan/share/fi")
    expect((await planAlias(request, context)).status).toBe(404)
    fixtures.plan = { title: "Explicitly shared calculation", items: [], notes: "Public notes" }
    const response = await planAlias(request, context)
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(await response.json()).toMatchObject({
      locale: "fi",
      title: "Explicitly shared calculation",
    })
  })
})
