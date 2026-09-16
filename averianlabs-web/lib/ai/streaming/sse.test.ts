import { describe, expect, it } from "vitest"
import { parseSseStream, SseParseError } from "@/lib/ai/streaming/sse"

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out: unknown[] = []
  for await (const ev of parseSseStream(stream)) out.push(ev)
  return out
}

describe("parseSseStream", () => {
  it("yields a single framed event", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode('data: {"type":"text","delta":"hi"}\n\n'),
    ])
    const events = await collect(stream)
    expect(events).toEqual([{ type: "text", delta: "hi" }])
  })

  it("joins multiple chunks into one frame", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode('data: {"type":"te'),
      new TextEncoder().encode('xt","delta":"abc"}\n\n'),
    ])
    const events = await collect(stream)
    expect(events).toEqual([{ type: "text", delta: "abc" }])
  })

  it("handles back-to-back frames in the same chunk", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode(
        'data: {"type":"text","delta":"a"}\n\ndata: {"type":"text","delta":"b"}\n\n',
      ),
    ])
    const events = await collect(stream)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: "text", delta: "a" })
    expect(events[1]).toEqual({ type: "text", delta: "b" })
  })

  it("ignores non-data lines and empty payloads", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode(
        'event: ping\ndata: \n\ndata: {"type":"text","delta":"ok"}\n\n',
      ),
    ])
    const events = await collect(stream)
    expect(events).toEqual([{ type: "text", delta: "ok" }])
  })

  it("throws SseParseError on malformed JSON", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode("data: not-json\n\n"),
    ])
    await expect(collect(stream)).rejects.toBeInstanceOf(SseParseError)
  })

  it("flushes a trailing frame without a closing blank line", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode('data: {"type":"done","usage":{"tokensIn":1,"tokensOut":2,"latencyMs":3}}'),
    ])
    const events = await collect(stream)
    expect(events).toEqual([{ type: "done", usage: { tokensIn: 1, tokensOut: 2, latencyMs: 3 } }])
  })

  it("emits no events for a stream of only heartbeats", async () => {
    const stream = streamFromChunks([
      new TextEncoder().encode(": heartbeat\n\n"),
    ])
    const events = await collect(stream)
    expect(events).toEqual([])
  })
})
