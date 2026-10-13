import { expect, test } from "@/tests/fixtures"

test.describe("homepage", () => {
  test("renders the 3D product hero with focusable product chips", async ({ cleanPage }) => {
    await cleanPage.goto("/en")

    // The hero exposes a chip group with one chip per featured product.
    // The group is rendered with role=group + an aria-label that we set
    // in the i18n catalogue.
    const chipGroup = cleanPage
      .getByRole("group", { name: /featured products|valitut tuotteet/i })
      .first()
    await expect(chipGroup).toBeVisible()

    // The hero card links to the focused product's detail page.
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
