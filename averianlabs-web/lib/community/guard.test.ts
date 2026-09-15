import { describe, expect, it } from "vitest"
import { type GuardResult, checkText, normalizeTitle, sanitize, slugifyTitle } from "./guard"

describe("checkText", () => {
  describe("empty / very short bodies", () => {
    it("blocks empty body", () => {
      const r = checkText("")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("empty")
    })

    it("blocks whitespace-only body", () => {
      const r = checkText("   \n\n  ")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("empty")
    })

    it("warns on very short body", () => {
      const r = checkText("hi")
      expect(r.ruleCodes).toContain("low_effort")
      // 2-char body has no sourcing/contact violations, so it should be a warn
      expect(["warn", "allow"]).toContain(r.verdict)
    })

    it("allows a clean short body without sourcing/contact patterns", () => {
      const r = checkText("BPC-157 in vitro")
      expect(r.verdict).not.toBe("block")
      expect(r.ruleCodes).not.toContain("email")
      expect(r.ruleCodes).not.toContain("phone")
    })
  })

  describe("sourcing patterns", () => {
    it.each([
      ["where can i buy this", "sourcing_question"],
      ["Where can we get BPC?", "sourcing_question"],
      ["DM me on telegram", "external_contact"],
      ["Add me on WhatsApp", "external_contact"],
      ["link in bio for 20% off", "solicitation"],
      ["DMs open, hit me up", "solicitation"],
      ["use discount code PEPTIDE20", "discount_promo"],
      ["PROMO XYZ123 works", "discount_promo"],
      ["referral code + affiliate link", "referral_attempt"],
    ])("flags %j", (text, code) => {
      const r = checkText(text)
      expect(r.ruleCodes).toContain(code)
    })

    it("blocks on contact-info violations", () => {
      const r = checkText("Email me at john@example.com")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("email")
    })

    it("blocks on phone numbers", () => {
      const r = checkText("Call me at +1 555 123 4567")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("phone")
    })

    it("blocks on crypto addresses", () => {
      const r = checkText("Send to 0x1234567890abcdef1234567890abcdef12345678")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("crypto_address")
    })
  })

  describe("URL limits", () => {
    it("allows up to 2 URLs", () => {
      const r = checkText("See https://a.com and https://b.com for context.")
      expect(r.ruleCodes).not.toContain("url_spam")
    })

    it("warns on 3+ URLs", () => {
      const r = checkText("Links: https://a.com https://b.com https://c.com https://d.com")
      expect(r.ruleCodes).toContain("url_spam")
    })
  })

  describe("dangerous claims", () => {
    it("blocks on cancer cure claim", () => {
      const r = checkText("This peptide cures cancer")
      expect(r.verdict).toBe("block")
      expect(r.ruleCodes).toContain("dangerous_claim")
    })

    it("blocks on Parkinson prevention claim", () => {
      const r = checkText("BPC prevents Parkinson's")
      expect(r.verdict).toBe("block")
    })

    it("warns on cycle/PCT terminology", () => {
      const r = checkText("Running a 12-week PCT cycle")
      expect(r.ruleCodes).toContain("cycle_termin")
    })
  })

  describe("clean content", () => {
    it("allows a normal research post", () => {
      const r: GuardResult = checkText(
        "We've seen fibroblast outgrowth in the BPC-157 + TB-500 combo wells across n=3 replicates.",
      )
      expect(r.verdict).toBe("allow")
      expect(r.ruleCodes).toHaveLength(0)
    })

    it("returns a note when verdict is allow (empty string)", () => {
      const r = checkText("This is a normal research post about peptide science.")
      expect(r.note).toBe("")
    })
  })

  describe("determinism", () => {
    it("returns the same verdict for the same input", () => {
      const a = checkText("Where can I buy BPC-157? DM me.")
      const b = checkText("Where can I buy BPC-157? DM me.")
      expect(a).toEqual(b)
    })
  })
})

describe("sanitize", () => {
  it("strips script tags", () => {
    expect(sanitize("hello <script>alert(1)</script> world")).toBe("hello world")
  })

  it("strips HTML tags", () => {
    expect(sanitize("<b>bold</b> text")).toBe("bold text")
  })

  it("collapses whitespace", () => {
    expect(sanitize("a    b\n\n\tc")).toBe("a b c")
  })
})

describe("normalizeTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeTitle("  hello    world  ")).toBe("hello world")
  })

  it("strips unsafe characters but keeps punctuation", () => {
    expect(normalizeTitle("BPC-157: what's it do?")).toBe("BPC-157: what's it do?")
  })

  it("truncates to 140 chars", () => {
    const t = "a".repeat(141)
    const out = normalizeTitle(t)
    expect(out.length).toBeLessThanOrEqual(140)
  })
})

describe("slugifyTitle", () => {
  it("produces a lowercase, hyphenated slug with random suffix", () => {
    const s = slugifyTitle("BPC-157 Mechanism")
    expect(s).toMatch(/^bpc-157-mechanism-[a-z0-9]+$/)
  })

  it("handles empty titles with a fallback", () => {
    const s = slugifyTitle("")
    expect(s).toMatch(/^thread-[a-z0-9]+$/)
  })

  it("strips combining marks via NFKD", () => {
    const s = slugifyTitle("Café Épithalon")
    expect(s.startsWith("cafe") || s.startsWith("caf-")).toBe(true)
    expect(s).not.toMatch(/é|è/i)
  })

  it("caps the slug body at 80 chars before suffix", () => {
    const long = "a".repeat(120)
    const s = slugifyTitle(long)
    // body + suffix "-xxxxx" — body must be ≤ 80
    const body = s.split("-").slice(0, -1).join("-")
    expect(body.length).toBeLessThanOrEqual(80)
  })
})
