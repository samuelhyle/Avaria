import { expect, sameOriginHeaders, test } from "@/tests/fixtures"

test.describe("authentication pages", () => {
  test("register page loads and shows the registration form", async ({ cleanPage }) => {
    await cleanPage.goto("/en/register")
    // The page contains both the registration form (in <main>) and a
    // newsletter form (in <footer>). We scope to <main> to disambiguate.
    const mainForm = cleanPage.locator("main form")
    await expect(mainForm).toBeVisible()
    await expect(cleanPage.getByRole("textbox", { name: /email/i }).first()).toBeVisible()
  })

  test("forgot password form is accessible", async ({ cleanPage }) => {
    await cleanPage.goto("/en/forgot-password")
    const mainForm = cleanPage.locator("main form")
    await expect(mainForm).toBeVisible()
  })

  test("auth-required pages return a usable response (not 5xx)", async ({ cleanPage }) => {
    const res = await cleanPage.goto("/en/account")
    expect(res?.status()).toBe(200)
    await expect(cleanPage.locator('main input[name="email"]')).toBeVisible()
  })

  test("auth API uses an anti-enumeration contract (200 with ok envelope)", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      headers: sameOriginHeaders(),
      data: { email: "unregistered-browser-qa@example.invalid" },
      timeout: 5_000,
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })
})
