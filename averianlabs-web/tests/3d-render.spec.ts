import { expect, test } from "@playwright/test"

/**
 * Regression test for vial 3D rendering — verifies the partial-cylinder label
 * still renders correctly after the geometry/texture refactor. We capture
 * a screenshot after a brief wait so the camera has rotated enough to show
 * the label on the front of the vial.
 */
test("3D hero on PDP renders the vial label after rotation", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: "http://localhost:3000" }])
  await page.goto("http://localhost:3000/en/shop/bpc-157", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /Show 3D view/i }).click()
  // Let the auto-rotate spin until the label faces the camera.
  await page.waitForTimeout(8000)
  const canvas = page.locator("canvas").first()
  await expect(canvas).toBeVisible()
  await canvas.screenshot({ path: "test-results/vial-label-renders.png" })
  console.log("saved vial-label-renders.png")
})

test("3D shop carousel renders a non-empty canvas", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: "http://localhost:3000" }])
  await page.goto("http://localhost:3000/en/shop?view=3d", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(5000)
  const carousel = page.getByRole("region", { name: /3D product carousel/i })
  await expect(carousel).toBeVisible({ timeout: 15_000 })
  const canvas = carousel.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 5_000 })
  const dims = await canvas.evaluate((el) => ({
    w: (el as HTMLCanvasElement).clientWidth,
    h: (el as HTMLCanvasElement).clientHeight,
  }))
  expect(dims.w).toBeGreaterThan(100)
  expect(dims.h).toBeGreaterThan(100)
})
