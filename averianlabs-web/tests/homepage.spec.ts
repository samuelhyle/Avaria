import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"

function headOf(html: string) {
  return html.slice(0, html.indexOf("</head>") + "</head>".length)
}
function attributesOf(tag: string) {
  const attributes: Record<string, string> = {}
  for (const match of tag.matchAll(/([\w:-]+)=(["'])(.*?)\2/g)) {
    const name = match[1]
    const value = match[3]
    if (name && value !== undefined) attributes[name.toLowerCase()] = value
  }
  return attributes
}

test.describe("homepage", () => {
  test("metadata stays in the head through repeated full-page hydration", async ({
    cleanPage: page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    for (let i = 0; i < 12; i++) {
      await page.goto(i % 2 ? "/fi" : "/en")
      await expect(page.locator("main h1")).toBeVisible()
      await expect(page.locator("head title")).toHaveCount(1)
      await expect(page.locator('body meta[name="description"]')).toHaveCount(0)
      await page.waitForTimeout(150)
      expect(errors).toEqual([])
    }
  })
  test("puts material search, records and research tasks before decorative media", async ({
    cleanPage: page,
  }) => {
    await page.goto("/en")
    await expect(
      page.getByRole("searchbox", { name: /search by product name or sku/i }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /browse materials/i })).toBeVisible()
    await expect(page.locator("main canvas")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /original records/i })).toBeVisible()
    await page.getByRole("searchbox", { name: /search by product name or sku/i }).fill("BPC157-5")
    await page.locator("main form").getByRole("button", { name: "Search", exact: true }).click()
    await expect(page).toHaveURL(/\/en\/shop\?q=BPC157-5$/)
    await expect(page.locator("article")).toContainText("BPC157-5")
  })

  test("emits a translated title and full hreflang set", async ({ request }) => {
    // The homepage is large; assert the HTTP response shape and pull out the
    // <head>...</head> chunk only (where Next.js writes <title> and <link>).
    const res = await request.get("/en")
    expect(res.status()).toBe(200)
    const html = await res.text()
    const head = headOf(html)

    expect(head).toMatch(/<title>AverianLabs[^<]*<\/title>/i)
    const alternates = [...head.matchAll(/<link\b[^>]*>/gi)]
      .map(([tag]) => attributesOf(tag))
      .filter((attributes) => attributes.rel === "alternate" && attributes.hreflang)
    expect(alternates.map((link) => link.hreflang).sort()).toEqual(["de", "en", "fi", "nl", "sv"])
    const origin = new URL(
      process.env.BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://averianlabs.eu",
    ).origin
    for (const link of alternates) {
      if (!link.href) throw new Error(`Missing hreflang URL for ${link.hreflang}`)
      const url = new URL(link.href)
      expect(url.origin).toBe(origin)
      // /fi and /fi/ are equivalent home URLs; the language and absence of filters are material.
      expect(url.pathname.replace(/\/$/, "")).toBe(`/${link.hreflang}`)
      expect(url.search).toBe("")
      expect(url.hash).toBe("")
    }
  })

  test("translates metadata per locale", async ({ request }) => {
    for (const locale of ["en", "fi", "de", "sv", "nl"]) {
      const copy = JSON.parse(
        readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
      ).meta.home
      const response = await request.get(`/${locale}`)
      expect(response.status()).toBe(200)
      const head = headOf(await response.text())
      const title = head.match(/<title>([^<]*)<\/title>/i)?.[1]
      const description = [...head.matchAll(/<meta\b[^>]*>/gi)]
        .map(([tag]) => attributesOf(tag))
        .find((attributes) => attributes.name === "description")?.content
      expect(title, `localized title for ${locale}`).toContain(copy.title)
      expect(description, `localized description for ${locale}`).toBe(copy.description)
    }
  })
})
