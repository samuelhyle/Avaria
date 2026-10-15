import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import type { CDPSession } from "@playwright/test"

for (const locale of ["en", "fi"] as const) {
  const m = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
  test(`${locale}: cached scripts hydrate the exact product SKU during slow HTML and full quantity navigation`, async ({
    cleanPage: page,
    context,
  }, info) => {
    test.setTimeout(120_000)
    const errors: Array<{ at: string; url: string; message: string }> = []
    const stages: Array<{ stage: string; at: string; url: string }> = []
    page.on("pageerror", (error) =>
      errors.push({ at: new Date().toISOString(), url: page.url(), message: error.message }),
    )
    const checkErrors = (stage: string) => {
      stages.push({ stage, at: new Date().toISOString(), url: page.url() })
      expect(errors, `${locale} ${stage}: native product hydration`).toEqual([])
    }
    const checkSku = async (sku: string, otherSku: string) => {
      const gallery = page.locator("main figure").first()
      await expect(gallery.locator("figcaption")).toContainText(sku)
      await expect(gallery.locator("figcaption")).not.toContainText(otherSku)
      await expect(page.locator('main fieldset button[aria-pressed="true"]')).toContainText(sku)
      await expect(page.locator("main + footer")).toBeVisible()
      await expect(gallery.locator("canvas")).toHaveCount(0)
      checkErrors(`caption and controls agree for ${sku}`)
    }
    const openAndCloseCart = async () => {
      await page.locator("header").getByRole("button", { name: m.nav.cart, exact: true }).click()
      const cart = page.getByRole("dialog", { name: m.cart.drawerTitle, exact: true })
      await expect(cart).toBeVisible()
      await expect(cart).toContainText(m.cart.empty)
      await page.keyboard.press("Escape")
      await expect(cart).toBeHidden()
      checkErrors("real header cart handlers respond")
    }
    let cdp: CDPSession | undefined
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      // Warm the real script cache and prove hydration before changing delivery.
      // No HTML, JavaScript, WebGL or API response is mocked in this regression.
      await page.goto(`/${locale}/shop/bpc-157?sku=BPC157-10`)
      checkErrors("warm product navigation completed")
      await checkSku("BPC157-10", "BPC157-5")
      await openAndCloseCart()
      cdp = await context.newCDPSession(page)
      await cdp.send("Network.enable")
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 30,
        downloadThroughput: 32 * 1024,
        uploadThroughput: 256 * 1024,
        connectionType: "wifi",
      })

      await page.goto(`/${locale}/shop/bpc-157?sku=BPC157-10`)
      checkErrors("slow cached-script SKU10 navigation completed")
      await checkSku("BPC157-10", "BPC157-5")
      await openAndCloseCart()

      const changed = page.waitForRequest((request) => {
        const url = new URL(request.url())
        return (
          request.isNavigationRequest() &&
          request.method() === "GET" &&
          url.pathname === `/${locale}/shop/bpc-157` &&
          url.searchParams.get("sku") === "BPC157-5"
        )
      })
      await page
        .locator("main fieldset")
        .getByRole("button")
        .filter({ hasText: "BPC157-5" })
        .click()
      await changed
      await expect(page).toHaveURL(new RegExp(`/${locale}/shop/bpc-157\\?sku=BPC157-5$`))
      checkErrors("slow quantity full GET committed")
      await checkSku("BPC157-5", "BPC157-10")
      await openAndCloseCart()
    } finally {
      // Keep the original page errors even when a later assertion times out.
      await info.attach("product-hydration-page-errors", {
        body: JSON.stringify({ locale, errors, stages }, null, 2),
        contentType: "application/json",
      })
      if (cdp) {
        await cdp
          .send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1,
          })
          .catch(() => {})
        await cdp.detach().catch(() => {})
      }
    }
  })
}
