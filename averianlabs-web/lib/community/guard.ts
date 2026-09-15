/**
 * Lexical guard — Layer 1 of the three-layer moderation pipeline.
 */
export type Verdict = "allow" | "warn" | "block"

export interface GuardResult {
  verdict: Verdict
  ruleCodes: string[]
  note: string
}

const SOURCING_PATTERNS: { rx: RegExp; code: string }[] = [
  { rx: /\bwhere (can|do) (i|you|we) (buy|get|order|source|find)\b/i, code: "sourcing_question" },
  {
    rx: /\b(telegram|whatsapp|signal|wickr|discord)\s*(@|me|handle)?\b/i,
    code: "external_contact",
  },
  { rx: /\b(check (my|the) bio|link in (my |the )?bio|dms? open)\b/i, code: "solicitation" },
  {
    rx: /\bdiscount code\b|\bcoupon code\b|\bpromo(?: code)?\s+[A-Z0-9]{3,}\b/i,
    code: "discount_promo",
  },
  { rx: /\breferral\b.*\bcode\b|\baffiliate\b.*\blink\b/i, code: "referral_attempt" },
]

const CONTACT_PATTERNS: { rx: RegExp; code: string }[] = [
  { rx: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, code: "email" },
  { rx: /\+?\d[\d\s().-]{8,}\d/, code: "phone" },
  { rx: /\b(?:0x)?[0-9a-fA-F]{40,}\b/, code: "crypto_address" },
]

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi

const HEAVY_HIT_PATTERNS: { rx: RegExp; code: string }[] = [
  {
    rx: /\b(?:treating|cures?|heals?|prevents?)\s+(cancer|tumou?r|alzheimer|parkinson|diabetes|hiv|aids)\b/i,
    code: "dangerous_claim",
  },
  { rx: /\b(?:cycle|pct|blast|cruise)\b/i, code: "cycle_termin" },
]

export function checkText(text: string): GuardResult {
  const ruleCodes: string[] = []
  const notes: string[] = []

  for (const { rx, code } of SOURCING_PATTERNS) {
    if (rx.test(text)) {
      ruleCodes.push(code)
      notes.push("Procurement or solicitation language is not allowed.")
    }
  }

  for (const { rx, code } of CONTACT_PATTERNS) {
    if (rx.test(text)) {
      ruleCodes.push(code)
      notes.push("Posting contact information is not allowed.")
    }
  }

  const urls = text.match(URL_PATTERN) ?? []
  if (urls.length > 2) {
    ruleCodes.push("url_spam")
    notes.push("Too many links.")
  }

  for (const { rx, code } of HEAVY_HIT_PATTERNS) {
    if (rx.test(text)) {
      ruleCodes.push(code)
      notes.push("Content requires human review.")
    }
  }

  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { verdict: "block", ruleCodes: ["empty"], note: "Post body is empty." }
  }
  if (trimmed.length < 10) {
    ruleCodes.push("low_effort")
    notes.push("Post is very short.")
  }

  const hardCodes = [
    "dangerous_claim",
    "email",
    "phone",
    "crypto_address",
    "external_contact",
    "solicitation",
  ]
  if (ruleCodes.some((c) => hardCodes.includes(c))) {
    return { verdict: "block", ruleCodes, note: notes[0] ?? "Blocked by lexical guard." }
  }

  if (ruleCodes.length === 0) return { verdict: "allow", ruleCodes: [], note: "" }
  return { verdict: "warn", ruleCodes, note: notes[0] ?? "Flagged for review." }
}

export function sanitize(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeTitle(input: string): string {
  return (
    input
      .trim()
      .replace(/\s+/g, " ")
      // Strip control chars + symbols that don't belong in a thread title.
      // Apostrophes/quotes kept via explicit allowlist; emoji/special punctuation removed.
      .replace(/[^\p{L}\p{N}\s\-_.,!?:'"`’“”]/gu, "")
      .slice(0, 140)
  )
}

export function slugifyTitle(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : `thread-${suffix}`
}
