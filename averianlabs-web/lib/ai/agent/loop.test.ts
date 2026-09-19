/**
 * Agent loop orchestrator — replayed-stream unit tests.
 *
 * Mocks `streamMinimaxChat` so we can drive the loop deterministically with
 * pre-recorded SSE-shaped streams. Verifies:
 *   - text deltas are streamed to the sink in order
 *   - tool calls trigger dispatch and tool-result events
 *   - parallel tool calls stay separate (route-by-index)
 *   - finish_reason !== "tool_calls" terminates the loop
 *   - MAX_STEPS surfaces a friendly fallback when the model never answers
 *   - AbortSignal stops the loop cleanly
 *   - memory + retrieval are wired into the system prompt construction
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock the provider with a factory — each test substitutes its own stream.
const streamMinimaxChat = vi.fn()
vi.mock("@/lib/ai/providers/minimax", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    streamMinimaxChat: (...args: unknown[]) => streamMinimaxChat(...args),
    isMinimaxConfigured: () => true,
  }
})

const retrieveContext = vi.fn().mockResolvedValue([])
vi.mock("@/lib/ai/rag/retrieval", () => ({
  retrieveContext: (...args: unknown[]) => retrieveContext(...args),
}))

const listMemories = vi.fn().mockResolvedValue([])
vi.mock("@/lib/ai/memory/store", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    listMemories: (...args: unknown[]) => listMemories(...args),
  }
})

// Silence the structured logger so test runs don't get flooded with JSON
// lines that obscure real assertion output.
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ── Imports under test ───────────────────────────────────────────────────────

import { runAgent } from "@/lib/ai/agent/loop"
import type { AgentEvent } from "@/lib/ai/types/events"

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CapturedEvent {
  type: string
  [k: string]: unknown
}

function recordingSink() {
  const events: CapturedEvent[] = []
  return {
    enqueue(event: AgentEvent): void {
      events.push(event as CapturedEvent)
    },
    events,
    text: () =>
      events
        .filter((e) => e.type === "text")
        .map((e) => String(e.delta ?? ""))
        .join(""),
    toolNames: () => events.filter((e) => e.type === "tool-call").map((e) => String(e.name)),
    lastEvent: () => events.at(-1),
  }
}

interface StreamChunk {
  delta: { content?: string; tool_calls?: Array<Record<string, unknown>> }
  finish_reason?: string
}

/** Builds an async iterable from an array of chunks, mimicking streamMinimaxChat's shape. */
async function* streamFromChunks(chunks: StreamChunk[]) {
  for (const c of chunks) yield c
}

function textChunk(content: string): StreamChunk {
  return { delta: { content } }
}

function toolCallChunk(id: string, name: string, argsJson: string, index = 0): StreamChunk {
  return {
    delta: {
      tool_calls: [
        {
          index,
          id,
          type: "function",
          function: { name, arguments: argsJson },
        },
      ],
    },
  }
}

function toolArgsChunk(index: number, argsJson: string): StreamChunk {
  return {
    delta: {
      tool_calls: [{ index, function: { arguments: argsJson } }],
    },
  }
}

const baseInput = {
  locale: "en" as const,
  history: [],
  newUserMessage: { id: "u1", role: "user" as const, content: "hello" },
  cart: [],
}

afterEach(() => {
  vi.clearAllMocks()
  retrieveContext.mockResolvedValue([])
  listMemories.mockResolvedValue([])
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runAgent — single-shot text", () => {
  it("streams text deltas and emits a single done event", async () => {
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([
        textChunk("Hello"),
        textChunk(", "),
        textChunk("world!"),
        { delta: {}, finish_reason: "stop" },
      ]),
    )

    const sink = recordingSink()
    await runAgent(baseInput, sink)

    expect(sink.text()).toBe("Hello, world!")
    // One `done` and no tool calls.
    expect(sink.events.filter((e) => e.type === "done")).toHaveLength(1)
    expect(sink.toolNames()).toEqual([])
    const last = sink.lastEvent() as {
      type: string
      usage: { tokensIn: number; tokensOut: number; latencyMs: number }
    }
    expect(last.type).toBe("done")
    expect(last.usage.latencyMs).toBeGreaterThanOrEqual(0)
  })
})

