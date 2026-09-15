import { expect, isDegraded, test } from "@/tests/fixtures"

test.describe("cart drawer + add-to-cart", () => {
  test.beforeEach(async ({ page }) => {
    // The PDP triggers /api/auth/session + /api/plans on mount. In CI without
    // a DB these endpoints hang; intercept them so the page renders cleanly.
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: null }))
    await page.route("**/api/plans", (route) => route.fulfill({ json: { plans: [] } }))
  })

  test("a product detail page renders the qty stepper with descriptive aria-labels", async ({
    cleanPage,
  }) => {
    await cleanPage.goto("/en/shop/bpc-157")
    await cleanPage.waitForLoadState("networkidle").catch(() => {})

    // Both ProductDetailActions (inline) and the sticky ATC expose qty
    // steppers with descriptive aria-labels.
    const decrements = cleanPage.getByRole("button", { name: /decrease quantity/i })
    const increments = cleanPage.getByRole("button", { name: /increase quantity/i })
    await expect(decrements.first()).toBeVisible()
    await expect(increments.first()).toBeVisible()

    // Click the inline main-region increment (scroll into view so it's not
    // obscured by the sticky overlays).
    const inlineInc = cleanPage
      .locator("main")
      .getByRole("button", { name: /increase quantity/i })
      .first()
    await inlineInc.scrollIntoViewIfNeeded()
    await inlineInc.click()
    await inlineInc.click()

    // The inline qty <span className="w-12 ..."> shows the running count.
    const qtySpan = cleanPage.locator("main span.w-12").first()
    await expect(qtySpan).toHaveText(/^3$/)

    const inlineDec = cleanPage
      .locator("main")
      .getByRole("button", { name: /decrease quantity/i })
      .first()
    await inlineDec.click()
    await expect(qtySpan).toHaveText(/^2$/)
  })

  test("add-to-cart opens the cart drawer and shows the subtotal", async ({ cleanPage }) => {
    await cleanPage.goto("/en/shop/bpc-157")
    // Click an add-to-cart button within main, not the sticky bar's footer variant.
    const add = cleanPage
      .locator("main")
      .getByRole("button", { name: /add to cart/i })
      .first()
    await add.scrollIntoViewIfNeeded()
    await add.click()

    // The CartDrawer opens as an <aside role="dialog">.
    const drawer = cleanPage
      .getByRole("dialog")
      .filter({ hasText: /subtotal/i })
      .first()
    await expect(drawer).toBeVisible()
  })

  test("wishlist button announces its action in plain English", async ({ cleanPage }) => {
    await cleanPage.goto("/en/shop/bpc-157")
    await cleanPage.waitForLoadState("networkidle").catch(() => {})

    // There are likely 2 wishlist buttons on the page (inline + sticky),
    // so we pick the first one and scroll it into view to avoid click
    // being absorbed by the sticky bar.
    const wishlist = cleanPage.getByRole("button", { name: /add to wishlist/i }).first()
    await wishlist.scrollIntoViewIfNeeded()
    await expect(wishlist).toBeVisible()
    await wishlist.click()
    // After toggling, the same button announces as "Remove from wishlist".
    await expect(
      cleanPage.getByRole("button", { name: /remove from wishlist/i }).first(),
    ).toBeVisible({ timeout: 5_000 })
  })
})
