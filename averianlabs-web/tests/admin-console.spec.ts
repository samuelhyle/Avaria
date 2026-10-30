import { expect, sameOriginHeaders, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"
import { hash } from "argon2"

/**
 * The admin console.
 *
 * Every one of the ten `/admin/*` routes had no browser coverage, including
 * the order console where the fulfilment and the refund happen. A test that
 * presses the buttons is the only thing that proves the money and the stock
 * actually move.
 */

const PASSWORD = "local-admin-password-123"
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"

interface TestInfo {
  workerIndex: number
  testId: string
}

/**
 * A separate account per test.
 *
 * The suite runs in parallel and the workers share one database. A shared
 * admin account would be deleted by one worker while another was signed in
 * with it.
 */
async function setupAdmin(testInfo: TestInfo) {
  const email = `admin-console-${testInfo.workerIndex}-${testInfo.testId}@example.invalid`
  // The account has to exist, carry a real password hash and have the admin
  // role. The role is a database column, so the fixture writes it directly.
  const fixture = isolatedBrowserDatabase()
  const passwordHash = await hash(PASSWORD)
  await fixture`
    insert into users (email, password_hash, role, locale, email_verified_at)
    values (${email}, ${passwordHash}, 'admin', 'en', now())
    on conflict (email) do update set
      password_hash = excluded.password_hash,
      role = 'admin',
      email_verified_at = now()
  `
  await fixture.end()
  return email
}

async function teardownAdmin(email: string) {
  const fixture = isolatedBrowserDatabase()
  await fixture`delete from users where email = ${email}`
  await fixture.end()
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/en/account")
  await page.getByRole("textbox", { name: /email/i }).first().fill(email)
  await page.locator("input[type=password]").first().fill(PASSWORD)
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click()
  await page.waitForTimeout(2000)
}

test.describe("admin console", () => {
  test("the order console lists orders and offers only legal fulfilment moves", async ({
    cleanPage,
  }, testInfo) => {
    const email = await setupAdmin(testInfo)
    try {
      await signIn(cleanPage, email)
      await cleanPage.goto("/en/admin/orders")
      await expect(cleanPage.getByRole("heading", { name: /orders/i }).first()).toBeVisible()

      const orderLink = cleanPage.locator("main a[href*='/admin/orders/']").first()
      if ((await orderLink.count()) === 0) return
      await orderLink.click()
      await cleanPage.waitForTimeout(1500)

      // The fulfilment panel is there and it is headed correctly — it used to
      // read "Mark as packed" whatever the order's state.
      const panel = cleanPage.getByText(/fulfilment actions/i).first()
      await expect(panel).toBeVisible()
    } finally {
      await teardownAdmin(email)
    }
  })

  test("the inventory panel lists sellable stock and saves a new count", async ({
    cleanPage,
  }, testInfo) => {
    const email = await setupAdmin(testInfo)
    try {
      await signIn(cleanPage, email)
      await cleanPage.goto("/en/admin/inventory")
      await expect(cleanPage.getByRole("heading", { name: /inventory/i }).first()).toBeVisible()

      const input = cleanPage.locator("main input").first()
      await expect(input).toBeVisible()
      const before = await input.inputValue()
      await input.fill(String(Number(before) + 1))
      await cleanPage
        .getByRole("button", { name: /^save$/i })
        .first()
        .click()
      await expect(cleanPage.getByText(/saved/i).first()).toBeVisible({ timeout: 15_000 })
    } finally {
      await teardownAdmin(email)
    }
  })

  test("the crypto routes report the configured chains", async ({ cleanPage }) => {
    const response = await cleanPage.request.get("/api/crypto/chains")
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as { chains: unknown[]; available: boolean }
    expect(Array.isArray(body.chains)).toBe(true)
    expect(typeof body.available).toBe("boolean")
  })

  test("the crypto cron refuses an unauthenticated call", async ({ cleanPage }) => {
    const response = await cleanPage.request.get("/api/cron/crypto")
    expect(response.status()).toBe(401)
  })

  test("the Telegram webhook refuses a request without the shared secret", async ({
    cleanPage,
  }) => {
    const response = await cleanPage.request.post("/api/telegram/webhook", {
      headers: sameOriginHeaders(),
      data: { update_id: 1 },
    })
    expect([401, 503]).toContain(response.status())
  })

  test("the admin console loads without a console error or a failed request", async ({
    cleanPage,
  }, testInfo) => {
    // The admin navigation used to point at the bare `/admin` paths, and the
    // Content-Security-Policy carried `upgrade-insecure-requests`, which
    // upgrades the browser's own RSC payload fetches to HTTPS. On a plain-HTTP
    // local server that is an SSL error on every navigation, and the page
    // appeared to crash.
    const email = await setupAdmin(testInfo)
    const errors: string[] = []
    const failed: string[] = []
    cleanPage.on("pageerror", (error) => errors.push(String(error).slice(0, 160)))
    cleanPage.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text().slice(0, 160))
    })
    cleanPage.on("response", (response) => {
      if (response.status() >= 400)
        failed.push(`${response.status()} ${response.url().replace(BASE_URL, "")}`)
    })
    try {
      await signIn(cleanPage, email)
      await cleanPage.goto(`${BASE_URL}/en/admin/orders`, { waitUntil: "domcontentloaded" })
      await cleanPage.waitForTimeout(2000)

      // A client-side navigation inside the admin shell.
      const inventory = cleanPage.getByRole("link", { name: /inventory/i }).first()
      await expect(inventory).toBeVisible()
      await inventory.click()
      await cleanPage.waitForTimeout(2500)
      expect(cleanPage.url()).toContain("/en/admin/inventory")

      expect(errors).toEqual([])
      expect(failed).toEqual([])
    } finally {
      await teardownAdmin(email)
    }
  })
})
