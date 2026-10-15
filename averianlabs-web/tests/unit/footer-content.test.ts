// @vitest-environment happy-dom
import { Footer } from "@/components/layout/Footer"
import { getFooterContent } from "@/lib/layout/footer-content"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { NextIntlClientProvider, createTranslator } from "next-intl"
import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "fi"; namespace: string }) =>
    createTranslator({ locale, namespace, messages: locale === "fi" ? fi : en }),
}))

beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-15T12:00:00Z"))
  vi.stubEnv("STRIPE_SECRET_KEY", "")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_BUSINESS_ID", "")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_VAT_ID", "")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_ADDRESS_LINE1", "")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_ADDRESS_LINE2", "")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_EMAIL", "qa-footer@example.invalid")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

for (const [locale, copy] of [
  ["en", en],
  ["fi", fi],
] as const) {
  it(`${locale}: resolved source copy renders complete synchronous footer HTML`, async () => {
    const content = await getFooterContent(locale)
    expect(JSON.parse(JSON.stringify(content))).toEqual(content)
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, {
        locale,
        timeZone: "Europe/Helsinki",
        messages: { research: copy.research },
        // biome-ignore lint/correctness/noChildrenProp: the Intl provider's complete typed createElement props require children.
        children: createElement(Footer, { content }),
      }),
    )
    const container = document.createElement("div")
    container.innerHTML = html
    const footer = container.querySelector("footer")
    expect(footer).not.toBeNull()
    expect(footer?.closest("[hidden]")).toBeNull()
    expect(footer?.querySelector(".mt-3.max-w-md")?.textContent).toBe(copy.footer.tagline)
    expect(footer?.textContent).toContain(copy.footer.researchUse)
    expect(footer?.textContent).toContain(copy.footer.rightsReserved.replace("{year}", "2026"))
    expect(footer?.textContent).toContain(copy.research.legalPending)
    expect(footer?.querySelector('a[href="mailto:qa-footer@example.invalid"]')).not.toBeNull()
    expect(footer?.querySelectorAll("details")).toHaveLength(4)
    for (const [path, label] of [
      ["/documents", copy.experience.documents],
      ["/legal/terms", copy.footer.terms],
      ["/legal/privacy", copy.footer.privacy],
      ["/contact", copy.footer.contact],
    ]) {
      const links = footer?.querySelectorAll(`a[href="/${locale}${path}"]`)
      expect(links).toHaveLength(2)
      expect(links?.[0]?.textContent).toBe(label)
      expect(links?.[1]?.closest("details")).not.toBeNull()
    }
  })
}

it("only serializes the existing payment display condition and configured public identity values", async () => {
  const secret = "sk_test_footer_server_only_fixture"
  vi.stubEnv("STRIPE_SECRET_KEY", secret)
  vi.stubEnv("NEXT_PUBLIC_LEGAL_BUSINESS_ID", "QA-ID")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_VAT_ID", "QA-VAT")
  vi.stubEnv("NEXT_PUBLIC_LEGAL_ADDRESS_LINE1", "QA address")
  const content = await getFooterContent("en")
  expect(content.paymentsLabel).toBe(`${en.footer.paymentsTitle} · ${en.research.card}`)
  expect(content.businessIdentity).toBe(`${en.research.businessId} QA-ID · VAT QA-VAT`)
  expect(content.address).toBe("QA address")
  expect(JSON.stringify(content)).not.toContain(secret)
})