describe("runAgent — single tool call → answer", () => {
  it("runs a single tool, feeds the result back, then emits the final answer", async () => {
    let callCount = 0
    streamMinimaxChat.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return streamFromChunks([
          toolCallChunk("call_1", "viewCart", "{}"),
          { delta: {}, finish_reason: "tool_calls" },
        ])
      }
      return streamFromChunks([
        textChunk("Your cart is empty."),
        { delta: {}, finish_reason: "stop" },
      ])
    })

    const sink = recordingSink()
    await runAgent(baseInput, sink)

    expect(sink.toolNames()).toEqual(["viewCart"])
    // Both a tool-call and tool-result event should have fired.
    expect(sink.events.some((e) => e.type === "tool-call")).toBe(true)
    expect(sink.events.some((e) => e.type === "tool-result")).toBe(true)
    expect(sink.text()).toBe("Your cart is empty.")
    // Two model calls total — first with tools, second with tool results.
    expect(streamMinimaxChat).toHaveBeenCalledTimes(2)
  })
})

describe("runAgent — parallel tool calls", () => {
  it("dispatches two parallel tool calls in one step", async () => {
    let callCount = 0
    streamMinimaxChat.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return streamFromChunks([
          toolCallChunk("call_a", "getProduct", '{"slug":"bpc-157"}', 0),
          toolCallChunk("call_b", "getProduct", '{"slug":"tb-500"}', 1),
          { delta: {}, finish_reason: "tool_calls" },
        ])
      }
      return streamFromChunks([
        textChunk("Comparing both now."),
        { delta: {}, finish_reason: "stop" },
      ])
    })

    const sink = recordingSink()
    await runAgent(baseInput, sink)

    expect(sink.toolNames().sort()).toEqual(["getProduct", "getProduct"])
    expect(sink.events.filter((e) => e.type === "tool-call")).toHaveLength(2)
    expect(sink.events.filter((e) => e.type === "tool-result")).toHaveLength(2)
    expect(sink.text()).toBe("Comparing both now.")
  })

  it("handles interleaved arg-only deltas across two parallel tool calls", async () => {
    let callCount = 0
    streamMinimaxChat.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Mirror the parallel-tool-call SSE shape: id-bearing deltas first,
        // then argument fragments interleaved by index. The previous
        // implementation concatenated across calls and produced broken JSON.
        return streamFromChunks([
          toolCallChunk("call_a", "getProduct", '{"slug":', 0),
          toolCallChunk("call_b", "getProduct", '{"slug":', 1),
          toolArgsChunk(0, '"bpc-157"}'),
          toolArgsChunk(1, '"tb-500"}'),
          { delta: {}, finish_reason: "tool_calls" },
        ])
      }
      return streamFromChunks([textChunk("Done."), { delta: {}, finish_reason: "stop" }])
    })

    const sink = recordingSink()
    await runAgent(baseInput, sink)

    // Confirm each tool call received its OWN args, not a concatenation of
    // the parallel calls'. `args` is emitted as the parsed object (the loop
    // runs `JSON.parse` once at dispatch time) — so we compare on the slug
    // field rather than the raw JSON string.
    const argsById = new Map<string, { slug?: string }>()
    for (const e of sink.events) {
      if (e.type === "tool-call") {
        argsById.set(String(e.id), e.args as { slug?: string })
      }
    }
    expect(argsById.get("call_a")?.slug).toBe("bpc-157")
    expect(argsById.get("call_b")?.slug).toBe("tb-500")
  })
})

describe("runAgent — error handling", () => {
  it("falls back to a friendly message when MAX_STEPS is exhausted with text-only", async () => {
    // Force MAX_STEPS = 1 via override so the test is fast and deterministic.
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([
        toolCallChunk("call_1", "viewCart", "{}"),
        { delta: {}, finish_reason: "tool_calls" },
      ]),
    )

    const sink = recordingSink()
    await runAgent({ ...baseInput, maxSteps: 1 }, sink)

    // The model produced only a tool call with no text, so the loop surfaces a fallback.
    expect(sink.text()).toMatch(/gathered the information/i)
  })

  it("stops cleanly when the caller's AbortSignal fires mid-stream", async () => {
    const controller = new AbortController()
    streamMinimaxChat.mockImplementation(async function* () {
      yield textChunk("Par")
      // The loop checks signal.aborted before each chunk in the inner stream
      // consumer. We abort right after the first chunk to exercise that path.
      controller.abort()
      yield textChunk("tial")
    })

    const sink = recordingSink()
    await runAgent({ ...baseInput, signal: controller.signal }, sink)

    // Loop returns early — no `done` event is emitted, but the call resolves
    // without throwing. `error` events aren't expected either; the connection
    // simply ends mid-stream.
    expect(sink.events.filter((e) => e.type === "error")).toHaveLength(0)
  })
})

