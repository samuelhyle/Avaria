import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { expectRenderedContainer } from "@/tests/helpers/3d-render"

for (const locale of ["en", "fi"]) {
  const messages = JSON.parse(
    readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
  )
  const t = messages.research

  test(`${locale}: optional neutral 3D preserves the selected SKU and localized caption`, async ({
    cleanPage: page,
  }, info) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/${locale}/shop/bpc-157?sku=BPC157-10`)
    const gallery = page.locator("main figure").first()
    const caption = gallery.locator("figcaption")
    await expect(caption).toContainText("BPC157-10")
    await expect(caption).toContainText(t.threeDNotice)
    await expect(gallery.locator("canvas")).toHaveCount(0)
    await gallery.getByRole("button", { name: t.optional3d, exact: true }).click()
    const fallback = gallery
      .locator('[role="status"]:not(canvas *)')
      .filter({ hasText: t.threeDUnavailable })
    await expect(gallery.locator("canvas").or(fallback).first()).toBeVisible({ timeout: 20_000 })
    test.skip(
      await fallback.isVisible(),
      "This browser has no WebGL; deterministic no-WebGL fallback is covered separately",
    )
    const start = gallery.getByRole("button", { name: t.resumeRotation, exact: true })
    await expect(start).toHaveAttribute("aria-pressed", "false")
    const canvas = gallery.locator("canvas")
    await expectRenderedContainer(canvas, info.outputPath(`${locale}-neutral-container.png`))
    await start.click()
    await expect(
      gallery.getByRole("button", { name: t.pauseRotation, exact: true }),
    ).toHaveAttribute("aria-pressed", "true")
    await gallery.getByRole("button", { name: t.turnRight, exact: true }).click()
    await expect(
      gallery.getByRole("button", { name: t.resumeRotation, exact: true }),
    ).toHaveAttribute("aria-pressed", "false")
    await page.locator("main fieldset").getByRole("button").filter({ hasText: "BPC157-5" }).click()
    await expect(page).toHaveURL(/sku=BPC157-5/)
    await expect(caption).toContainText("BPC157-5")
    await expect(caption).not.toContainText("BPC157-10")
    await expect(caption).toContainText(t.threeDNotice)
    await gallery.getByRole("button", { name: t.close3d, exact: true }).click()
    await expect(gallery.locator("canvas")).toHaveCount(0)
    await expect(caption).toContainText("BPC157-5")
    expect(errors).toEqual([])
  })
}

test("neutral 3D responds to reduced-motion changes and retains manual controls", async ({
  cleanPage: page,
}, info) => {
  const t = JSON.parse(
    readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"),
  ).research
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/en/shop/bpc-157?sku=BPC157-10")
  const gallery = page.locator("main figure").first()
  await gallery.getByRole("button", { name: t.optional3d, exact: true }).click()
  const fallback = gallery
    .locator('[role="status"]:not(canvas *)')
    .filter({ hasText: t.threeDUnavailable })
  await expect(gallery.locator("canvas").or(fallback).first()).toBeVisible({ timeout: 20_000 })
  test.skip(
    await fallback.isVisible(),
    "This browser has no WebGL; deterministic no-WebGL fallback is covered separately",
  )
  await expect(gallery.getByRole("button", { name: t.resumeRotation, exact: true })).toBeDisabled()
  await gallery.getByRole("button", { name: t.turnLeft, exact: true }).click()
  await expectRenderedContainer(
    gallery.locator("canvas"),
    info.outputPath("reduced-motion-manual-container.png"),
  )
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await expect(gallery.getByRole("button", { name: t.resumeRotation, exact: true })).toBeEnabled()
  await gallery.getByRole("button", { name: t.resumeRotation, exact: true }).click()
  await expect(gallery.getByRole("button", { name: t.pauseRotation, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect(gallery.getByRole("button", { name: t.resumeRotation, exact: true })).toBeDisabled()
  await expect(
    gallery.getByRole("button", { name: t.resumeRotation, exact: true }),
  ).toHaveAttribute("aria-pressed", "false")
  await expect(gallery.locator("figcaption")).toContainText("BPC157-10")
})
