import { expect, test } from "@/tests/fixtures"
import { cleanBrowserRecords, isolatedBrowserDatabase } from "@/tests/helpers/test-database"

for (const locale of ["en", "fi"]) {
  test(`${locale}: 10 mL stays a volume through product and cart`, async ({ cleanPage: page }) => {
    await page.goto(`/${locale}/shop/qa-water`)
    await expect(page.locator("main")).toContainText("10 mL")
    await expect(page.locator("main fieldset")).not.toContainText("10 mg")
    await page
      .locator("main")
      .getByRole("button", { name: locale === "fi" ? /lisää ostoskoriin/i : /add to cart/i })
      .first()
      .click()
    const drawer = page.getByRole("dialog").filter({ hasText: "QA-WATER-10" })
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText("10 mL")
    await expect(drawer).not.toContainText("10 mg")
    await page.keyboard.press("Escape")
    await page.goto(`/${locale}/checkout/cart`)
    await expect(page.locator("main")).toContainText("10 mL")
    await expect(page.locator("main")).toContainText(locale === "fi" ? "25,5 %" : "25.5%")
  })
  test(`${locale}: quotation success follows the persisted server response`, async ({
    cleanPage: page,
  }) => {
    const guard = isolatedBrowserDatabase()
    await guard.end()
    const email = `browser-qa-quote-${crypto.randomUUID()}@example.invalid`
    try {
      // AOD-9604 is the quotation-only material: it has no price and cannot
      // be put in a cart. A product that can be ordered would not exercise
      // the rule.
      await page.goto(`/${locale}/shop/aod-9604`)
      // Nothing is published as a zero price.
      await expect(page.locator("script#ld-product")).not.toContainText('"price":0')
      await expect(
        page.locator("main").getByRole("button", { name: /add to cart|lisää ostoskoriin/i }),
      ).toHaveCount(0)
      // The quote form is rendered inline on the product page; there is no
      // disclosure to open first.
      await page.locator('main input[name="name"]').fill("Browser QA")
      await page.locator('main input[name="email"]').fill(email)
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/quotes") && response.request().method() === "POST",
      )
      // The button is targeted by its stable test id, not by its label:
      // the label is translated, and a copy change in any locale would
      // otherwise break this test.
      await page.locator('main form [data-testid="quote-submit"]').click()
      expect((await response).status()).toBe(201)
      await expect(page.locator("main").getByRole("status").last()).toBeVisible()
      await expect(page.locator('main input[name="email"]')).toHaveCount(0)
    } finally {
      await cleanBrowserRecords(email)
    }
  })
  for (const width of [320, 390, 414, 1024, 1280]) {
    test(`${locale}: primary customer pages fit ${width}px`, async ({ cleanPage: page }) => {
      await page.setViewportSize({ width, height: 850 })
      for (const route of ["", "/shop", "/shop/qa-water", "/checkout/cart", "/contact"]) {
        await page.goto(`/${locale}${route}`)
        await expect(page.locator("main h1").first()).toBeVisible()
        const size = await page.evaluate(() => ({
          content: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }))
        expect(size.content, `${locale}${route} at ${width}px`).toBeLessThanOrEqual(
          size.viewport + 1,
        )
      }
      if (width < 1280) {
        await page
          .getByRole("button", { name: locale === "fi" ? /avaa valikko/i : /open menu/i })
          .click()
        const menu = page.getByRole("dialog")
        await expect(menu).toBeVisible()
        await page.keyboard.press("Tab")
        expect(await menu.evaluate((node) => node.contains(document.activeElement))).toBe(true)
        await page.keyboard.press("Escape")
        await expect(menu).toHaveCount(0)
      }
    })
  }
}
test("language switch keeps filters and hash", async ({ cleanPage: page }) => {
  await page.goto("/en/shop?category=supplies&sort=name#catalogue")
  await page.getByRole("combobox", { name: /language/i }).selectOption("fi")
  await page.waitForURL(/\/fi\/shop/)
  expect(new URL(page.url()).searchParams.get("category")).toBe("supplies")
  expect(new URL(page.url()).hash).toBe("#catalogue")
})
test("homepage is useful without WebGL or requestIdleCallback", async ({ cleanPage: page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "requestIdleCallback")
  })
  await page.goto("/en")
  await expect(page.locator("main h1")).toBeVisible()
  await expect(page.locator("main canvas")).toHaveCount(0)
})
test("cookie settings can reopen and withdraw analytics consent", async ({ cleanPage: page }) => {
  await page.goto("/en")
  const settings = page.getByRole("button", { name: /cookie settings/i })
  await settings.click()
  await page
    .getByRole("dialog", { name: /cookie/i })
    .getByRole("button", { name: /accept/i })
    .filter({ visible: true })
    .click()
  expect(await page.evaluate(() => localStorage.getItem("averianlabs-cookie-consent"))).toBe("all")
  await settings.click()
  await page
    .getByRole("dialog", { name: /cookie/i })
    .getByRole("button", { name: /essential|reject/i })
    .filter({ visible: true })
    .click()
  expect(await page.evaluate(() => localStorage.getItem("averianlabs-cookie-consent"))).toBe(
    "essential",
  )
})
test("invalid concentration inputs do not expose infinite results", async ({ cleanPage: page }) => {
  await page.goto("/fi/peptide-calculator")
  await page.getByRole("textbox", { name: "Liuoksen lopullinen tilavuus", exact: true }).fill("0")
  const result = page.locator('main section[aria-live="off"]')
  await expect(result.getByRole("status")).toBeVisible()
  await expect(result.getByRole("status")).toContainText("Anna positiivinen luku")
  await expect(result.locator("dl")).toHaveCount(0)
  await expect(page.locator("main")).not.toContainText(/Infinity|NaN|IU/)
})

