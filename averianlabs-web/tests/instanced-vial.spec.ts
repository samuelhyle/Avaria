import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { expectRenderedContainer } from "@/tests/helpers/3d-render"

test("optional catalogue 3D keeps product navigation and SKU identity consistent", async ({
  cleanPage: page,
}, info) => {
  const m = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"))
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/en/shop?view=3d")
  const carousel = page.getByRole("region", { name: m.shop.carouselLabel, exact: true })
  await expect(carousel).toBeVisible()
  const fallback = carousel
    .locator('[role="status"]:not(canvas *)')
    .filter({ hasText: m.research.threeDUnavailable })
  await expect(carousel.locator("canvas").or(fallback).first()).toBeVisible({ timeout: 20_000 })
  if (await carousel.locator("canvas").count()) {
    await expectRenderedContainer(
      carousel.locator("canvas"),
      info.outputPath("neutral-catalogue-container.png"),
    )
    await expect(
      carousel.getByRole("button", { name: m.research.resumeRotation, exact: true }),
    ).toHaveAttribute("aria-pressed", "false")
  } else {
    test.info().annotations.push({
      type: "webgl-unavailable",
      description:
        "Static fallback checked; actual canvas rendering is unavailable in this browser",
    })
  }
  const initialSku = await carousel.locator("p.font-mono").textContent()
  await carousel.getByRole("button", { name: m.shop.carouselNext, exact: true }).click()
  await expect(carousel.locator("p.font-mono")).not.toHaveText(initialSku ?? "")
  const sku = (await carousel.locator("p.font-mono").textContent())?.trim() ?? ""
  const name = (await carousel.getByRole("heading", { level: 3 }).textContent())?.trim() ?? ""
  expect(sku).toBeTruthy()
  expect(name).toBeTruthy()
  await expect(
    carousel.getByRole("button", {
      name: m.shop.carouselGoTo.replace("{name}", name),
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true")
  await carousel.getByRole("link", { name: `${m.research.product} →`, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText(name ?? "")
  await expect(page.locator("main figure figcaption").first()).toContainText(sku ?? "")
  expect(errors).toEqual([])
})

test("without WebGL the Finnish selected SKU and static illustration remain usable", async ({
  cleanPage: page,
}) => {
  const t = JSON.parse(
    readFileSync(new URL("../messages/fi.json", import.meta.url), "utf8"),
  ).research
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.includes("webgl")) return null
      return (
        original as (
          this: HTMLCanvasElement,
          contextId: string,
          ...parameters: unknown[]
        ) => RenderingContext | null
      ).call(this, kind, ...args)
    } as typeof original
  })
  await page.goto("/fi/shop/bpc-157?sku=BPC157-10")
  const gallery = page.locator("main figure").first()
  await expect(gallery.locator("figcaption")).toContainText("BPC157-10")
  await gallery.getByRole("button", { name: t.optional3d, exact: true }).click()
  await expect(gallery.getByRole("status")).toHaveText(t.threeDUnavailable)
  await expect(gallery.locator("canvas")).toHaveCount(0)
  await expect(gallery.locator('svg[aria-hidden="true"]').first()).toBeVisible()
  await expect(gallery.locator("figcaption")).toContainText(t.threeDNotice)
  await expect(gallery.locator("figcaption")).toContainText("BPC157-10")
  await page.locator("main fieldset").getByRole("button").filter({ hasText: "BPC157-5" }).click()
  await expect(page).toHaveURL(/sku=BPC157-5/)
  await expect(gallery.locator("figcaption")).toContainText("BPC157-5")
  await expect(gallery.locator("canvas")).toHaveCount(0)
  await expect(gallery.getByRole("status")).toHaveCount(0)
  await gallery.getByRole("button", { name: t.optional3d, exact: true }).click()
  await expect(gallery.getByRole("status")).toHaveText(t.threeDUnavailable)
  await gallery.getByRole("button", { name: t.close3d, exact: true }).click()
  await expect(gallery.getByRole("status")).toHaveCount(0)
  await expect(gallery.locator('svg[aria-hidden="true"]').first()).toBeVisible()
  await expect(gallery.locator("figcaption")).toContainText("BPC157-5")
  expect(errors).toEqual([])
})
