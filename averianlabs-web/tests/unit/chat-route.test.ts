import { calculateLaboratory } from "@/lib/calculations"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  mode: "calculation",
  agentSignal: undefined as AbortSignal | undefined,
  getOrCreateConversation: vi.fn(),
  loadRecentMessages: vi.fn(),
  appendMessages: vi.fn(),
  setConversationTitle: vi.fn(),
}))
vi.mock("@/lib/admin/guard", () => ({ getAdminOrNull: vi.fn(async () => null) }))
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "qa-owner", email: "qa@example.invalid" } })),
}))
vi.mock("@/lib/ai/providers/minimax", () => ({ isMinimaxConfigured: () => true }))
vi.mock("@/lib/ai/rate-limit", () => ({ checkChatRateLimit: async () => ({ ok: true }) }))
vi.mock("@/lib/products/catalogue", () => ({ getStorefrontCatalogue: async () => [] }))
vi.mock("@/lib/ai/memory/consent", () => ({
  getConsentFromRequest: () => "accepted",
  getAnonFromRequest: () => null,
}))
vi.mock("@/lib/ai/memory/store", () => ({
  getOrCreateConversation: state.getOrCreateConversation,
  loadRecentMessages: state.loadRecentMessages,
  appendMessages: state.appendMessages,
  setConversationTitle: state.setConversationTitle,
}))
vi.mock("@/lib/ai/agent/loop", () => ({
  runAgent: async (input: { signal: AbortSignal }, sink: { enqueue: (event: unknown) => void }) => {
    state.agentSignal = input.signal
    if (state.mode === "slow") await new Promise((resolve) => setTimeout(resolve, 13000))
    if (state.mode.startsWith("guidance")) {
      sink.enqueue({
        type: "tool-call",
        id: "guide",
        name: "getResearchGuidance",
        args: { topic: "dilution_limit" },
      })
      sink.enqueue({
        type: "tool-result",
        id: "guide",
        name: "getResearchGuidance",
        content:
          state.mode === "guidance-error"
            ? { error: "unknown_guidance_topic" }
            : { topic: "dilution_limit" },
      })
      sink.enqueue({
        type: "text",
        delta: "There is no positive solution and an unapproved preparation procedure is required.",
      })
    } else if (state.mode === "calculation") {
      const inputs = { mode: "concentration" as const, massMg: 1, finalVolumeMl: 3 }
      sink.enqueue({ type: "tool-call", id: "calc", name: "calculateLaboratory", args: inputs })
      sink.enqueue({
        type: "tool-result",
        id: "calc",
        name: "calculateLaboratory",
        content: { calculation: calculateLaboratory(inputs) },
      })
      sink.enqueue({
        type: "text",
        delta: "Claim [1]. Recover this with an unapproved procedure; the result is 999 mg/mL.",
      })
    } else {
      sink.enqueue({ type: "text", delta: "A published original report proves this claim [1]." })
    }
    sink.enqueue({ type: "done", usage: { tokensIn: 1, tokensOut: 1, latencyMs: 1 } })
  },
}))
import { POST } from "@/app/api/ai/chat/route"

describe("research chat final output", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.mode = "calculation"
  })
  afterEach(() => vi.useRealTimers())
  async function ask(locale = "en") {
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          noPersist: true,
          readOnly: true,
          noRetrieve: true,
          messages: [
            { id: "q", role: "user", content: "Calculate the given laboratory concentration." },
          ],
        }),
      }),
    )
    return response.text()
  }
  it("replaces generated calculations and procedures with rounded, validated bilingual results", async () => {
    const english = await ask()
    expect(english).toContain("0.33333333 mg/mL")
    expect(english).not.toContain("unapproved procedure")
    expect(english).not.toContain("999 mg/mL")
    expect(english).not.toContain("Claim [1]")
    const finnish = await ask("fi")
    expect(finnish).toContain("0,33333333 mg/mL")
    expect(finnish).toContain("Vain laboratoriotutkimukseen")
  })
  it("does not create or update a consented conversation when noPersist is explicit", async () => {
    await ask()
    expect(state.getOrCreateConversation).not.toHaveBeenCalled()
    expect(state.loadRecentMessages).not.toHaveBeenCalled()
    expect(state.setConversationTitle).not.toHaveBeenCalled()
    expect(state.appendMessages).not.toHaveBeenCalled()
  })
  it("withholds a factual answer whose numbered citation has no returned source", async () => {
    state.mode = "citation"
    const response = await ask()
    expect(response).not.toContain("proves this claim")
    expect(response).toContain("I could not verify this answer")
  })
  it("keeps a slow buffered answer alive without sending unverified content and clears the timer", async () => {
    vi.useFakeTimers()
    state.mode = "slow"
    const answer = ask()
    await vi.advanceTimersByTimeAsync(13001)
    const text = await answer
    expect(text.match(/: keep-alive/g)).toHaveLength(4)
    expect(text).toContain('"type":"done"')
    expect(text).not.toContain("proves this claim")
    expect(vi.getTimerCount()).toBe(0)
  })
  it("aborts the provider and removes heartbeats when the client cancels a slow stream", async () => {
    vi.useFakeTimers()
    state.mode = "slow"
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          noPersist: true,
          messages: [{ id: "cancel", role: "user", content: "Explain nominal mass." }],
        }),
      }),
    )
    await response.body?.cancel()
    expect(state.agentSignal?.aborted).toBe(true)
    // Only the mocked provider's delay remains; the server heartbeat is gone.
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(13001)
    expect(vi.getTimerCount()).toBe(0)
  })
  it("renders scientific guidance from the reviewed topic and suppresses generated procedures", async () => {
    state.mode = "guidance"
    const response = await ask("fi")
    expect(response).toContain("positiivinen V₂")
    expect(response).toContain("V₂ ≥ V₁")
    expect(response).not.toContain("unapproved preparation")
  })
  it("cannot fall back to a generated scientific explanation after a failed guidance lookup", async () => {
    state.mode = "guidance-error"
    const response = await ask()
    expect(response).not.toContain("unapproved preparation")
    expect(response).toContain("I could not verify this answer")
  })
})
