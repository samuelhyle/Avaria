import * as React from "react"
import { afterAll, describe, expect, it, vi } from "vitest"
import { renderOg } from "./render"

// Vite's standalone TSX transform uses React.createElement; Next uses the automatic runtime.
vi.stubGlobal("React", React)
afterAll(() => vi.unstubAllGlobals())

describe("rendered social images", () => {
  it("renders different Finnish/English PNGs with truthful locale and revocation-safe caching", async () => {
    const english = await renderOg({
      locale: "en",
      kind: "Research materials",
      title: "Materials for laboratory research",
    })
    const finnish = await renderOg({
      locale: "fi",
      kind: "Tutkimusmateriaalit",
      title: "Materiaaleja laboratoriotyöhön",
    })
    const enBytes = Buffer.from(await english.arrayBuffer())
    const fiBytes = Buffer.from(await finnish.arrayBuffer())
    expect(enBytes.subarray(1, 4).toString()).toBe("PNG")
    expect(fiBytes.subarray(1, 4).toString()).toBe("PNG")
    expect(enBytes.equals(fiBytes)).toBe(false)
    expect(finnish.headers.get("content-language")).toBe("fi")
    expect(english.headers.get("content-language")).toBe("en")
    expect(finnish.headers.get("cache-control")).toBe("private, no-store")
  })
})
