import { expect, test } from "@/tests/fixtures"

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
  test("shows product records with an optional illustration and a catalogue path", async ({
    cleanPage,
  }) => {
    await cleanPage.goto("/en")

    const hero = cleanPage.locator("main section[aria-label]").first()
    await expect(hero.locator("dl")).toContainText("Availability")
    await expect(hero).toContainText("Illustrative product view")
    await expect(cleanPage.locator("main canvas")).toHaveCount(0)
    await expect(cleanPage.getByRole("link", { name: /browse the catalogue/i })).toBeVisible()
    await expect(cleanPage.getByRole("link", { name: /view/i }).first()).toBeVisible()
  })

  test("emits a translated title and full hreflang set", async ({ request }) => {
    // The homepage is large; assert the HTTP response shape and pull out the
    // <head>...</head> chunk only (where Next.js writes <title> and <link>).
    const res = await request.get("/en")
    expect(res.status()).toBe(200)
    const html = await res.text()
    const head = html.slice(0, html.indexOf("</head>") + "</head>".length)

    expect(head).toMatch(/<title>AverianLabs[^<]*<\/title>/i)
    for (const lang of ["en", "fi", "de", "sv", "nl"]) {
      // Next.js renders `hrefLang` (camelCase) — match case-insensitively.
      expect(head).toMatch(new RegExp(`hreflang=["']${lang}["']`, "i"))
      // The href ends in either "/" (home) or the path.
      expect(head).toMatch(new RegExp(`href=["']https://averianlabs\\.eu/${lang}/?["']`, "i"))
    }
  })

  test("translates metadata per locale", async ({ request }) => {
    const checks = [
      { path: "/en", needle: "Laboratory research materials" },
      { path: "/fi", needle: "Materiaalit laboratoriotutkimukseen" },
      { path: "/de", needle: "Laboratory research materials" },
      { path: "/sv", needle: "Laboratory research materials" },
      { path: "/nl", needle: "Laboratory research materials" },
    ]
    for (const { path, needle } of checks) {
      const html = await (await request.get(path)).text()
      expect(html, `expected ${path} to contain '${needle}'`).toContain(needle)
    }
  })
})
