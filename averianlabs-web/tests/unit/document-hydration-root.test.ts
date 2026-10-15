// @vitest-environment happy-dom
import { DocumentHydrationGate } from "@/components/layout/DocumentHydrationGate"
import React, { act, createElement } from "react"
import { type Root, hydrateRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, expect, it, vi } from "vitest"

let root: Root | undefined
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it("preserves the whole server document and gates event handling until parsing finishes", async () => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  const browserDocument = document
  let readiness: DocumentReadyState = "loading"
  const handledReadiness: DocumentReadyState[] = []
  const onClick = vi.fn(() => handledReadiness.push(readiness))
  const html = createElement(
    "html",
    { lang: "en" },
    createElement("head", null, createElement("title", null, "Research records")),
    createElement(
      "body",
      null,
      createElement(
        "main",
        null,
        createElement("button", { type: "button", onClick }, "Open records"),
      ),
    ),
  )
  const tree = createElement(DocumentHydrationGate, {
    // biome-ignore lint/correctness/noChildrenProp: the typed gate requires children in its complete createElement props.
    children: html,
  })

  vi.stubGlobal("document", undefined)
  const markup = renderToStaticMarkup(tree)
  expect(markup).toBe(renderToStaticMarkup(html))
  vi.stubGlobal("document", browserDocument)
  browserDocument.open()
  browserDocument.write(`<!DOCTYPE html>${markup}`)
  browserDocument.close()
  vi.spyOn(browserDocument, "readyState", "get").mockImplementation(() => readiness)

  const serverHtml = browserDocument.documentElement
  const serverBody = browserDocument.body
  const serverButton = browserDocument.querySelector("button")
  const errors: unknown[] = []
  await act(async () => {
    root = hydrateRoot(browserDocument, tree, {
      onRecoverableError: (error) => errors.push(error),
    })
  })
  expect(browserDocument.documentElement).toBe(serverHtml)
  expect(browserDocument.body).toBe(serverBody)
  expect(browserDocument.querySelector("button")).toBe(serverButton)
  await act(async () => serverButton?.click())
  expect(onClick).not.toHaveBeenCalled()
  expect(errors).toEqual([])

  readiness = "interactive"
  await act(async () => browserDocument.dispatchEvent(new Event("DOMContentLoaded")))
  expect(browserDocument.documentElement).toBe(serverHtml)
  expect(browserDocument.body).toBe(serverBody)
  expect(browserDocument.querySelector("button")).toBe(serverButton)
  const callsBeforeParsedClick = onClick.mock.calls.length
  await act(async () => serverButton?.click())
  expect(onClick).toHaveBeenCalledTimes(callsBeforeParsedClick + 1)
  expect(handledReadiness.every((state) => state === "interactive")).toBe(true)
  expect(errors).toEqual([])
})
