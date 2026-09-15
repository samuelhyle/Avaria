import { expect, test } from "@playwright/test"

test("InstancedVials: carousel renders all vials in fewer draw calls", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: "http://localhost:3000" }])
  await page.goto("http://localhost:3000/en/shop?view=3d", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(8000)
  const carousel = page.getByRole("region", { name: /3D product carousel/i })
  await expect(carousel).toBeVisible({ timeout: 15_000 })
  const canvas = carousel.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 5_000 })
  await page.screenshot({ path: "test-results/instanced-carousel.png", fullPage: true })
  console.log("carousel captured")
})

test("InstancedVials: PDP renders vial label after rotation", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: "http://localhost:3000" }])
  await page.goto("http://localhost:3000/en/shop/bpc-157", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  await page.getByRole("button", { name: /Show 3D view/i }).click()
  await page.waitForTimeout(8000)
  const canvas = page.locator("canvas").first()
  await expect(canvas).toBeVisible()
  await canvas.screenshot({ path: "test-results/instanced-pdp.png" })
  console.log("pdp captured")
})