describe("runAgent — tool timeout", () => {
  it("recovers with a synthetic tool_timeout error when a tool exceeds the timeout", async () => {
    let callCount = 0
    streamMinimaxChat.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return streamFromChunks([
          toolCallChunk("call_1", "viewCart", "{}"),
          { delta: {}, finish_reason: "tool_calls" },
        ])
      }
      return streamFromChunks([
        textChunk("The tool timed out."),
        { delta: {}, finish_reason: "stop" },
      ])
    })

    // Make viewCart hang long enough to trip the timeout. We import the
    // registry directly so we can stub the registered tool in-place.
    const { TOOL_REGISTRY } = await import("@/lib/ai/tools/registry")
    type RegisteredTool = NonNullable<(typeof TOOL_REGISTRY)[string]>
    const original: RegisteredTool | undefined = TOOL_REGISTRY.viewCart
    if (!original) throw new Error("viewCart tool not registered")
    TOOL_REGISTRY.viewCart = {
      ...original,
      definition: original.definition,
      execute: () => new Promise(() => {}) as ReturnType<RegisteredTool["execute"]>,
    }

    try {
      const sink = recordingSink()
      await runAgent({ ...baseInput, toolTimeoutMs: 25 }, sink)

      const toolResults = sink.events.filter((e) => e.type === "tool-result")
      expect(toolResults).toHaveLength(1)
      const content = toolResults[0]?.content as { error?: string; timeoutMs?: number }
      expect(content.error).toBe("tool_timeout")
      expect(content.timeoutMs).toBe(25)
    } finally {
      TOOL_REGISTRY.viewCart = original
    }
  })

  it("skips the timeout when toolTimeoutMs is non-positive (test/admin path)", async () => {
    let callCount = 0
    streamMinimaxChat.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return streamFromChunks([
          toolCallChunk("call_1", "viewCart", "{}"),
          { delta: {}, finish_reason: "tool_calls" },
        ])
      }
      return streamFromChunks([textChunk("Done."), { delta: {}, finish_reason: "stop" }])
    })

    const sink = recordingSink()
    await runAgent({ ...baseInput, toolTimeoutMs: 0 }, sink)

    const toolResults = sink.events.filter((e) => e.type === "tool-result")
    expect(toolResults).toHaveLength(1)
    const content = toolResults[0]?.content as { error?: string; subtotalCents?: number }
    // Normal tool result, not a timeout error.
    expect(content.error).toBeUndefined()
    expect(content.subtotalCents).toBe(0)
  })
})

describe("runAgent — retrieval + memory wiring", () => {
  it("calls retrieveContext once per turn with the user query", async () => {
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([textChunk("Hi."), { delta: {}, finish_reason: "stop" }]),
    )

    await runAgent(baseInput, recordingSink())

    expect(retrieveContext).toHaveBeenCalledTimes(1)
    expect(retrieveContext).toHaveBeenCalledWith(
      expect.objectContaining({ query: "hello", locale: "en" }),
    )
  })

  it("skips retrieval when noRetrieve is set", async () => {
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([textChunk("Hi."), { delta: {}, finish_reason: "stop" }]),
    )

    await runAgent({ ...baseInput, noRetrieve: true }, recordingSink())

    expect(retrieveContext).not.toHaveBeenCalled()
  })

  it("emits citations events when retrieval returns chunks", async () => {
    retrieveContext.mockResolvedValueOnce([
      {
        id: "c1",
        documentId: "product:bpc-157:en",
        source: "product",
        sourceId: "bpc-157",
        locale: "en",
        title: "BPC-157",
        url: "/en/shop/bpc-157",
        content: "BPC-157 details…",
        score: 0.9,
        bm25Rank: 1,
        vectorRank: null,
        position: 0,
      },
    ])
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([textChunk("Here you go."), { delta: {}, finish_reason: "stop" }]),
    )

    const sink = recordingSink()
    await runAgent(baseInput, sink)

    const citations = sink.events.find((e) => e.type === "citations")
    expect(citations).toBeDefined()
    expect(citations?.type).toBe("citations")
    expect(Array.isArray(citations?.citations)).toBe(true)
    // The wire shape should NOT include the chunk content (it can be large).
    const wire = (citations?.citations as Array<Record<string, unknown>>)[0]
    expect(wire?.sourceId).toBe("bpc-157")
    expect(wire).not.toHaveProperty("content")
  })

  it("loads memories when an owner is provided", async () => {
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([textChunk("Noted."), { delta: {}, finish_reason: "stop" }]),
    )

    await runAgent({ ...baseInput, owner: { kind: "user", userId: "user_123" } }, recordingSink())

    expect(listMemories).toHaveBeenCalledWith("user_123")
  })

  it("skips memory loading when no owner is provided", async () => {
    streamMinimaxChat.mockImplementation(() =>
      streamFromChunks([textChunk("Hi."), { delta: {}, finish_reason: "stop" }]),
    )

    await runAgent(baseInput, recordingSink())

    expect(listMemories).not.toHaveBeenCalled()
  })
})
