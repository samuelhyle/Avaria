import { calculateLaboratory } from "@/lib/calculations"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  mode: "calculation",
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
  runAgent: async (_input: unknown, sink: { enqueue: (event: unknown) => void }) => {
    if (state.mode === "calculation") {
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
})
