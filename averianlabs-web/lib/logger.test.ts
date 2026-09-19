/**
 * `lib/logger` unit tests — pin the wire format so log-drain queries
 * stay valid as the project evolves.
 */

import { logger, withRequestId } from "@/lib/logger"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    infoSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("emits one JSON object per line including timestamp + level", () => {
    logger.info("hello world")
    expect(infoSpy).toHaveBeenCalledTimes(1)
    const line = infoSpy.mock.calls[0]?.[0] as string
    const parsed = JSON.parse(line)
    expect(parsed.level).toBe("info")
    expect(parsed.message).toBe("hello world")
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("routes levels to the right console.* channel", () => {
    logger.info("i")
    logger.warn("w")
    logger.error("e")
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it("expands Error objects into name/message/stack", () => {
    logger.error("oops", new Error("boom"))
    const parsed = JSON.parse(errorSpy.mock.calls[0]?.[0] as string)
    // A single Error arg is treated as the message context (it's a
    // plain object), so its fields land at the top level alongside the
    // structured logger envelope.
    expect(parsed.name).toBe("Error")
    expect(parsed.message).toBe("boom")
    expect(parsed.stack).toContain("Error: boom")
  })

  it("embeds plain-object args directly into the entry", () => {
    logger.info("ctx", { userId: "u_1", locale: "fi" })
    const parsed = JSON.parse(infoSpy.mock.calls[0]?.[0] as string)
    expect(parsed.userId).toBe("u_1")
    expect(parsed.locale).toBe("fi")
  })

  it("wraps array / multi-arg context under a `context` field", () => {
    logger.info("two-args", { first: true }, { second: true })
    const parsed = JSON.parse(infoSpy.mock.calls[0]?.[0] as string)
    expect(parsed.context).toEqual([{ first: true }, { second: true }])
  })
})

describe("withRequestId", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    infoSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    infoSpy.mockRestore()
  })

  it("stamps every line with the bound requestId", () => {
    const reqLogger = withRequestId({ requestId: "req_abc" })
    reqLogger.info("first")
    reqLogger.info("second")
    for (const call of infoSpy.mock.calls) {
      const parsed = JSON.parse(call[0] as string)
      expect(parsed.requestId).toBe("req_abc")
    }
  })

  it("supports child() for nested bindings (e.g. requestId + orderId)", () => {
    const orderLogger = withRequestId({ requestId: "req_abc" }).child({ orderId: "A-1042" })
    orderLogger.info("created")
    const parsed = JSON.parse(infoSpy.mock.calls[0]?.[0] as string)
    expect(parsed.requestId).toBe("req_abc")
    expect(parsed.orderId).toBe("A-1042")
  })
})
