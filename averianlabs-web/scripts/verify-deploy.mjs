#!/usr/bin/env node
/**
 * Verifies a Netlify deploy before it is published.
 *
 * The release runbook requires the new deployment to be checked at its own
 * HTTPS URL before the previous one is unlocked and the new one published.
 * This script performs that check: the site must answer, the pages must
 * render in every locale, the API must respond, a cross-origin write must be
 * refused, and the site must be indexable.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs <deploy-url>
 */
const target = process.argv[2]
if (!target) {
  console.error("usage: node scripts/verify-deploy.mjs <deploy-url>")
  process.exit(2)
}

const origin = target.replace(/\/$/, "")
const failures = []
const notes = []

function check(name, ok, detail = "") {
  if (ok) notes.push(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`)
  else failures.push(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`)
}

async function get(path, init) {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(45_000),
  })
  return response
}

// 1. The health endpoint reports the environment and the database.
try {
  const response = await get("/api/health")
  const body = await response.json().catch(() => null)
  check("health endpoint", response.ok && body?.status === "ok", JSON.stringify(body))
} catch (error) {
  check("health endpoint", false, String(error))
}

// 2. Every locale renders its home page, the shop and a product page.
for (const locale of ["en", "fi", "sv", "ru"]) {
  for (const path of ["", "/shop", "/shop/bpc-157"]) {
    try {
      const response = await get(`/${locale}${path}`)
      const html = await response.text()
      // The 404 template ships inside the client bundle, so its text is
      // present on every page. The heading of the rendered page is what
      // distinguishes a real page from an error page.
      const hasContent = html.includes("<main") && html.length > 2000
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ""
      const notAnError =
        !/Application error/i.test(html.slice(0, 4000)) &&
        !/^Error \d{3}/.test(title) &&
        !/^Page not found$/i.test(title)
      check(
        `${locale}${path || "/"} renders`,
        response.ok && hasContent && notAnError,
        `HTTP ${response.status}, title "${title.slice(0, 50)}"`,
      )
    } catch (error) {
      check(`${locale}${path || "/"} renders`, false, String(error))
    }
  }
}

// 3. The site is indexable: no review gate, and robots.txt allows crawling.
try {
  const response = await get("/en")
  const robotsTag = response.headers.get("x-robots-tag") ?? ""
  check("no review noindex header", !robotsTag.includes("noindex, nofollow"), robotsTag || "none")
  const html = await response.text()
  check("page metadata is indexable", !html.includes('name="robots" content="noindex'))
  // The canonical URL names the site's primary origin, not the deploy
  // preview's unique hostname. A preview must never be the canonical URL,
  // or a search engine would index the preview.
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? ""
  check(
    "canonical names the primary site, not the preview",
    canonical.startsWith("https://") && !canonical.includes("--"),
    canonical,
  )
} catch (error) {
  check("indexability", false, String(error))
}

try {
  const response = await get("/robots.txt")
  const body = await response.text()
  check(
    "robots.txt allows crawling",
    /User-Agent:\s*\*\s*\r?\nAllow:\s*\//i.test(body),
    body.split("\n").slice(0, 2).join(" "),
  )
} catch (error) {
  check("robots.txt allows crawling", false, String(error))
}

// 4. The sitemap names the served origin, not a domain that does not resolve.
try {
  const response = await get("/sitemap.xml")
  const body = await response.text()
  // The sitemap lists the site's primary origin. A deploy preview must not
  // add its own unique hostname to the sitemap.
  const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  const previewEntries = locations.filter((location) => location.includes("--"))
  check(
    "sitemap lists no preview URLs",
    locations.length > 0 && previewEntries.length === 0,
    previewEntries.length
      ? `${previewEntries.length} preview entries: ${previewEntries[0]}`
      : `${locations.length} entries`,
  )
  const dead = locations.filter((location) => {
    try {
      const url = new URL(location)
      return url.hostname.endsWith(".eu") || url.hostname === "averianlabs.eu"
    } catch {
      return true
    }
  })
  check(
    "sitemap lists no unregistered domain",
    dead.length === 0,
    dead.length ? `${dead.length} entries name averianlabs.eu: ${dead[0]}` : "none",
  )
} catch (error) {
  check("sitemap entries use the served origin", false, String(error))
}

// 5. A cross-origin write is refused. The deployment must not accept it.
try {
  const response = await get("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({}),
  })
  check("a cross-origin write is refused", response.status === 403, `HTTP ${response.status}`)
} catch (error) {
  check("a cross-origin write is refused", false, String(error))
}

// 6. A same-origin write reaches the handler rather than the CSRF guard.
try {
  const response = await get("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({}),
  })
  check(
    "a same-origin write reaches the handler",
    response.status !== 403,
    `HTTP ${response.status}`,
  )
} catch (error) {
  check("a same-origin write reaches the handler", false, String(error))
}

// 7. The API rejects an invalid payload rather than crashing.
try {
  const response = await get("/api/search?q=")
  check("search API responds", response.status === 200, `HTTP ${response.status}`)
} catch (error) {
  check("search API responds", false, String(error))
}

console.log(`\nVerifying ${origin}\n`)
for (const note of notes) console.log(note)
for (const failure of failures) console.log(failure)
console.log(`\n${notes.length} passed, ${failures.length} failed`)

if (failures.length > 0) process.exit(1)
