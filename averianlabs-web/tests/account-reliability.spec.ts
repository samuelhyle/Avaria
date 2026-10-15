import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { cleanBrowserRecords, isolatedBrowserDatabase } from "@/tests/helpers/test-database"

for (const locale of ["en", "fi"]) {
  const messages = JSON.parse(
    readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
  )
  test(`${locale}: account creation and plan sharing remain truthful on failure and revoke access immediately`, async ({
    cleanPage: page,
    request,
  }) => {
    const guard = isolatedBrowserDatabase()
    await guard.end()
    const email = `browser-qa-account-${locale}-${crypto.randomUUID()}@example.invalid`
    try {
      const registered = await request.post("/api/auth/register", {
        data: { email, password: "QA-only-local-password-92842", name: "Browser QA", locale },
      })
      expect(registered.status()).toBe(200)
      expect(await registered.json()).toMatchObject({ ok: true })
      await page.goto(`/${locale}/account`)
      await page.locator('main input[name="email"]').fill(email)
      await page.locator('main input[name="password"]').fill("QA-only-local-password-92842")
      await page.locator('main form button[type="submit"]').click()
      await expect(page.locator('main input[name="password"]')).toHaveCount(0)
      await page.goto(`/${locale}/account/plans`)
      await page
        .locator("main")
        .getByRole("button", { name: locale === "fi" ? /luo.*suunnitelma/i : /create new plan/i })
        .click()
      const dialog = page.getByRole("dialog")
      const name = dialog.getByRole("textbox").first()
      await name.fill("QA")
      const create = dialog.getByRole("button", {
        name: locale === "fi" ? /luo.*suunnitelma/i : /create new plan/i,
      })
      await expect(create).toBeDisabled()
      await name.fill("Browser QA laboratory plan")
      await page.route("**/api/plans", (route) =>
        route.fulfill({ status: 503, json: { ok: false } }),
      )
      await create.click()
      await expect(dialog.getByRole("alert")).toBeVisible()
      await expect(dialog).toBeVisible()
      await page.unroute("**/api/plans")
      await create.click()
      await page.waitForURL(new RegExp(`/${locale}/account/plans/[^/]+$`))
      const ownerUrl = new URL(page.url())
      const planId = ownerUrl.pathname.split("/").pop()
      ownerUrl.searchParams.set("review", "privacy")
      ownerUrl.hash = "state"
      await page.goto(ownerUrl.href)
      const makePublic = page.getByRole("button", {
        name: locale === "fi" ? /jaa julkisesti/i : /make public/i,
      })
      const enabledNavigation = page.waitForRequest((request) => {
        const url = new URL(request.url())
        return (
          request.isNavigationRequest() &&
          request.method() === "GET" &&
          url.pathname === ownerUrl.pathname &&
          url.searchParams.get("share") === "1"
        )
      })
      const enabledResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/plans/${planId}` &&
          response.request().method() === "PATCH",
      )
      await makePublic.click()
      expect((await enabledResponse).status()).toBe(200)
      expect(await (await enabledResponse).json()).toMatchObject({
        ok: true,
        plan: { isPublic: true },
      })
      await enabledNavigation
      await expect(page).toHaveURL(/\?review=privacy&share=1#state$/)
      await expect(
        page.locator("main header").getByText(messages.plans.publicBadge, { exact: true }),
      ).toBeVisible()
      const share = page.getByRole("dialog")
      const link = share.getByRole("textbox")
      await expect(link).toBeVisible()
      const shareUrl = await link.inputValue()
      const published = await request.get(shareUrl)
      expect(published.status()).toBe(200)
      expect(await published.text()).toContain("Browser QA laboratory plan")
      await page.keyboard.press("Escape")
      const revokedNavigation = page.waitForRequest((request) => {
        const url = new URL(request.url())
        return (
          request.isNavigationRequest() &&
          request.method() === "GET" &&
          url.pathname === ownerUrl.pathname &&
          !url.searchParams.has("share")
        )
      })
      const revokedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/plans/${planId}` &&
          response.request().method() === "PATCH",
      )
      await page
        .getByRole("button", {
          name: locale === "fi" ? /yksityisenä|yksityiseksi/i : /keep private/i,
        })
        .click()
      expect((await revokedResponse).status()).toBe(200)
      expect(await (await revokedResponse).json()).toMatchObject({
        ok: true,
        plan: { isPublic: false, shareSlug: null },
      })
      await revokedNavigation
      await expect(page).toHaveURL(/\?review=privacy#state$/)
      await expect(makePublic).toBeVisible()
      await expect(
        page.locator("main header").getByText(messages.plans.privateBadge, { exact: true }),
      ).toBeVisible()
      await expect(
        page.locator("main header").getByText(messages.plans.publicBadge, { exact: true }),
      ).toHaveCount(0)
      await expect(share).toHaveCount(0)
      const persistedPrivate = await page.request.get(`/api/plans/${planId}`)
      expect(persistedPrivate.status()).toBe(200)
      expect(await persistedPrivate.json()).toMatchObject({
        plan: { isPublic: false, shareSlug: null },
      })
      const revoked = await request.get(shareUrl)
      expect([200, 404]).toContain(revoked.status())
      const revokedHtml = await revoked.text()
      expect(revokedHtml).not.toContain("Browser QA laboratory plan")
      expect(revokedHtml).toMatch(/name="robots"[^>]*content="[^"]*noindex/)
      const slug = new URL(shareUrl).pathname.split("/").pop()
      expect((await request.get(`/api/og/plan/${slug}`)).status()).toBe(404)
      expect((await request.get(`/api/og/plan/${slug}/${locale}`)).status()).toBe(404)
      await page
        .getByRole("button", { name: locale === "fi" ? /poista suunnitelma/i : /delete plan/i })
        .click()
      const deletion = page.getByRole("dialog")
      await deletion.getByRole("textbox").fill("DELETE")
      await page.route("**/api/plans/*", (route) =>
        route.request().method() === "DELETE"
          ? route.fulfill({ status: 503, json: { ok: false } })
          : route.continue(),
      )
      await deletion
        .getByRole("button", { name: locale === "fi" ? /poista suunnitelma/i : /delete plan/i })
        .click()
      await expect(deletion.getByRole("alert")).toBeVisible()
      expect(page.url()).toContain("/account/plans/")
      await page.unroute("**/api/plans/*")
      await deletion
        .getByRole("button", { name: locale === "fi" ? /poista suunnitelma/i : /delete plan/i })
        .click()
      await page.waitForURL(`**/${locale}/account/plans`)
    } finally {
      await cleanBrowserRecords(email)
    }
  })
  test(`${locale}: failed password-reset request stays retryable`, async ({ cleanPage: page }) => {
    await page.goto(`/${locale}/forgot-password`)
    await page.locator('main input[name="email"]').fill("browser-qa-reset@example.invalid")
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({ status: 503, json: { error: "unavailable" } }),
    )
    await page.locator('main form button[type="submit"]').click()
    await expect(page.locator("main").getByRole("alert")).toBeVisible()
    await expect(page.locator('main input[name="email"]')).toBeVisible()
    await expect(page.locator('main form button[type="submit"]')).toBeEnabled()
  })
}
