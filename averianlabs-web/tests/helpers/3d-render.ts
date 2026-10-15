import { type Locator, expect } from "@playwright/test"

/** Inspect the composited PNG, since WebGL clears non-preserved drawing buffers. */
export async function expectRenderedContainer(canvas: Locator, screenshotPath: string) {
  await expect(canvas).toBeVisible()
  const dimensions = await canvas.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }))
  expect(dimensions.width).toBeGreaterThan(100)
  expect(dimensions.height).toBeGreaterThan(100)
  await expect
    .poll(
      async () => {
        const screenshot = await canvas.screenshot()
        return canvas.evaluate(async (_, png) => {
          const image = new Image()
          image.src = `data:image/png;base64,${png}`
          await image.decode()
          const surface = document.createElement("canvas")
          surface.width = image.naturalWidth
          surface.height = image.naturalHeight
          const context = surface.getContext("2d")
          if (!context) throw new Error("2D PNG inspection context unavailable")
          context.drawImage(image, 0, 0)
          const pixels = context.getImageData(0, 0, surface.width, surface.height).data
          const colors = new Set<number>()
          for (let index = 0; index < pixels.length; index += 16) {
            if (pixels[index + 3] === 0) continue
            colors.add(
              ((pixels[index] ?? 0) >> 4) * 256 +
                ((pixels[index + 1] ?? 0) >> 4) * 16 +
                ((pixels[index + 2] ?? 0) >> 4),
            )
          }
          return colors.size
        }, screenshot.toString("base64"))
      },
      {
        message: "The real canvas contains a shaded container rather than a blank surface",
        timeout: 15_000,
      },
    )
    .toBeGreaterThan(12)
  return canvas.screenshot({ path: screenshotPath })
}
