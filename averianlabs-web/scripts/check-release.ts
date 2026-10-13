import { getServerEnv } from "@/lib/env"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
const env = getServerEnv()
const failures: string[] = []
if (process.env.BUILD_MODE === "demo") failures.push("Demo builds cannot accept production orders")
if (!env.AUTH_URL?.startsWith("https://")) failures.push("AUTH_URL must use HTTPS for production")
for (const key of [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CRON_SECRET",
] as const) {
  if (
    !process.env[key]?.trim() ||
    /placeholder|local_test|local-placeholder/.test(process.env[key] ?? "")
  )
    failures.push(`${key} must be configured for the intended production environment`)
}
if (process.env.TEST_DATABASE_URL)
  failures.push("Remove isolated test database configuration before release")
try {
  const catalogue = await getStorefrontCatalogue()
  if (
    !catalogue.some(
      (p) =>
        p.dataSource === "database" &&
        p.vials.some((v) => v.purchaseMode === "direct" && v.stockQty > 0),
    )
  )
    failures.push("No released, documented SKU is available for direct sale")
  if (catalogue.some((p) => p.slug.startsWith("qa-") || p.slug.startsWith("test-")))
    failures.push("Remove automated test fixtures before release")
} catch {
  failures.push("Production catalogue could not be verified")
}
await globalThis.__averianlabsPg?.end()
if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join("\n"))
  process.exit(1)
}
console.log(
  "Technical release prerequisites passed. Owner approval and live sandbox checks are documented in the release runbook.",
)
