// @vitest-environment happy-dom
import { ResearchMarkdown } from "@/components/ui/ResearchMarkdown"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { NextIntlClientProvider } from "next-intl"
import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

beforeEach(() => vi.stubGlobal("React", React))
afterEach(() => vi.unstubAllGlobals())

for (const [locale, copy] of [
  ["en", en],
  ["fi", fi],
] as const) {
  it(`${locale}: names real code/table regions and exposes both to keyboard scrolling`, () => {
    const body = `\`\`\`text\n${"LONG_DISPLAY_ONLY_IDENTIFIER_".repeat(30)}\n\`\`\`\n\n| Field | Value |\n| --- | --- |\n| Display fixture | Example |`
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, {
        locale,
        timeZone: "Europe/Helsinki",
        messages: { research: { markdown: copy.research.markdown } },
        // biome-ignore lint/correctness/noChildrenProp: the typed Intl provider requires children in its complete createElement props.
        children: createElement(ResearchMarkdown, { body }),
      }),
    )
    const container = document.createElement("div")
    container.innerHTML = html
    const pre = container.querySelector("pre")
    expect(pre?.getAttribute("role")).toBe("region")
    expect(pre?.getAttribute("aria-label")).toBe(copy.research.markdown.codeBlock)
    expect(pre?.getAttribute("tabindex")).toBe("0")
    expect(pre?.classList.contains("overflow-x-auto")).toBe(true)
    expect(pre?.classList.contains("focus-visible:outline-2")).toBe(true)
    const tableRegion = container.querySelector("table")?.parentElement
    expect(tableRegion?.getAttribute("role")).toBe("region")
    expect(tableRegion?.getAttribute("aria-label")).toBe(copy.research.markdown.table)
    expect(tableRegion?.getAttribute("tabindex")).toBe("0")
  })
}
