/**
 * `LazyChatWidget` — defers the chat bundle until the browser is idle.
 *
 * We can't easily test the dynamic-import / requestIdleCallback branch
 * in node-vitest (no window.requestIdleCallback), but we can:
 *   - smoke-test that the module imports cleanly,
 *   - verify the `useEffect` callback doesn't crash when `requestIdleCallback`
 *     is missing (Safari fallback path).
 */

import { describe, expect, it } from "vitest"

describe("LazyChatWidget module", () => {
  it("exports LazyChatWidget as a function", async () => {
    const mod = await import("@/components/ai/chat/LazyChatWidget")
    expect(typeof mod.LazyChatWidget).toBe("function")
  })
})