for (const locale of ["en", "fi"]) {
  test(`${locale}: server-rendered research content remains visible without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 850 },
    })
    try {
      await context.addCookies([
        {
          name: "averianlabs-age-confirmed",
          value: "1",
          url: process.env.BASE_URL ?? "http://localhost:3000",
        },
      ])
      const page = await context.newPage()
      await page.goto(`${process.env.BASE_URL ?? "http://localhost:3000"}/${locale}`)
      await expect(page.locator("main h1")).toBeVisible()
      const category = page.locator(`main a[href="/${locale}/shop"]`).first()
      await category.scrollIntoViewIfNeeded()
      await expect(category).toBeVisible()
      expect(
        await category.evaluate((node) => {
          let element: Element | null = node
          while (element) {
            if (getComputedStyle(element).opacity === "0") return false
            element = element.parentElement
          }
          return true
        }),
      ).toBe(true)
      for (const path of ["/legal/terms", "/legal/privacy", "/contact"]) {
        if (path !== "/legal/terms")
          await page.goto(`${process.env.BASE_URL ?? "http://localhost:3000"}/${locale}`)
        const footer = page.getByRole("contentinfo")
        await footer.scrollIntoViewIfNeeded()
        await expect(footer).toBeVisible()
        // Native details must expose these links even with no client runtime.
        for (const disclosure of await footer.locator("details").all())
          await disclosure.locator("summary").click()
        const link = footer.locator(`a[href="/${locale}${path}"]:visible`)
        await expect(link).toHaveCount(1)
        await link.scrollIntoViewIfNeeded()
        await expect(link).toBeVisible()
        expect(
          await link.evaluate((node) => {
            let element: Element | null = node
            while (element) {
              if (getComputedStyle(element).opacity === "0") return false
              element = element.parentElement
            }
            return true
          }),
        ).toBe(true)
        await link.click()
        await expect(page).toHaveURL(
          `${process.env.BASE_URL ?? "http://localhost:3000"}/${locale}${path}`,
        )
        await expect(page.locator("main h1").first()).toBeVisible()
      }
    } finally {
      await context.close()
    }
  })
}

test("catalogue quantities preserve SI unit case and spacing", async ({ cleanPage: page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/fi/shop?q=QA-WATER-10")
  // The catalogue renders the same product in more than one card variant, so
  // the card is found through its own SKU rather than through the text of
  // every product on the page.
  const cardFor = (slug: string) =>
    page
      .locator("main article")
      .filter({ has: page.locator(`a[href$="/shop/${slug}"]`) })
      .first()
  const water = cardFor("qa-water")
  // The size appears both as text and inside the product illustration, and
  // the card markup changes between designs. What matters is what the
  // customer reads: the correct SI unit, in the correct case.
  await expect(water).toContainText("10 mL")
  await expect(water).not.toContainText("10 mg")
  await expect(water).not.toContainText("10 ML")
  await page.goto("/fi/shop?q=QA-PEPTIDE-5")
  const peptide = cardFor("qa-peptide")
  await expect(peptide).toContainText("5 mg / 10 mg")
  await expect(peptide).not.toContainText("5 MG")
})
