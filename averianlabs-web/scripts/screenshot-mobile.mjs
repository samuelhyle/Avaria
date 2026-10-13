// Capture mobile screenshots for review.
// Pre-sets the age gate cookie and snaps the homepage at a few breakpoints.
import { chromium } from "/Users/purepanel/Avaria/averianlabs-web/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs"

const browser = await chromium.launch({
  executablePath:
    "/Users/purepanel/Library/Caches/ms-playwright/chromium-1243/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
})

const viewports = [
  { name: "iphone-390", width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true },
  { name: "android-360", width: 360, height: 780, scale: 2, isMobile: true, hasTouch: true },
  { name: "tablet-768", width: 768, height: 1024, scale: 2, isMobile: true, hasTouch: true },
]

const outDir = process.argv[2] ?? "/tmp/mobile-review"
const label = process.argv[3] ?? "before"

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.scale,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  })
  await ctx.addCookies([
    { name: "averianlabs-age-confirmed", value: "1", domain: "localhost", path: "/" },
  ])
  const page = await ctx.newPage()
  await page.goto("http://localhost:3000/en", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${outDir}/${vp.name}-${label}.png`, fullPage: false })
  await page.screenshot({ path: `${outDir}/${vp.name}-full-${label}.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log("done")