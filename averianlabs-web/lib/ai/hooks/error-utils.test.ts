/**
 * Chat error helper unit tests.
 *
 * Covers `classifyHttpError` and `placeholderForError`, both extracted to
 * `lib/ai/hooks/error-utils.ts` so the hook file can stay focused on React
 * state management.
 */

import { classifyHttpError, placeholderForError } from "@/lib/ai/hooks/error-utils"
import { describe, expect, it } from "vitest"

describe("classifyHttpError", () => {
  it("maps 429 to a rate-limited error regardless of body", () => {
    const e = classifyHttpError(429, "")
    expect(e.name).toBe("rate_limited")
    expect(e.message).toMatch(/slow down/i)
  })

  it("maps the `rate_limited` error code to a rate-limited error", () => {
    const body = JSON.stringify({ error: true, code: "rate_limited", message: "x" })
    const e = classifyHttpError(400, body)
    expect(e.name).toBe("rate_limited")
  })

  it("maps 503 + provider_unavailable to an offline error", () => {
    const e = classifyHttpError(503, "")
    expect(e.name).toBe("provider_unavailable")
    expect(e.message).toMatch(/offline/i)
  })

  it("maps `provider_unavailable` code from any status", () => {
    const body = JSON.stringify({ error: true, code: "provider_unavailable" })
    const e = classifyHttpError(500, body)
    expect(e.name).toBe("provider_unavailable")
  })

  it("maps 400 + invalid_request to an invalid_request error", () => {
    const e = classifyHttpError(400, "")
    expect(e.name).toBe("invalid_request")
  })

  it("falls back to server_error for other 5xx responses", () => {
    expect(classifyHttpError(500, "").name).toBe("server_error")
    expect(classifyHttpError(502, "").name).toBe("server_error")
    expect(classifyHttpError(504, "").name).toBe("server_error")
  })

  it("falls back to the body's code for non-mapped statuses", () => {
    const body = JSON.stringify({ error: true, code: "weird_thing" })
    const e = classifyHttpError(418, body)
    expect(e.name).toBe("weird_thing")
    expect(e.message).toMatch(/418/)
  })

  it("uses 'unknown' when the body isn't JSON", () => {
    const e = classifyHttpError(418, "not json")
    expect(e.name).toBe("unknown")
  })
})

describe("placeholderForError", () => {
  it("returns a rate-limit placeholder for rate_limited", () => {
    const e = new Error("x")
    e.name = "rate_limited"
    expect(placeholderForError(e)).toMatch(/slow down/i)
  })

  it("returns an offline placeholder for provider_unavailable", () => {
    const e = new Error("x")
    e.name = "provider_unavailable"
    expect(placeholderForError(e)).toMatch(/offline/i)
  })

  it("returns an invalid-request placeholder", () => {
    const e = new Error("x")
    e.name = "invalid_request"
    expect(placeholderForError(e)).toMatch(/couldn.?t be sent/i)
  })

  it("returns a server-error placeholder", () => {
    const e = new Error("x")
    e.name = "server_error"
    expect(placeholderForError(e)).toMatch(/problem on our side/i)
  })

  it("returns a generic placeholder for unknown error names", () => {
    const e = new Error("x")
    e.name = "anything_else"
    expect(placeholderForError(e)).toMatch(/didn.?t respond/i)
  })

  it("returns italic-formatted text (underscore brackets)", () => {
    const out = placeholderForError(Object.assign(new Error("x"), { name: "rate_limited" }))
    expect(out.startsWith("_")).toBe(true)
    expect(out.endsWith("_")).toBe(true)
  })
})
