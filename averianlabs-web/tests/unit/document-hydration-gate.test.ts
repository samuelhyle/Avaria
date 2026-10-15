// @vitest-environment happy-dom
import { DocumentHydrationGate } from "@/components/layout/DocumentHydrationGate"
import React, { act, createElement } from "react"
import { type Root, createRoot, hydrateRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

let host: HTMLDivElement
let root: Root | undefined
beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  host = document.createElement("div")
  document.body.append(host)
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it("renders all existing content during SSR without a wrapper or a fallback", () => {
  vi.stubGlobal("document", undefined)
  const content = createElement("main", null, createElement("h1", null, "Research materials"))
  expect(
    renderToStaticMarkup(
      createElement(DocumentHydrationGate, {
        // biome-ignore lint/correctness/noChildrenProp: the typed gate requires children in its complete createElement props.
        children: content,
      }),
    ),
  ).toBe(renderToStaticMarkup(content))
})

it("preserves the server node while parsing, then hydrates it after DOMContentLoaded", async () => {
  let readiness: DocumentReadyState = "loading"
  vi.spyOn(document, "readyState", "get").mockImplementation(() => readiness)
  host.innerHTML = '<button type="button">Open records</button>'
  const serverButton = host.querySelector("button")
  const onClick = vi.fn()
  const errors: unknown[] = []
  await act(async () => {
    root = hydrateRoot(
      host,
      createElement(DocumentHydrationGate, {
        // biome-ignore lint/correctness/noChildrenProp: the typed gate requires children in its complete createElement props.
        children: createElement("button", { type: "button", onClick }, "Open records"),
      }),
      { onRecoverableError: (error) => errors.push(error) },
    )
  })
  expect(host.querySelector("button")).toBe(serverButton)
  expect(onClick).not.toHaveBeenCalled()
  readiness = "interactive"
  await act(async () => document.dispatchEvent(new Event("DOMContentLoaded")))
  expect(host.querySelector("button")).toBe(serverButton)
  await act(async () => serverButton?.click())
  expect(onClick).toHaveBeenCalledOnce()
  expect(errors).toEqual([])
})

it("attaches ordinary client interaction immediately when the document is already parsed", async () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete")
  const onClick = vi.fn()
  root = createRoot(host)
  await act(async () => {
    root?.render(
      createElement(DocumentHydrationGate, {
        // biome-ignore lint/correctness/noChildrenProp: the typed gate requires children in its complete createElement props.
        children: createElement("button", { type: "button", onClick }, "Open records"),
      }),
    )
  })
  await act(async () => host.querySelector("button")?.click())
  expect(onClick).toHaveBeenCalledOnce()
})
