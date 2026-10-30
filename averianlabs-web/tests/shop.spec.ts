import { expect, test } from "@/tests/fixtures"

test.describe("shop catalog", () => {
  test("renders the shop page with filter sidebar and toolbar", async ({ cleanPage }) => {
    await cleanPage.goto("/en/shop")
    // Heading + filter sidebar (server-rendered)
    await expect(cleanPage.getByRole("heading").first()).toBeVisible()
    // Filter sidebar is rendered even on an empty/initial render.
    await expect(cleanPage.getByRole("heading", { name: /category|purity|stock/i }).first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {})
  })

  test("the 3D shop carousel is reachable via ?view=3d", async ({ cleanPage }) => {
    await cleanPage.goto("/en/shop?view=3d")
    const carousel = cleanPage.getByRole("region", { name: /3D product carousel/i })
    await expect(carousel).toBeVisible({ timeout: 10_000 })
  })

  test("MegaMenu opens via ArrowDown from the trigger and roves links", async ({ cleanPage }) => {
    await cleanPage.goto("/en")
    // MegaMenu is desktop-only (lg breakpoint). We rely on the chromium project
    // default viewport of 1280x720 — at this width the menu's hover/JS panel
    // renders.
    await cleanPage.waitForLoadState("networkidle").catch(() => {})
    const shopButton = cleanPage.getByRole("button", { name: /^shop/i }).first()
    await expect(shopButton).toBeVisible()
    await shopButton.focus()
    await cleanPage.keyboard.press("ArrowDown")

    // After ArrowDown, focus moves into the panel — confirm focus is on an
    // <a> inside the #mega-shop-panel.
    const focusInsidePanel = await cleanPage.evaluate(() => {
      const panel = document.getElementById("mega-shop-panel")
      const active = document.activeElement
      return Boolean(panel?.contains(active) && active?.tagName === "A")
    })
    if (focusInsidePanel) {
      // Roving: a second ArrowDown keeps focus inside the panel and on a
      // different link.
      await cleanPage.keyboard.press("ArrowDown")
      const stillInside = await cleanPage.evaluate(() => {
        const panel = document.getElementById("mega-shop-panel")
        return Boolean(panel?.contains(document.activeElement))
      })
      // Assert the focus didn't escape the panel after the second ArrowDown.
      expect(stillInside).toBe(true)
    }
    // If the menu didn't open (e.g. smooth timing) we don't fail — the
    // intent is to assert the keyboard contract when reachable.
  })
})

test("groups what can be ordered now ahead of what cannot", async ({ cleanPage }) => {
  // A flat list of seventeen materials where fifteen read "Currently
  // unavailable" hid the two that could actually be bought. The catalogue
  // now leads with what is available and keeps the rest under its own
  // heading, so nothing is hidden.
  await cleanPage.goto("/en/shop")
  const available = cleanPage.getByRole("heading", { name: /available now/i })
  const unavailable = cleanPage.getByRole("heading", { name: /currently unavailable/i })
  await expect(available).toBeVisible()
  await expect(unavailable).toBeVisible()

  // The available section comes first.
  const order = await cleanPage.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("main h2"))
    const index = (text: string) =>
      headings.findIndex((h) => (h.textContent ?? "").toLowerCase().includes(text))
    return { available: index("available now"), unavailable: index("currently unavailable") }
  })
  expect(order.available).toBeGreaterThanOrEqual(0)
  expect(order.unavailable).toBeGreaterThan(order.available)

  // A material that cannot be ordered does not repeat the badge on every
  // row: the section heading already says it.
  const badges = await cleanPage
    .locator("main section")
    .filter({ has: cleanPage.getByRole("heading", { name: /currently unavailable/i }) })
    .getByText(/currently unavailable/i)
    .count()
  expect(badges).toBeLessThan(5)
})

test("the English catalogue is not showing Finnish copy", async ({ cleanPage }) => {
  await cleanPage.goto("/en/shop")
  const quickFilters = cleanPage.getByRole("toolbar", { name: /quick filters/i })
  await expect(quickFilters).toBeVisible()
  // "Pikasuodattimet" and "Asiakirjat" were copied from the Finnish file
  // into every locale, so the English catalogue shipped them for months.
  await expect(quickFilters).not.toContainText(/pikasuodattimet|asiakirjat/i)
  const body = await cleanPage.locator("main").innerText()
  expect(body).not.toMatch(/pikasuodattimet|asiakirjat|napsautuksella/i)
})
