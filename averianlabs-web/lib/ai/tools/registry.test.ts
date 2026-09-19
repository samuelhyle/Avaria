/**
 * Tool registry — admin gating + dispatch unit tests.
 *
 * Covers:
 *   - `listToolDefinitions` filters out admin tools for non-admin callers
 *   - `runTool` rejects unknown tools
 *   - `runTool` rejects admin tools when the caller isn't an admin
 *   - the registry includes every public tool listed in the system prompt
 */

import {
  TOOL_REGISTRY,
  type ToolContext,
  listToolDefinitions,
  runTool,
} from "@/lib/ai/tools/registry"
import { describe, expect, it } from "vitest"

const adminCtx: ToolContext = {
  locale: "en",
  cart: [],
  isAdmin: true,
  auth: { userId: "u1", email: "a@b.c", role: "admin" },
}

const anonCtx: ToolContext = {
  locale: "en",
  cart: [],
}

describe("tool registry — listToolDefinitions", () => {
  it("includes public tools for anonymous callers", () => {
    const defs = listToolDefinitions(anonCtx).map((d) => d.function.name)
    expect(defs).toContain("searchProducts")
    expect(defs).toContain("getProduct")
    expect(defs).toContain("viewCart")
    expect(defs).toContain("addToCart")
    expect(defs).toContain("getReconstitution")
    expect(defs).toContain("rememberPreference")
    expect(defs).toContain("escalateToHuman")
    expect(defs).toContain("createSupportTicket")
  })

  it("hides admin tools from non-admin callers", () => {
    const defs = listToolDefinitions(anonCtx).map((d) => d.function.name)
    expect(defs).not.toContain("adminListLowStock")
    expect(defs).not.toContain("adminLookupOrder")
    expect(defs).not.toContain("adminDraftReply")
  })

  it("exposes admin tools to admin callers", () => {
    const defs = listToolDefinitions(adminCtx).map((d) => d.function.name)
    expect(defs).toContain("adminListLowStock")
    expect(defs).toContain("adminLookupOrder")
    expect(defs).toContain("adminDraftReply")
  })

  it("matches the public tool list advertised by the system prompt", () => {
    // A regression here means a new tool was added but not mentioned in
    // lib/ai/prompts/system.ts. Keep them in sync — see AVERIA_TOOLS.
    const PUBLIC = new Set([
      "searchProducts",
      "getProduct",
      "getBatches",
      "compareProducts",
      "getReconstitution",
      "viewCart",
      "addToCart",
      "rememberPreference",
      "escalateToHuman",
      "createSupportTicket",
    ])
    for (const name of PUBLIC) {
      expect(TOOL_REGISTRY[name], `expected public tool ${name} to be in registry`).toBeDefined()
    }
  })
})

describe("tool registry — runTool", () => {
  it("rejects unknown tool names", async () => {
    await expect(runTool("notARealTool", {}, adminCtx)).rejects.toThrow(/Unknown tool/)
  })

  it("rejects admin tools when the caller is not an admin", async () => {
    await expect(runTool("adminListLowStock", {}, anonCtx)).rejects.toThrow(/requires admin/)
  })

  it("dispatches public tools without requiring admin", async () => {
    const out = await runTool("viewCart", {}, anonCtx)
    expect(out).toHaveProperty("content")
    expect(out.content).toMatchObject({ count: 0, subtotalCents: 0 })
  })
})
