import { expect, test } from "@/tests/fixtures"

test.describe("homepage", () => {
  test("renders the 3D product carousel heading and a select-the-next button", async ({
    cleanPage,
  }) => {
    await cleanPage.goto("/en")

    // The homepage renders the 3D carousel with a translated label accessible
    // via its region role.
    const carousel = (page) => page.getByRole("region", { name: /3D product carousel/i })
    await expect(carousel(cleanPage)).toBeVisible()

    // Carousel exposes prev/next controls (icon-only buttons, identified by aria-label).
    await expect(
      cleanPage.getByRole("button", { name: /previous product/i }).first(),
    ).toHaveAttribute("aria-label", /previous product/i)
    await expect(cleanPage.getByRole("button", { name: /next product/i }).first()).toHaveAttribute(
      "aria-label",
      /next product/i,
    )
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
      { path: "/en", needle: "Precision peptides" },
      { path: "/fi", needle: "Tutkimuskäyttöön" },
      { path: "/de", needle: "Präzisionspeptide" },
      { path: "/sv", needle: "Forskningspeptider" },
      { path: "/nl", needle: "Precisiepeptiden" },
    ]
    for (const { path, needle } of checks) {
      const html = await (await request.get(path)).text()
      expect(html, `expected ${path} to contain '${needle}'`).toContain(needle)
    }
  })
})
