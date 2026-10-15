import { ChatInput } from "@/components/ai/ChatInput"
import { type ChatMessage, MessageList } from "@/components/ai/MessageList"
// @vitest-environment happy-dom
import { Calculator } from "@/components/calculator/Calculator"
import { calculationFields } from "@/components/calculator/input-state"
import { ThreadComposer } from "@/components/community/ThreadComposer"
import { ResearchMarkdown } from "@/components/ui/ResearchMarkdown"
import React, { act, createElement } from "react"
import { type Root, createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useStore } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { createStore } from "zustand/vanilla"

const mocks = vi.hoisted(() => ({ push: vi.fn(), fetch: vi.fn() }))
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () =>
    Object.assign(
      (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${Object.values(values).join(" ")}` : key,
      { has: () => false },
    ),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

let host: HTMLDivElement
let root: Root
async function render(node: React.ReactNode) {
  await act(async () => root.render(node))
}
async function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.textContent === text,
  )
  if (!button) throw new Error(`Missing button: ${text}`)
  await act(async () => button.click())
}
beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("fetch", mocks.fetch)
  mocks.fetch.mockReset()
  mocks.push.mockReset()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe("research workspace input and reading contracts", () => {
  it("keeps the SSR count on its initial snapshot before restoring a persisted cart on the client", async () => {
    type State = { items: Array<{ qty: number }>; count: () => number }
    const saved = JSON.stringify({ state: { items: [{ qty: 2 }] }, version: 0 })
    const store = createStore<State>()(
      persist(
        (_set, get) => ({
          items: [],
          count: () => get().items.reduce((sum, item) => sum + item.qty, 0),
        }),
        {
          name: "synthetic-cart-snapshot",
          storage: createJSONStorage(() => ({
            getItem: () => saved,
            setItem: () => {},
            removeItem: () => {},
          })),
        },
      ),
    )
    // A get()-backed method escapes the initial snapshot even though its items are empty.
    expect(store.getInitialState().items).toHaveLength(0)
    expect(store.getInitialState().count()).toBe(2)
    function SnapshotCounter() {
      const items = useStore(store, (state) => state.items)
      return createElement(
        "span",
        null,
        items.reduce((sum, item) => sum + item.qty, 0),
      )
    }
    expect(renderToStaticMarkup(createElement(SnapshotCounter))).toBe("<span>0</span>")
    await render(createElement(SnapshotCounter))
    expect(host.textContent).toBe("2")
    expect(store.getState().items).toHaveLength(1)
  })
  it("never fills a partial SKU handoff with an unrelated example volume", async () => {
    expect(calculationFields({ mode: "concentration", massMg: 10 }).volume).toBe("")
    expect(calculationFields({ mode: "concentration", massMg: 10 }).stock).toBe("")
    await render(
      createElement(Calculator, {
        initial: { mode: "concentration", massMg: 10 },
        source: { sku: "SOURCE-10", name: "Reference material", nominalMassMg: 10 },
      }),
    )
    const label = [...host.querySelectorAll("label")].find(
      (element) => element.textContent === "volume",
    )
    const volume = host.querySelector<HTMLInputElement>(`#${CSS.escape(label?.htmlFor ?? "")}`)
    expect(volume?.value).toBe("")
    expect(host.textContent).toContain("origin.catalogue")
    expect(host.querySelector("dl")).toBeNull()
    expect(
      [...host.querySelectorAll("button")].find((button) => button.textContent === "copy")
        ?.disabled,
    ).toBe(true)
  })

  it("preserves explicitly supplied volume and leaves standalone examples visibly distinct", () => {
    expect(calculationFields({ mode: "concentration", massMg: 10, finalVolumeMl: 3 }).volume).toBe(
      "3",
    )
    expect(calculationFields().volume).toBe("2")
  })

  it("renders structured source text and scrollable tables without executing HTML or loading remote media", async () => {
    await render(
      createElement(ResearchMarkdown, {
        body: "## Method\n\n- First\n- Second\n\n[Original](https://example.invalid/report)\n\n| Unit | Value |\n|---|---|\n| mg | 10 |\n\n![Figure](https://example.invalid/figure.png)\n\n<script>window.unsafe=true</script>\n\n[Unsafe](javascript:alert(1))",
      }),
    )
    expect(host.querySelector("h3")?.classList.contains("font-semibold")).toBe(true)
    expect(host.querySelector("ul")?.classList.contains("list-disc")).toBe(true)
    expect(
      host
        .querySelector('a[href="https://example.invalid/report"]')
        ?.classList.contains("underline"),
    ).toBe(true)
    expect(host.querySelector('[role="region"]')?.getAttribute("tabindex")).toBe("0")
    expect(host.querySelector("th")?.getAttribute("scope")).toBe("col")
    expect(host.querySelector("img")).toBeNull()
    expect(host.querySelector("script")).toBeNull()
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull()
  })

  it("does not send during IME composition or Shift+Enter, then sends once on ordinary Enter", async () => {
    const send = vi.fn()
    await render(
      createElement(ChatInput, {
        value: "A question",
        onChange: vi.fn(),
        onSubmit: send,
        placeholder: "Ask",
      }),
    )
    const input = host.querySelector("textarea")
    if (!input) throw new Error("Composer missing")
    expect(input.getAttribute("aria-describedby")).toBeTruthy()
    expect(input.getAttribute("rows")).toBe("2")
    await act(async () =>
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })),
    )
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
      ),
    )
    expect(send).not.toHaveBeenCalled()
    await act(async () =>
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })),
    )
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }),
      ),
    )
    expect(send).not.toHaveBeenCalled()
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith("A question")
  })

  it("keeps a reader's scroll position until they choose the new-answer control", async () => {
    const messages: ChatMessage[] = [{ id: "1", role: "assistant", content: "Earlier answer" }]
    const view = (items: ChatMessage[]) =>
      createElement(MessageList, { messages: items, isStreaming: false, emptyState: "Welcome" })
    await render(view(messages))
    const log = host.querySelector<HTMLElement>('[role="log"]')
    if (!log) throw new Error("Conversation log missing")
    Object.defineProperty(log, "scrollHeight", { configurable: true, value: 1200 })
    Object.defineProperty(log, "clientHeight", { configurable: true, value: 300 })
    log.scrollTop = 100
    await act(async () => log.dispatchEvent(new Event("scroll", { bubbles: true })))
    await render(view([...messages, { id: "2", role: "assistant", content: "New answer" }]))
    expect(log.scrollTop).toBe(100)
    await click("newAnswer")
    expect(log.scrollTop).toBe(1200)
    expect(
      [...host.querySelectorAll("button")].some((button) => button.textContent === "newAnswer"),
    ).toBe(false)
  })
})

