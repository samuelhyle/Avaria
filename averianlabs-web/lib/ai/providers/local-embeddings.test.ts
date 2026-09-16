import { localEmbedText, localEmbedderStatus } from "@/lib/ai/providers/local-embeddings"
import { afterAll, describe, expect, it } from "vitest"

/**
 * Integration test for the local ONNX-based embedder.
 *
 * Loads Xenova/all-MiniLM-L6-v2 the first time and verifies dimension,
 * shape, and that a couple of related texts land closer to each other
 * than to an unrelated one (sanity check on semantic quality).
 *
 * Model load takes ~9s on a warm cache, so this test is gated by env to
 * keep CI fast. Set `RUN_LOCAL_EMBED_TESTS=1` to enable.
 */

const ENABLED = process.env.RUN_LOCAL_EMBED_TESTS === "1"

describe.skipIf(!ENABLED)("local-embeddings (Xenova/all-MiniLM-L6-v2)", () => {
  afterAll(() => {
    // No teardown needed; the pipeline lives for the process lifetime.
  })

  it("returns a 384-dim vector for a single text", async () => {
    const vec = await localEmbedText("BPC-157 is a synthetic pentadecapeptide.")
    expect(vec).not.toBeNull()
    expect(vec?.length).toBe(384)
    // Should be roughly normalised (sum of squares ≈ 1).
    if (vec) {
      const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0))
      expect(mag).toBeGreaterThan(0.99)
      expect(mag).toBeLessThan(1.01)
    }
  }, 60_000)

  it("returns null for empty / whitespace-only text", async () => {
    expect(await localEmbedText("")).toBeNull()
    expect(await localEmbedText("   \n\t  ")).toBeNull()
  }, 30_000)

  it("reports status with model + dimension", () => {
    const status = localEmbedderStatus()
    expect(status.dimension).toBe(384)
    expect(status.model).toContain("all-MiniLM-L6-v2")
  })

  it("semantic similarity: peptide texts land closer to each other than to a control", async () => {
    const [a, b, c] = await Promise.all([
      localEmbedText("BPC-157 is a peptide used in tendon recovery research."),
      localEmbedText("TB-500 is a thymosin beta-4 fragment used in tissue repair."),
      localEmbedText("The Eiffel Tower is in Paris, France."),
    ])
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(c).not.toBeNull()
    if (!a || !b || !c) return
    const cos = (x: number[], y: number[]) => {
      let dot = 0
      for (let i = 0; i < x.length; i++) dot += x[i]! * y[i]!
      return dot
    }
    const peptideSim = cos(a, b)
    const controlSim = cos(a, c)
    expect(peptideSim).toBeGreaterThan(controlSim)
  }, 60_000)
})
