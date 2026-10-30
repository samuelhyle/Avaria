import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { onPreBuild, onSuccess } from "../../netlify/plugins/telegram-webhook/index.mjs"

vi.mock("node:child_process", () => ({ execFile: vi.fn() }))

const hosted = { constants: { IS_LOCAL: false } }
const token = "123456789:private-test-token"
const secret = "private_test_webhook_secret"

beforeEach(() => {
  vi.stubEnv("NETLIFY", "true")
  vi.stubEnv("CONTEXT", "production")
  vi.stubEnv("DEPLOY_ID", "production-deploy")
  vi.stubEnv("URL", "https://shop.example")
  vi.stubEnv("DEPLOY_PRIME_URL", "https://preview.example")
  vi.stubEnv("TELEGRAM_BOT_TOKEN", token)
  vi.stubEnv("TELEGRAM_BOT_USERNAME", "example_bot")
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", secret)
  vi.spyOn(console, "log").mockImplementation(() => undefined)
  vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
    callback?.(null, "child output contains private credentials", "")
    return {} as ReturnType<typeof execFile>
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe("hosted Telegram webhook setup", () => {
  it.each(["deploy-preview", "branch-deploy", "dev", "dev-server"])(
    "never registers a webhook in %s",
    async (context) => {
      vi.stubEnv("CONTEXT", context)
      onPreBuild(hosted)
      await onSuccess(hosted)
      expect(execFile).not.toHaveBeenCalled()
    },
  )

  it("never registers during a local production build", async () => {
    const local = { constants: { IS_LOCAL: true } }
    onPreBuild(local)
    await onSuccess(local)
    expect(execFile).not.toHaveBeenCalled()
  })

  it.each(["NETLIFY", "DEPLOY_ID"])("requires %s for a hosted invocation", async (key) => {
    vi.stubEnv(key, "")
    await onSuccess(hosted)
    expect(execFile).not.toHaveBeenCalled()
  })

  it("allows a site with no Telegram configuration", async () => {
    for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET"])
      vi.stubEnv(key, "")
    expect(() => onPreBuild(hosted)).not.toThrow()
    await onSuccess(hosted)
    expect(execFile).not.toHaveBeenCalled()
  })

  it("rejects partial configuration before deployment without exposing existing secrets", async () => {
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "")
    expect(() => onPreBuild(hosted)).toThrow("Missing production variables: TELEGRAM_BOT_USERNAME")
    await expect(onSuccess(hosted)).rejects.toThrow("TELEGRAM_BOT_USERNAME")
    expect(execFile).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
  })

  it("rejects a malformed webhook secret before deployment", () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "not/a/valid+secret=")
    expect(() => onPreBuild(hosted)).toThrow("TELEGRAM_WEBHOOK_SECRET must be")
  })

  it.each([
    "http://shop.example",
    "https://username:private-password@shop.example",
    "https://shop.example?token=private-token",
    "https://shop.example/path",
    "https://shop.example:3000",
  ])("rejects an unsafe origin without printing it", (origin) => {
    vi.stubEnv("URL", origin)
    expect(() => onPreBuild(hosted)).toThrow(/HTTPS origin/)
    expect(console.log).not.toHaveBeenCalled()
  })

  it("registers the canonical production URL after deploy with credentials only in inherited env", async () => {
    await onSuccess(hosted)
    expect(execFile).toHaveBeenCalledTimes(1)
    expect(execFile).toHaveBeenCalledWith(
      "pnpm",
      ["telegram:setup-webhook", "https://shop.example"],
      expect.objectContaining({
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: process.env,
        timeout: 60_000,
      }),
      expect.any(Function),
    )
    expect(console.log).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith(
      "[telegram] Webhook registered for https://shop.example",
    )
  })

  it("redacts child process errors and captured output", async () => {
    vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
      callback?.(
        new Error(`https://api.telegram.org/bot${token}/setWebhook ${secret}`),
        token,
        secret,
      )
      return {} as ReturnType<typeof execFile>
    })
    const error = await onSuccess(hosted).catch((failure: Error) => failure)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain("Webhook registration failed")
    expect(error.message).not.toContain(token)
    expect(error.message).not.toContain(secret)
    expect(console.log).not.toHaveBeenCalled()
  })
})
