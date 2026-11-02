import { beforeEach, describe, expect, it, vi } from "vitest"

const { config, enqueue } = vi.hoisted(() => ({
  config: {} as Record<string, string | undefined>,
  enqueue: vi.fn(),
}))

vi.mock("@/lib/env", () => ({ getServerEnv: () => config }))
vi.mock("@/lib/telegram/outbox", () => ({ enqueueTelegramMessage: enqueue }))

import { notifyOps } from "@/lib/ops/notify"

beforeEach(() => {
  vi.resetAllMocks()
  config.TELEGRAM_OPS_CHAT_ID = "-1001234567890"
})

describe("the operations channel", () => {
  it("writes a lead to the operations chat", async () => {
    await notifyOps({
      event: "quote",
      locale: "fi",
      name: "A Researcher",
      email: "researcher@example.invalid",
      subject: "BPC157-10",
      organisation: "Lab X",
      message: "Need 10 mg, two vials",
    })
    expect(enqueue).toHaveBeenCalledTimes(1)
    const [message, dedupeKey] = enqueue.mock.calls[0]
    expect(message.chatId).toBe("-1001234567890")
    // The heading is in the language the visitor wrote in.
    expect(message.text).toContain("Tarjouspyyntö")
    expect(message.text).toContain("BPC157-10")
    expect(message.text).toContain("researcher@example.invalid")
    expect(dedupeKey).toBe("ops:quote:researcher@example.invalid:BPC157-10")
  })

  it("falls back to English for a language it has no heading for", async () => {
    await notifyOps({
      event: "contact",
      locale: "xx",
      name: "A Researcher",
      email: "researcher@example.invalid",
      subject: "Question",
    })
    expect(enqueue.mock.calls[0][0].text).toContain("Contact form")
  })

  it("writes nothing when no operations chat is configured", async () => {
    delete config.TELEGRAM_OPS_CHAT_ID
    await notifyOps({
      event: "quote",
      locale: "en",
      name: "A Researcher",
      email: "researcher@example.invalid",
      subject: "BPC157-10",
    })
    expect(enqueue).not.toHaveBeenCalled()
  })

  it("escapes what the visitor typed before it reaches the chat", async () => {
    await notifyOps({
      event: "quote",
      locale: "en",
      name: "<script>alert(1)</script>",
      email: "researcher@example.invalid",
      subject: "BPC157-10",
      message: "5 mg & <b>bold</b>",
    })
    const text = enqueue.mock.calls[0][0].text
    expect(text).not.toContain("<script>")
    expect(text).toContain("&lt;script&gt;")
    expect(text).toContain("5 mg &amp; &lt;b&gt;bold&lt;/b&gt;")
  })
})
