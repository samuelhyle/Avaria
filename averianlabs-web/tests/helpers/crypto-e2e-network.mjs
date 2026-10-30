// Test process preload. Never imported by the application or production build.
if (
  !process.env.TELEGRAM_BOT_TOKEN?.includes("TEST_ONLY") ||
  !process.env.CRYPTO_E2E_MOCK_ORIGIN?.startsWith("http://127.0.0.1:")
)
  throw new Error("Isolated crypto test configuration required")
const originalFetch = globalThis.fetch
const targets = new Set([
  "api.telegram.org",
  "api.resend.com",
  "rates.e2e.invalid",
  "rpc.e2e.invalid",
])
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url)
  if (!targets.has(url.hostname)) return originalFetch(input, init)
  return originalFetch(
    `${process.env.CRYPTO_E2E_MOCK_ORIGIN}/mock/${url.hostname}${url.pathname}`,
    init,
  )
}
