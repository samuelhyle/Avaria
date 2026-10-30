import { assertWebhookSecret, webhookUrlFor } from "@/lib/telegram/webhook"
import { describe, expect, it } from "vitest"

/**
 * The webhook rules the Bot API imposes.
 *
 * A rejected `setWebhook` call is silent from the customer's point of view:
 * the bot simply stops answering. These checks run before the call, so a
 * mistake is reported as a clear message instead.
 */
describe("the webhook secret", () => {
  it("accepts a hex secret", () => {
    expect(() => assertWebhookSecret("a".repeat(64))).not.toThrow()
  })

  it("accepts the full character set Telegram allows", () => {
    expect(() => assertWebhookSecret("aB9_-xYz0123456789")).not.toThrow()
  })

  it("rejects a secret that is too short to be a secret", () => {
    expect(() => assertWebhookSecret("short")).toThrow(/at least 16/)
  })

  it("rejects a secret longer than Telegram accepts", () => {
    expect(() => assertWebhookSecret("a".repeat(257))).toThrow(/at most 256/)
  })

  it("rejects the characters Telegram would refuse", () => {
    // Base64 is the natural choice for a random secret and it contains
    // characters Telegram does not accept.
    expect(() => assertWebhookSecret("aB+/=cD".padEnd(20, "a"))).toThrow(/A-Z, a-z, 0-9/)
  })
})

describe("the webhook URL", () => {
  it("builds the endpoint from the site origin", () => {
    expect(webhookUrlFor("https://shop.example")).toBe("https://shop.example/api/telegram/webhook")
  })

  it("does not double the slash on an origin that ends with one", () => {
    expect(webhookUrlFor("https://shop.example/")).toBe("https://shop.example/api/telegram/webhook")
  })

  it("rejects a plain http origin", () => {
    expect(() => webhookUrlFor("http://localhost:3000")).toThrow(/HTTPS/)
  })

  it("rejects a port Telegram does not deliver to", () => {
    expect(() => webhookUrlFor("https://shop.example:3000")).toThrow(/ports/)
  })

  it("rejects credentials and non-origin URL components", () => {
    for (const origin of [
      "https://user:pass@shop.example",
      "https://shop.example/path",
      "https://shop.example?token=private",
      "https://shop.example/#fragment",
    ])
      expect(() => webhookUrlFor(origin)).toThrow(/only the site origin/)
  })

  it("accepts the ports Telegram does deliver to", () => {
    for (const port of [443, 80, 88, 8443])
      expect(webhookUrlFor(`https://shop.example:${port}`)).toContain("/api/telegram/webhook")
  })
})
