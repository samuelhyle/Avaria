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
  // Bare "show me other emails" — handled by the `(other|...)` branch.
  /\b(show|give|tell|list|leak) (?:me )?(?:other|customers?|users?)'?s? (?:emails?|addresses?|orders?|data|passwords?)\b/i,
  // Possessive phrasing like "other customers' emails" — without this branch
  // the regex backtracks and the probe slips through.
  /\b(show|give|tell|list|leak) (?:me )?(?:other\s+)?(?:customers?|users?)'\s?s?\s+(?:emails?|addresses?|orders?|data|passwords?)\b/i,
  // Two-noun phrasing like "show me other customers emails" (no apostrophe) —
  // catches probes where the model is asked for someone else's data without
  // the possessive marker.
  /\b(show|give|tell|list|leak) (?:me )?other\s+(?:customers?|users?)\s+(?:emails?|addresses?|orders?|data|passwords?)\b/i,
]

const MAX_INPUT_LEN = 4000

/**
 * Per-locale copy for each refusal reason. Defaulting to English keeps us
 * from shipping empty/missing strings when an unknown locale is sent — and
 * means we never repeat the German/Finnish/Swedish/Dutch messages everywhere.
 */
const REFUSAL_COPY: Record<string, Partial<Record<InputRefusal["reason"], string>>> = {
  en: {
    empty: "How can I help?",
    too_long: "This message is too long. Please keep it under 4000 characters.",
    injection:
      "I only respond to AverianLabs products and research questions. How can I help you with the catalog?",
    abuse: "Please keep it civil — I'm here to help.",
    off_topic_medical_advice:
      "I can't give medical advice. AverianLabs products are strictly for laboratory research.",
    pii_request:
      "I can only share information about your own orders. Would you like me to look up your order?",
  },
  de: {
    empty: "Wie kann ich dir helfen?",
    too_long: "Diese Nachricht ist zu lang. Bitte fasse dich auf unter 4000 Zeichen.",
    injection:
      "Ich antworte nur zu AverianLabs-Produkten und Forschungsfragen. Wie kann ich dir mit dem Katalog helfen?",
    abuse: "Bitte höflich bleiben — ich bin hier, um zu helfen.",
    off_topic_medical_advice:
      "Ich kann keine medizinischen Ratschläge geben. AverianLabs-Produkte sind ausschließlich für die Laborforschung.",
    pii_request:
      "Ich kann nur Informationen zu deinen eigenen Bestellungen geben. Möchtest du deine Bestellung einsehen?",
  },
  fi: {
    empty: "Miten voin auttaa?",
    too_long: "Viesti on liian pitkä. Pidä se alle 4000 merkissä.",
    injection:
      "Vastaan vain AverianLabs-tuotteita ja tutkimuskysymyksiä koskeviin kysymyksiin. Miten voin auttaa sinua valikoiman kanssa?",
    abuse: "Pyydän kohteliasta keskustelutapaa — olen täällä auttamassa.",
    off_topic_medical_advice:
      "En voi antaa lääketieteellisiä neuvoja. AverianLabs-tuotteet on tarkoitettu vain laboratoriotutkimukseen.",
    pii_request:
      "Voin kertoa vain sinun omista tilauksistasi. Haluatko, että haen tilauksesi tiedot?",
  },
  sv: {
    empty: "Hur kan jag hjälpa dig?",
    too_long: "Meddelandet är för långt. Håll det under 4000 tecken.",
    injection:
      "Jag svarar bara på frågor om AverianLabs produkter och forskning. Hur kan jag hjälpa dig med katalogen?",
    abuse: "Var vänlig och håll en god ton — jag finns här för att hjälpa.",
    off_topic_medical_advice:
      "Jag kan inte ge medicinsk rådgivning. AverianLabs produkter är endast avsedda för laboratorieforskning.",
    pii_request:
      "Jag kan bara dela information om dina egna beställningar. Vill du att jag hämtar din beställning?",
  },
  nl: {
    empty: "Hoe kan ik je helpen?",
    too_long: "Dit bericht is te lang. Houd het onder de 4000 tekens.",
    injection:
      "Ik reageer alleen op AverianLabs-producten en onderzoeksvragen. Hoe kan ik je helpen met de catalogus?",
    abuse: "Blijf alsjeblieft vriendelijk — ik ben hier om te helpen.",
    off_topic_medical_advice:
      "Ik kan geen medisch advies geven. AverianLabs-producten zijn uitsluitend voor laboratoriumonderzoek.",
    pii_request:
      "Ik kan alleen informatie over je eigen bestellingen delen. Wil je dat ik je bestelling opzoek?",
  },
}

function messageFor(reason: InputRefusal["reason"], locale: string): string {
  const localized = REFUSAL_COPY[locale]?.[reason]
  if (localized) return localized
  const fallback: Partial<Record<InputRefusal["reason"], string>> | undefined = REFUSAL_COPY.en
  return fallback?.[reason] ?? ""
}

export function preflightInput(text: string, locale: string): InputRefusal | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { reason: "empty", hard: true, userMessage: messageFor("empty", locale) }
  }

  if (trimmed.length > MAX_INPUT_LEN) {
    return { reason: "too_long", hard: true, userMessage: messageFor("too_long", locale) }
  }

  if (INJECTION_PATTERNS.some((rx) => rx.test(trimmed))) {
    return { reason: "injection", hard: false, userMessage: messageFor("injection", locale) }
  }

  if (ABUSE_PATTERNS.some((rx) => rx.test(trimmed))) {
    return { reason: "abuse", hard: false, userMessage: messageFor("abuse", locale) }
  }

  if (MEDICAL_BYPASS_PATTERNS.some((rx) => rx.test(trimmed))) {
    return {
      reason: "off_topic_medical_advice",
      hard: false,
      userMessage: messageFor("off_topic_medical_advice", locale),
    }
  }

  if (PII_PROBE_PATTERNS.some((rx) => rx.test(trimmed))) {
    return { reason: "pii_request", hard: false, userMessage: messageFor("pii_request", locale) }
  }

  return null
}
