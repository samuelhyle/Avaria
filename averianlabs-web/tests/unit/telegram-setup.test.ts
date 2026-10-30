import { setupTelegramWebhook } from "@/lib/telegram/setup"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { config, me, webhook, commands, info } = vi.hoisted(() => ({
  config: {} as Record<string, string | undefined>,
  me: vi.fn(),
  webhook: vi.fn(),
  commands: vi.fn(),
  info: vi.fn(),
}))
vi.mock("@/lib/env", () => ({ getServerEnv: () => config }))
vi.mock("@/lib/telegram/client", () => ({
  getTelegramMe: me,
  setTelegramWebhook: webhook,
  setTelegramCommands: commands,
  getTelegramWebhookInfo: info,
}))

beforeEach(() => {
  vi.resetAllMocks()
  config.TELEGRAM_BOT_TOKEN = "test-bot-token"
  config.TELEGRAM_BOT_USERNAME = "avarianlabs_bot"
  config.TELEGRAM_WEBHOOK_SECRET = "a".repeat(64)
  me.mockResolvedValue({ username: "avarianlabs_bot" })
  webhook.mockResolvedValue(true)
  commands.mockResolvedValue(true)
  info.mockResolvedValue({
    url: "https://shop.example/api/telegram/webhook",
    pending_update_count: 0,
  })
})

describe("Telegram registration", () => {
  it("verifies bot identity before registering and reads the webhook back", async () => {
    expect(await setupTelegramWebhook("https://shop.example")).toMatchObject({
      username: "avarianlabs_bot",
    })
    expect(me.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY).toBeLessThan(
      webhook.mock.invocationCallOrder[0] ?? Number.NEGATIVE_INFINITY,
    )
    expect(webhook).toHaveBeenCalledWith(
      "https://shop.example/api/telegram/webhook",
      "a".repeat(64),
    )
    expect(commands).toHaveBeenCalledOnce()
    expect(info).toHaveBeenCalledOnce()
  })

  it("does not redirect updates for a token belonging to a different bot", async () => {
    me.mockResolvedValue({ username: "another_bot" })
    await expect(setupTelegramWebhook("https://shop.example")).rejects.toThrow(/different bot/)
    expect(webhook).not.toHaveBeenCalled()
  })

  it("rejects incomplete config before making Telegram requests", async () => {
    for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET"]) {
      const previous = config[key]
      delete config[key]
      await expect(setupTelegramWebhook("https://shop.example")).rejects.toThrow(key)
      config[key] = previous
    }
    expect(me).not.toHaveBeenCalled()
  })

  it("detects a different registered destination", async () => {
    info.mockResolvedValue({ url: "https://other.example/api/telegram/webhook" })
    await expect(setupTelegramWebhook("https://shop.example")).rejects.toThrow(/differs/)
  })

  it("reports a command menu failure", async () => {
    commands.mockResolvedValue(false)
    await expect(setupTelegramWebhook("https://shop.example")).rejects.toThrow(/command menu/)
  })
})
