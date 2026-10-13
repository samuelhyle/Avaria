// Capture desktop screenshots for review.
import { chromium } from "/Users/purepanel/Avaria/averianlabs-web/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs"

const browser = await chromium.launch({
  executablePath:
    "/Users/purepanel/Library/Caches/ms-playwright/chromium-1243/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
})

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900, scale: 2 },
  { name: "desktop-1280", width: 1280, height: 800, scale: 1 },
]

const outDir = process.argv[2] ?? "/tmp/desktop-review"
const label = process.argv[3] ?? "before"

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.scale,
  })
  await ctx.addCookies([
    { name: "averianlabs-cookie-consent", value: "all", domain: "localhost", path: "/" },
    { name: "averianlabs-age-confirmed", value: "1", domain: "localhost", path: "/" },
  ])
  const page = await ctx.newPage()
  await page.goto("http://localhost:3000/en", { waitUntil: "domcontentloaded" })
  // Pre-set localStorage consent so the cookie banner doesn't cover the screenshot
  await page.evaluate(() => {
    try {
      localStorage.setItem("averianlabs-cookie-consent", "all")
    } catch {}
  })
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${outDir}/${vp.name}-${label}-fold.png`, fullPage: false })
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.4))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${outDir}/${vp.name}-${label}-mid.png`, fullPage: false })
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.8))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${outDir}/${vp.name}-${label}-bottom.png`, fullPage: false })
  await page.screenshot({ path: `${outDir}/${vp.name}-${label}-full.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log("done")
