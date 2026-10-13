import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { chromium } from "@playwright/test"

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000"
const locale = process.env.SCREENSHOT_LOCALE ?? "en"
const outDir = process.argv[2] ?? "/tmp/hero-review"
await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    })
    await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: baseUrl }])
    await context.addInitScript(() =>
      localStorage.setItem("averianlabs-cookie-consent", "essential"),
    )
    const page = await context.newPage()
    await page.goto(`${baseUrl}/${locale}`, { waitUntil: "networkidle" })
    await page.screenshot({ path: join(outDir, `${locale}-${width}-above-fold.png`) })
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(`Screenshots saved to ${outDir}`)
