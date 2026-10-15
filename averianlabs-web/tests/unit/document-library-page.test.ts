import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock("@/lib/documents/service", () => ({ listPublicDocumentLibrary: state.list }))
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => (key: string) => key,
}))
vi.mock("@/components/documents/DocumentList", () => ({ DocumentList: () => null }))
vi.mock("@/components/documents/DocumentState", () => ({ DocumentState: () => null }))
import DocumentsPage from "@/app/[locale]/documents/page"
import { DocumentState } from "@/components/documents/DocumentState"

function findState(node: unknown): unknown {
  if (!node || typeof node !== "object") return undefined
  if (Array.isArray(node)) return node.map(findState).find(Boolean)
  const element = node as { type?: unknown; props?: { children?: unknown; state?: string } }
  return element.type === DocumentState ? element.props : findState(element.props?.children)
}

describe("public document discovery failure states", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("React", React)
    state.list.mockResolvedValue([])
  })
  afterEach(() => vi.unstubAllGlobals())
  const page = (query = {}) =>
    DocumentsPage({
      params: Promise.resolve({ locale: "fi" }),
      searchParams: Promise.resolve(query),
    })
  it("distinguishes a genuinely empty public library from service failure", async () => {
    expect(findState(await page())).toMatchObject({ state: "empty", locale: "fi" })
    state.list.mockRejectedValue(new Error("database unavailable"))
    expect(findState(await page())).toMatchObject({ state: "unavailable", locale: "fi" })
  })
  it("provides a clear-filter action for no matches and keeps filters in the public query", async () => {
    expect(findState(await page({ sku: "SKU-10", batch: "B-26", type: "coa" }))).toMatchObject({
      state: "noMatch",
      clearHref: "/fi/documents",
    })
    expect(state.list).toHaveBeenCalledWith(
      expect.objectContaining({ sku: "SKU-10", batch: "B-26", type: "coa" }),
      "fi",
    )
  })
  it("does not turn a filtered service failure into a no-match result", async () => {
    state.list.mockRejectedValue(new Error("connection interrupted"))
    expect(findState(await page({ q: "material" }))).toMatchObject({ state: "unavailable" })
  })
})
