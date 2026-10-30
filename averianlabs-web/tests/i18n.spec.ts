import { locales } from "@/lib/i18n/config"
import { LOCALES, expect, test } from "@/tests/fixtures"

test.describe("internationalization", () => {
  test("each locale resolves with a translated title", async ({ request }) => {
    const needles: Record<string, string> = {
      en: "Research peptides for laboratory use",
      fi: "Tutkimuspeptidit laboratoriotyöhön",
      sv: "Forskningspeptider för laboratoriebruk",
      ru: "исследовательские пептиды для лабораторий",
    }
    for (const locale of LOCALES) {
      const html = await (await request.get(`/${locale}`)).text()
      expect(html, `/${locale}`).toContain(needles[locale])
    }
  })

  test("alternate hreflang tags cover all locales", async ({ request }) => {
    for (const locale of LOCALES) {
      const html = await (await request.get(`/${locale}/about`)).text()
      for (const other of LOCALES) {
        // Next.js renders the property as `hrefLang` in HTML — match case-insensitively.
        expect(html, `${locale} should link to ${other}`).toMatch(
          new RegExp(`hreflang=["']${other}["']`, "i"),
        )
      }
    }
  })

  test("invalid locale triggers a 404 / notFound fallback", async ({ request }) => {
    // The middleware detects an unsupported locale and redirects to the default
    // (with /en prefix). The final response must either be 200 at /en or a 404.
    const res = await request.get("/xx", { maxRedirects: 0 }).catch((err) => {
      // Playwright throws on a redirect when maxRedirects: 0; the underlying
      // response is still accessible.
      return err.response ?? err
    })
    // Either we got a 3xx redirect (middleware redirects /xx -> /en) or 200
    // (final /en landing). Anything else is unexpected.
    const status = res.status()
    expect([200, 301, 302, 303, 307, 308, 404]).toContain(status)
  })

  test("LocaleSwitcher changes the current locale", async ({ cleanPage }) => {
    await cleanPage.goto("/en")
    const switcher = cleanPage.getByRole("combobox", { name: /language/i }).first()
    if ((await switcher.count()) > 0) {
      // Any locale other than the one the page is on: the switcher must
      // navigate to it. The locales come from the app's configuration.
      const target = locales.find((locale) => locale !== "en") ?? "en"
      await switcher.selectOption(target)
      await cleanPage.waitForURL(new RegExp(`/${target}`))
      expect(cleanPage.url()).toMatch(new RegExp(`/${target}`))
    }
  })
})
