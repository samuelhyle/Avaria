/**
 * Input guardrails — light pre-flight checks before the agent loop runs.
 *
 * Phase A6 keeps this simple and regex-driven. Phase A7 may layer in an
 * LLM-based classifier for borderline cases.
 *
 * Returns `null` when the input is clean; otherwise an object with the
 * reason + a user-facing refusal message.
 */

export interface InputRefusal {
  reason: "too_long" | "empty" | "abuse" | "injection" | "off_topic_medical_advice" | "pii_request"
  userMessage: string
  /** If true, the agent loop is skipped entirely — the route sends the
   *  refusal directly to the client as a single `text` event. */
  hard: boolean
}

const ABUSE_PATTERNS: RegExp[] = [
  /\b(kys|fuck|shit|cunt|asshole|bastard|damn)\w*\b/i, // crude — adjust per locale
]

/** Prompt-injection / system-override attempts. */
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore (?:all )?(?:previous|prior|above) (?:instructions|prompts|rules)\b/i,
  /\bdisregard (?:your|the) (?:system|developer) (?:prompt|instructions)\b/i,
  /\byou (?:are|'re) (?:now|actually) (?:a|an) [^\s]+/i,
  /\bsystem\s*:\s*[^\n]+/i,
  /\bforget (?:everything|all|that)\b.*\b(start over|from scratch)\b/i,
  /<\|im_start\|>|<\|im_end\|>/,
]

/** User asking the model to violate its medical / research-only guardrail. */
const MEDICAL_BYPASS_PATTERNS: RegExp[] = [
  /\b(ignore|forget|bypass|override) (?:the )?(?:research[- ]only|research use|safety) (?:rule|disclaimer|guideline)\b/i,
  /\bpretend (?:you'?re|to be) (?:a|an) (?:doctor|physician|clinician)\b/i,
  /\bforget (?:you'?re|that you'?re) (?:a research assistant|a concierge)\b/i,
]

/** User trying to elicit other users' PII. */
const PII_PROBE_PATTERNS: RegExp[] = [
  /\b(show|give|tell|list|leak) (?:me )?(?:other|customers?|users?)'?s? (?:emails?|addresses?|orders?|data|passwords?)\b/i,
]

const MAX_INPUT_LEN = 4000

export function preflightInput(text: string, locale: string): InputRefusal | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return {
      reason: "empty",
      hard: true,
      userMessage:
        locale === "de"
          ? "Wie kann ich dir helfen?"
          : locale === "fi"
            ? "Miten voin auttaa?"
            : locale === "sv"
              ? "Hur kan jag hjälpa dig?"
              : locale === "nl"
                ? "Hoe kan ik je helpen?"
                : "How can I help?",
    }
  }

  if (trimmed.length > MAX_INPUT_LEN) {
    return {
      reason: "too_long",
      hard: true,
      userMessage:
        locale === "de"
          ? "Diese Nachricht ist zu lang. Bitte fasse dich auf unter 4000 Zeichen."
          : "This message is too long. Please keep it under 4000 characters.",
    }
  }

  if (INJECTION_PATTERNS.some((rx) => rx.test(trimmed))) {
    return {
      reason: "injection",
      hard: false,
      userMessage:
        locale === "de"
          ? "Ich antworte nur zu AverianLabs-Produkten und Forschungsfragen. Wie kann ich dir mit dem Katalog helfen?"
          : "I only respond to AverianLabs products and research questions. How can I help you with the catalog?",
    }
  }

  if (ABUSE_PATTERNS.some((rx) => rx.test(trimmed))) {
    return {
      reason: "abuse",
      hard: false,
      userMessage:
        locale === "de"
          ? "Bitte höflich bleiben — ich bin hier, um zu helfen."
          : "Please keep it civil — I'm here to help.",
    }
  }

  if (MEDICAL_BYPASS_PATTERNS.some((rx) => rx.test(trimmed))) {
    return {
      reason: "off_topic_medical_advice",
      hard: false,
      userMessage:
        locale === "de"
          ? "Ich kann keine medizinischen Ratschläge geben. AverianLabs-Produkte sind ausschließlich für die Laborforschung."
          : "I can't give medical advice. AverianLabs products are strictly for laboratory research.",
    }
  }

  if (PII_PROBE_PATTERNS.some((rx) => rx.test(trimmed))) {
    return {
      reason: "pii_request",
      hard: false,
      userMessage:
        locale === "de"
          ? "Ich kann nur Informationen zu deinen eigenen Bestellungen geben. Möchtest du deine Bestellung einsehen?"
          : "I can only share information about your own orders. Would you like me to look up your order?",
    }
  }

  return null
}
