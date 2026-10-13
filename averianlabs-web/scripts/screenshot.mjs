// Uses the playwright package that ships under .pnpm.
import { chromium } from "/Users/purepanel/Avaria/averianlabs-web/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs"

const browser = await chromium.launch({
  executablePath: '/Users/purepanel/Library/Caches/ms-playwright/chromium-1243/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
// Pre-set the age-confirmed cookie so the age gate doesn't cover the hero.
await context.addCookies([
  { name: 'averianlabs-age-confirmed', value: '1', domain: 'localhost', path: '/' },
])
const page = await context.newPage()
await page.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/hero-review/home-above-fold.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2))
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/hero-review/home-mid.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.4))
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/hero-review/home-mid2.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3.6))
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/hero-review/home-bottom.png', fullPage: false })
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
})
await mobileContext.addCookies([
  { name: 'averianlabs-age-confirmed', value: '1', domain: 'localhost', path: '/' },
])
const mPage = await mobileContext.newPage()
await mPage.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded' })
await mPage.waitForTimeout(2500)
await mPage.screenshot({ path: '/tmp/hero-review/home-mobile.png', fullPage: false })
await browser.close()
console.log('Done')