describe("private community drafts", () => {
  const composer = () =>
    createElement(ThreadComposer, {
      categories: [
        { slug: "research-discussion", nameKey: "community.categories.research-discussion.name" },
      ],
      isAuthed: true,
      signInHref: "/en/account",
      locale: "en",
      initialBody: "Unsaved research question",
    })
  it("requires a deliberate choice before replacing unsaved text and preserves it when cancelled", async () => {
    await render(composer())
    await click("loadDraft")
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("replaceDraftTitle")
    await click("keepEditing")
    expect(host.querySelector("textarea")?.value).toBe("Unsaved research question")
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("loads the owner draft after confirmation and deleting its saved copy retains editor text", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        draft: {
          title: "Saved title",
          body: "Saved body",
          categorySlug: "research-discussion",
          updatedAt: "2026-10-15T12:00:00Z",
        },
      }),
    })
    await render(composer())
    await click("loadDraft")
    await click("replaceEditor")
    expect(host.querySelector("textarea")?.value).toBe("Saved body")
    expect(host.textContent).toContain("lastSaved")
    expect(host.textContent).toContain("draftUpToDate")
    await click("clearDraft")
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    mocks.fetch.mockResolvedValueOnce({ ok: true })
    await click("removeSavedDraft")
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/forum/drafts", { method: "DELETE" })
    expect(host.querySelector("textarea")?.value).toBe("Saved body")
    expect(host.textContent).toContain("draftRemovedEditorKept")
    expect(host.textContent).toContain("unsavedChanges")
  })
})
