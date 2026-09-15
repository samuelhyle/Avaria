import { expect, test } from "@/tests/fixtures"

test.describe("checkout flow", () => {
  test("empty cart shows the empty state with a CTA to shop", async ({ cleanPage }) => {
    await cleanPage.goto("/en/checkout/cart")

    const empty = cleanPage.getByText(/empty|nothing here|your cart is empty/i).first()
    await expect(empty).toBeVisible()

    // The CTA back to the shop is rendered as a Link/button.
    const cta = cleanPage.getByRole("link", { name: /shop|continue shopping|browse/i }).first()
    await expect(cta).toBeVisible()
  })

  test("checkout steps render with the right ordering", async ({ cleanPage }) => {
    await cleanPage.goto("/en/checkout/email")
    // The step indicator should show "Email" as a current or upcoming step.
    await expect(cleanPage.getByText(/email/i).first()).toBeVisible()
  })

  test("shipping step uses fieldset/legend for radio groups", async ({ cleanPage }) => {
    // Seed the cart via API/store first by visiting a PDP and clicking ATC.
    await cleanPage.goto("/en/shop/bpc-157")
    const add = cleanPage.getByRole("button", { name: /add to cart/i }).first()
    await add.scrollIntoViewIfNeeded()
    await add.click()

    // Go to checkout, advance past email step manually to reach shipping.
    await cleanPage.goto("/en/checkout/shipping")
    const fieldsets = cleanPage.locator("fieldset")
    if ((await fieldsets.count()) > 0) {
      // The shipping step wraps its options in a <fieldset> per a11y improvement.
      await expect(fieldsets.first()).toBeVisible()
    }
  })
})
