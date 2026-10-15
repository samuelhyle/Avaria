import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { createAgentEventParser } from "./stream"

// Actual anonymous read-only response captured on the final review candidate,
// 2026-10-15. Its interleaved heartbeat frames exposed the original client bug.
const captured = readFileSync(
  new URL("../../tests/fixtures/ai-concentration-heartbeat.sse", import.meta.url),
  "utf8",
)
const expected = captured
  .split("\n\n")
  .filter((frame) => frame.startsWith("data: "))
  .map((frame) => JSON.parse(frame.slice(6)))

describe("assistant SSE frame parsing", () => {
  it("keeps real tool inputs/results, answer and completion when all actual frames arrive together", () => {
    const events = createAgentEventParser().push(captured)
    expect(events).toEqual(expected)
    expect(events.find((event) => event.type === "tool-call")).toMatchObject({
      name: "calculateLaboratory",
      args: { mode: "concentration", massMg: 10, finalVolumeMl: 2 },
    })
    expect(events.find((event) => event.type === "tool-result")).toMatchObject({
      content: { calculation: { values: { concentrationMgPerMl: 5 } } },
    })
    expect(events.find((event) => event.type === "text")).toMatchObject({
      delta: expect.stringContaining("5 mg/mL"),
    })
    expect(events.at(-1)?.type).toBe("done")
  })
  it("handles every possible two-chunk boundary in the actual response", () => {
    for (let index = 0; index <= captured.length; index++) {
      const parser = createAgentEventParser()
      const events = [
        ...parser.push(captured.slice(0, index)),
        ...parser.push(captured.slice(index)),
      ]
      expect(events, `split at character ${index}`).toEqual(expected)
    }
  })
  it("ignores a standalone heartbeat without blocking the following network chunk", () => {
    const parser = createAgentEventParser()
    expect(parser.push(": keep-alive\n\n")).toEqual([])
    expect(parser.push("data:\n\n")).toEqual([])
    expect(parser.push('data: {"type":"text","delta":"Pitoisuus on 5 mg/mL."}\n\n')).toEqual([
      { type: "text", delta: "Pitoisuus on 5 mg/mL." },
    ])
  })
  it("preserves Finnish text when UTF-8 code points and frame boundaries split across byte chunks", () => {
    const bytes = new TextEncoder().encode(
      ': keep-alive\r\n\r\ndata: {"type":"text","delta":"Lähtötiedot: 250 µg. Näyte."}\r\n\r\n',
    )
    for (let width = 1; width <= bytes.length; width++) {
      const decoder = new TextDecoder()
      const parser = createAgentEventParser()
      const events = []
      for (let start = 0; start < bytes.length; start += width)
        events.push(
          ...parser.push(decoder.decode(bytes.slice(start, start + width), { stream: true })),
        )
      events.push(...parser.push(decoder.decode()))
      expect(events).toEqual([{ type: "text", delta: "Lähtötiedot: 250 µg. Näyte." }])
    }
  })
  it("skips metadata and malformed/empty frames without dropping the next valid event", () => {
    const parser = createAgentEventParser()
    expect(
      parser.push(
        'event: message\nid: ignored\n\ndata:\n\ndata: invalid JSON\n\ndata: {"type":"text",\ndata: "delta":"kept"}\n\n',
      ),
    ).toEqual([{ type: "text", delta: "kept" }])
  })
  it("does not invent completion for an incomplete terminal frame", () => {
    const parser = createAgentEventParser()
    expect(parser.push('data: {"type":"done","usage":')).toEqual([])
    expect(parser.push("")).toEqual([])
  })
})
