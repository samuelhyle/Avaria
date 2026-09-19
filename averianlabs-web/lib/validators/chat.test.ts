import { chatRequestSchema, contextSchema, messageSchema } from "@/lib/validators/chat"
import { describe, expect, it } from "vitest"

describe("messageSchema", () => {
  it("accepts a valid message", () => {
    const result = messageSchema.parse({
      id: "m1",
      role: "user",
      content: "hello",
    })
    expect(result.content).toBe("hello")
  })

  it("rejects an empty content", () => {
    expect(() => messageSchema.parse({ id: "m1", role: "user", content: "" })).toThrow()
  })

  it("rejects content over 8000 chars", () => {
    expect(() =>
      messageSchema.parse({
        id: "m1",
        role: "user",
        content: "x".repeat(8001),
      }),
    ).toThrow()
  })

  it("rejects unknown roles", () => {
    expect(() => messageSchema.parse({ id: "m1", role: "system", content: "hi" })).toThrow()
  })

  it("rejects empty id", () => {
    expect(() => messageSchema.parse({ id: "", role: "user", content: "hi" })).toThrow()
  })
})

describe("contextSchema", () => {
  it("accepts a minimal context", () => {
    expect(contextSchema.parse({ kind: "shop" }).kind).toBe("shop")
  })

  it("accepts all the recognised kinds", () => {
    for (const kind of [
      "home",
      "shop",
      "product",
      "category",
      "cart",
      "blog",
      "support",
      "other",
    ] as const) {
      expect(contextSchema.parse({ kind }).kind).toBe(kind)
    }
  })

  it("rejects unknown kinds", () => {
    expect(() => contextSchema.parse({ kind: "checkout" })).toThrow()
  })
})

describe("chatRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    const parsed = chatRequestSchema.parse({
      messages: [{ id: "m1", role: "user", content: "hi" }],
    })
    expect(parsed.messages).toHaveLength(1)
  })

  it("rejects an empty messages array", () => {
    expect(() => chatRequestSchema.parse({ messages: [] })).toThrow()
  })

  it("rejects more than 50 messages", () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      id: `m${i}`,
      role: "user" as const,
      content: "hi",
    }))
    expect(() => chatRequestSchema.parse({ messages })).toThrow()
  })

  it("accepts a full request with locale, context, cart, and conversationId", () => {
    const parsed = chatRequestSchema.parse({
      messages: [{ id: "m1", role: "user", content: "hi" }],
      locale: "en",
      context: { kind: "shop", slug: "bpc-157", name: "BPC-157" },
      cart: [
        {
          sku: "BPC-10",
          productSlug: "bpc-157",
          name: "BPC-157",
          mg: 10,
          qty: 1,
          unitPriceCents: 4900,
        },
      ],
      conversationId: "conv-123",
      anonId: "00000000-0000-0000-0000-000000000000",
    })
    expect(parsed.locale).toBe("en")
    expect(parsed.cart).toHaveLength(1)
    expect(parsed.conversationId).toBe("conv-123")
  })

  it("rejects anonId that is not a UUID", () => {
    expect(() =>
      chatRequestSchema.parse({
        messages: [{ id: "m1", role: "user", content: "hi" }],
        anonId: "not-a-uuid",
      }),
    ).toThrow()
  })
})
