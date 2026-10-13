import { mkdir, writeFile } from "node:fs/promises"
// Mobile Lighthouse laboratory measurements; field Core Web Vitals need real visits.
import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"

const resolveCliDependency = createRequire(import.meta.resolve("@lhci/cli/package.json"))
const { default: lighthouse } = await import(
  pathToFileURL(resolveCliDependency.resolve("lighthouse")).href
)
const launcher = resolveCliDependency("chrome-launcher")
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000"
const outDir = process.argv[2] ?? "/tmp/averian-performance-review"
await mkdir(outDir, { recursive: true })
const chrome = await launcher.launch({
  chromePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
})
let browser
try {
  browser = await chromium.connectOverCDP(`http://localhost:${chrome.port}`)
  const context = browser.contexts()[0]
  await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: baseUrl }])
  const initial = await context.newPage()
  await initial.goto(`${baseUrl}/en`)
  await initial.evaluate(() => localStorage.setItem("averianlabs-cookie-consent", "essential"))
  await initial.close()
  const results = []
  for (const route of ["/en", "/fi", "/en/shop", "/fi/shop"]) {
    const result = await lighthouse(`${baseUrl}${route}`, {
      port: chrome.port,
      logLevel: "error",
      disableStorageReset: true,
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    })
    const lhr = result.lhr
    results.push({
      route,
      fetchedAt: lhr.fetchTime,
      mode: "mobile-simulated",
      beneathAgeGate: true,
      consent: "essential",
      warnings: lhr.runWarnings,
      scores: Object.fromEntries(
        Object.entries(lhr.categories).map(([key, value]) => [key, value.score]),
      ),
      lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
      tbtMs: lhr.audits["total-blocking-time"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      fcpMs: lhr.audits["first-contentful-paint"].numericValue,
      diagnostics: [
        "unused-javascript",
        "render-blocking-resources",
        "server-response-time",
        "legacy-javascript",
      ].map((key) => ({
        key,
        title: lhr.audits[key]?.title,
        value: lhr.audits[key]?.displayValue,
        score: lhr.audits[key]?.score,
      })),
    })
    console.log(
      `${route}: performance ${lhr.categories.performance.score}; LCP ${Math.round(lhr.audits["largest-contentful-paint"].numericValue)} ms; TBT ${Math.round(lhr.audits["total-blocking-time"].numericValue)} ms; CLS ${lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3)}`,
    )
  }
  await writeFile(
    join(outDir, "mobile-lighthouse.json"),
    `${JSON.stringify(
      {
        tool: "Lighthouse",

        limitations:
          "One local simulated mobile run per route. TBT is a lab measurement, not field INP. Does not establish production Core Web Vitals.",
        results,
      },
      null,
      2,
    )}\n`,
  )
} finally {
  if (browser) await browser.close()
  await chrome.kill()
}
