import { register } from "@/instrumentation"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureRequestError: vi.fn() }))
vi.mock("@sentry/nextjs", () => sentry)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BUILD_MODE", "")
  vi.stubEnv("NEXT_RUNTIME", "nodejs")
  vi.stubEnv("SENTRY_DSN", "")
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "")
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

it("records only actual Node version and platform metadata even when Sentry is disabled", () => {
  register()

  expect(console.info).toHaveBeenCalledTimes(1)
  const [label, metadata] = vi.mocked(console.info).mock.calls[0] ?? []
  expect(label).toBe("[runtime] Node.js")
  expect(metadata).toEqual({
    version: process.version,
    arch: process.arch,
    platform: process.platform,
  })
  expect(sentry.init).not.toHaveBeenCalled()
})

it("keeps normal Sentry initialization without exposing its DSN in the startup log", () => {
  const dsn = "https://fixture-key@monitoring.example.invalid/123"
  vi.stubEnv("SENTRY_DSN", dsn)
  vi.stubEnv("NODE_ENV", "production")

  register()

  expect(sentry.init).toHaveBeenCalledWith({
    dsn,
    environment: "production",
    tracesSampleRate: 0.1,
    debug: false,
  })
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(dsn)
})

it.each(["edge", ""])("does not emit Node metadata in the %s runtime", (runtime) => {
  vi.stubEnv("NEXT_RUNTIME", runtime)
  register()
  expect(console.info).not.toHaveBeenCalled()
  expect(sentry.init).not.toHaveBeenCalled()
})

it("retains edge Sentry behavior while omitting Node startup metadata", () => {
  vi.stubEnv("NEXT_RUNTIME", "edge")
  vi.stubEnv("SENTRY_DSN", "https://fixture-key@monitoring.example.invalid/123")
  register()
  expect(sentry.init).toHaveBeenCalledTimes(1)
  expect(console.info).not.toHaveBeenCalled()
})

it("keeps demo instrumentation inactive", () => {
  vi.stubEnv("BUILD_MODE", "demo")
  vi.stubEnv("SENTRY_DSN", "https://fixture-key@monitoring.example.invalid/123")
  register()
  expect(console.info).not.toHaveBeenCalled()
  expect(sentry.init).not.toHaveBeenCalled()
})
