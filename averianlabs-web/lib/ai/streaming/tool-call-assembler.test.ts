import {
  type AssemblerState,
  applyToolCallDelta,
  createAssembler,
  finalizeAssembler,
} from "@/lib/ai/streaming/tool-call-assembler"
import { describe, expect, it } from "vitest"

function feed(state: AssemblerState, deltas: Array<Parameters<typeof applyToolCallDelta>[1]>) {
  for (const d of deltas) applyToolCallDelta(state, d)
}

describe("tool-call assembler", () => {
  it("assembles a single tool call across many arg-only deltas", () => {
    const state = createAssembler()
    feed(state, [
      { index: 0, id: "call_a", function: { name: "searchProducts", arguments: '{"q":' } },
      { index: 0, function: { arguments: '"BPC' } },
      { index: 0, function: { arguments: '-157"}' } },
    ])
    const out = finalizeAssembler(state)
    expect(out).toEqual([{ id: "call_a", name: "searchProducts", argsJson: '{"q":"BPC-157"}' }])
  })

  it("keeps parallel tool calls separate by routing on index, not last-seen id", () => {
    const state = createAssembler()
    feed(state, [
      { index: 0, id: "call_a", function: { name: "getProduct", arguments: '{"slug":' } },
      { index: 1, id: "call_b", function: { name: "getProduct", arguments: '{"slug":' } },
      { index: 0, function: { arguments: '"bpc-157"}' } },
      { index: 1, function: { arguments: '"tb-500"}' } },
    ])
    const out = finalizeAssembler(state)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ id: "call_a", name: "getProduct", argsJson: '{"slug":"bpc-157"}' })
    expect(out[1]).toEqual({ id: "call_b", name: "getProduct", argsJson: '{"slug":"tb-500"}' })
  })

  it("falls back to a synthetic key when the upstream id never arrives", () => {
    const state = createAssembler()
    feed(state, [
      { index: 2, function: { name: "searchProducts", arguments: '{"q":' } },
      { index: 2, function: { arguments: '"retatrutide"}' } },
    ])
    const out = finalizeAssembler(state)
    expect(out).toHaveLength(1)
    expect(out[0]?.name).toBe("searchProducts")
    expect(out[0]?.argsJson).toBe('{"q":"retatrutide"}')
    expect(out[0]?.id).toMatch(/^__idx_2$/)
  })

  it("upgrades the key to the upstream id when it arrives in a later delta", () => {
    const state = createAssembler()
    feed(state, [
      { index: 0, function: { name: "getProduct", arguments: '{"slug":' } },
      { index: 0, id: "call_real", function: { arguments: '"bpc-157"}' } },
    ])
    const out = finalizeAssembler(state)
    expect(out).toHaveLength(1)
    expect(out[0]?.id).toBe("call_real")
    expect(out[0]?.argsJson).toBe('{"slug":"bpc-157"}')
  })

  it("preserves insertion order across mixed parallel deltas", () => {
    const state = createAssembler()
    feed(state, [
      { index: 1, id: "call_b", function: { name: "viewCart", arguments: "{}" } },
      { index: 0, id: "call_a", function: { name: "searchProducts", arguments: '{"q":"x"}' } },
      { index: 2, id: "call_c", function: { name: "getProduct", arguments: '{"slug":"y"}' } },
    ])
    const out = finalizeAssembler(state)
    expect(out.map((t) => t.id)).toEqual(["call_b", "call_a", "call_c"])
  })

  it("returns an empty list when no tool-call deltas arrive", () => {
    const state = createAssembler()
    expect(finalizeAssembler(state)).toEqual([])
  })
})
