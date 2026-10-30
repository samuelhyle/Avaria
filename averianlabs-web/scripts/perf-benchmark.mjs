#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
/**
 * Storefront performance benchmark.
 *
 * Reports the three numbers that decide how fast the shop feels on a phone:
 * the bytes the browser must download before the page is interactive, the
 * bytes of inline payload the browser must parse, and how long the server
 * takes to produce the HTML.
 *
 * Usage:
 *   node scripts/perf-benchmark.mjs            # against http://localhost:3000
 *   BASE_URL=http://localhost:3100 node scripts/perf-benchmark.mjs
 */
import { gzipSync } from "node:zlib"
import { chromium } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const DIST = process.env.NEXT_DIST_DIR ?? ".next"
const PATHS = ["/en", "/en/shop", "/en/shop/bpc-157", "/en/checkout/cart"]
const VIEWPORT = { width: 390, height: 844 }

function gzipSize(file) {
  try {
    return gzipSync(readFileSync(file)).length
  } catch {
    return 0
  }
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: VIEWPORT })
await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: BASE }])
const page = await context.newPage()

// LCP and CLS are only reported when they are observed, so install the
// observers before the first navigation.
await page.addInitScript(() => {
  window.__lcp = 0
  window.__cls = 0
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime
    }).observe({ type: "largest-contentful-paint", buffered: true })
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value
      }
    }).observe({ type: "layout-shift", buffered: true })
  } catch {}
})

const rows = []
// Warm the server first: the first request to a route pays for the catalogue
// cache fill and any lazily compiled module, which is not what a returning
// visitor experiences.
await page.goto(`${BASE}/en`, { waitUntil: "load", timeout: 60_000 })

for (const path of PATHS) {
  const started = Date.now()
  const response = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 })
  const ttfbWall = Date.now() - started
  await page.waitForTimeout(1200)

  const html = await response.text()
  const htmlGzip = gzipSize.length ? gzipSync(Buffer.from(html)).length : 0

  const scripts = [
    ...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\\ ]+\.js/g)].map((m) => m[0])),
  ].filter((src) => !src.includes("polyfills"))
  // Fonts come from two places: the build output and `public/fonts`.
  const fonts = [
    ...new Set([
      ...[...html.matchAll(/\/_next\/static\/media\/[^"'\\ ]+\.woff2/g)].map((m) => m[0]),
      ...[...html.matchAll(/["'(](\/fonts\/[^"'\\ )]+\.woff2)/g)].map((m) => m[1]),
    ]),
  ]
  const styles = [
    ...new Set([...html.matchAll(/\/_next\/static\/css\/[^"'\\ ]+\.css/g)].map((m) => m[0])),
  ]
  const jsBytes = scripts.reduce((sum, f) => sum + gzipSize(DIST + f.replace("/_next", "")), 0)
  const fontBytes = fonts.reduce(
    (sum, f) =>
      sum +
      (f.startsWith("/fonts/") ? gzipSize(`public${f}`) : gzipSize(DIST + f.replace("/_next", ""))),
    0,
  )
  const cssBytes = styles.reduce((sum, f) => sum + gzipSize(DIST + f.replace("/_next", "")), 0)
  const inlineBytes = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].reduce(
    (sum, m) => sum + m[1].length,
    0,
  )

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0]
    const paints = performance.getEntriesByType("paint")
    const lcp = performance.getEntriesByType("largest-contentful-paint")
    let cls = window.__cls ?? 0
    if (!cls) {
      for (const entry of performance.getEntriesByType("layout-shift")) {
        if (!entry.hadRecentInput) cls += entry.value
      }
    }
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(paints.find((p) => p.name === "first-contentful-paint")?.start ?? 0),
      lcp: Math.round(Math.max(lcp[lcp.length - 1]?.start ?? 0, window.__lcp ?? 0)),
      cls: Math.round(cls * 1000) / 1000,
      domNodes: document.querySelectorAll("*").length,
      requests: performance.getEntriesByType("resource").length,
    }
  })

  rows.push({
    path,
    ttfbWall,
    ttfb: metrics.ttfb,
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    cls: metrics.cls,
    htmlGzip: Math.round(htmlGzip / 1024),
    inlineKb: Math.round(inlineBytes / 1024),
    jsKb: Math.round(jsBytes / 1024),
    cssKb: Math.round(cssBytes / 1024),
    fontKb: Math.round(fontBytes / 1024),
    totalKb: Math.round((htmlGzip + jsBytes + cssBytes + fontBytes) / 1024),
    domNodes: metrics.domNodes,
    requests: metrics.requests,
  })
}

await browser.close()

const head = [
  "route",
  "html",
  "inline",
  "js",
  "css",
  "fonts",
  "TOTAL",
  "TTFB",
  "FCP",
  "LCP",
  "CLS",
  "DOM",
]
console.log(head.join(" | "))
for (const r of rows) {
  console.log(
    [
      r.path.padEnd(20),
      `${r.htmlGzip}K`.padStart(5),
      `${r.inlineKb}K`.padStart(6),
      `${r.jsKb}K`.padStart(5),
      `${r.cssKb}K`.padStart(4),
      `${r.fontKb}K`.padStart(5),
      `${r.totalKb}K`.padStart(5),
      `${r.ttfb}ms`.padStart(5),
      `${r.fcp}ms`.padStart(5),
      `${r.lcp}ms`.padStart(5),
      String(r.cls).padStart(5),
      String(r.domNodes).padStart(5),
    ].join(" | "),
  )
}
const total = rows.reduce((s, r) => s + r.totalKb, 0)
console.log(`\nTotal transferred across ${rows.length} routes: ${(total / 1024).toFixed(2)} MB`)
if (!existsSync(`${DIST}/BUILD_ID`)) console.warn(`Warning: ${DIST} has no BUILD_ID`)
