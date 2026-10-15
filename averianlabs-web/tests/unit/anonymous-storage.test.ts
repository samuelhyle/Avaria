// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("optional anonymous identity storage", () => {
  it("keeps one working page identity when both storage accessors are denied", async () => {
    for (const key of ["localStorage", "sessionStorage"] as const) {
      vi.spyOn(window, key, "get").mockImplementation(() => {
        throw new DOMException("Storage unavailable", "SecurityError")
      })
    }
    const { getOrCreateAnonId } = await import("@/lib/ai/memory/consent-client")
    const id = getOrCreateAnonId()
    expect(id).toBeTruthy()
    expect(getOrCreateAnonId()).toBe(id)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/identity",
      expect.objectContaining({
        body: JSON.stringify({ anonId: id }),
      }),
    )
  })

  it("retains an existing visitor identity and consent when session storage is denied", async () => {
    window.localStorage.setItem("averia:anon", "existing-visitor")
    document.cookie = "averia_consent=declined; path=/"
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError")
    })
    const { getOrCreateAnonId, getConsentState } = await import("@/lib/ai/memory/consent-client")
    expect(getOrCreateAnonId()).toBe("existing-visitor")
    expect(getOrCreateAnonId()).toBe("existing-visitor")
    expect(getConsentState()).toBe("declined")
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
