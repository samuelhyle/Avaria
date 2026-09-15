/**
 * Golden evaluation set for Averia retrieval.
 *
 * Each entry pairs a natural-language query (in the locale being tested)
 * with the set of source ids expected to surface in the top-K results. The
 * eval runner measures recall@K against this set.
 *
 * Entries are generated from the live catalog (literal-name queries in every
 * launch locale) plus hand-written intent queries that cover research goals,
 * pricing, storage, and specs. Keeping the literal queries generated means the
 * goldens can never drift from the catalog again.
 */

import { products } from "@/lib/products/data"
import type { Locale as ProductLocale } from "@/lib/products/types"

export interface GoldenEntry {
  /** Locale the query is written in. */
  locale: ProductLocale
  query: string
  /** `sourceId` values (product slug) expected to appear in top-6. */
  expectSourceIds: string[]
  /** Optional note for reviewers. */
  note?: string
}

// ── Hand-written intent queries ────────────────────────────────────────────
const INTENT_GOLDEN: GoldenEntry[] = [
  // English
  {
    locale: "en",
    query: "Which peptide helps with tendon recovery research?",
    expectSourceIds: ["bpc-157", "bpc-tb-blend"],
  },
  {
    locale: "en",
    query: "Do you have anything for metabolic research?",
    expectSourceIds: ["retatrutide", "aod-9604"],
    note: "Goal vocabulary should map to the metabolic category.",
  },
  {
    locale: "en",
    query: "What do you have for skin and collagen research?",
    expectSourceIds: ["ghk-cu", "melanotan-i", "melanotan-ii"],
    note: "Cosmetic goal vocabulary.",
  },
  {
    locale: "en",
    query: "Best peptides for memory and focus research",
    expectSourceIds: ["selank", "semax"],
  },
  {
    locale: "en",
    query: "Which products support longevity research?",
    expectSourceIds: ["nad-plus", "mots-c", "ghk-cu"],
  },
  {
    locale: "en",
    query: "I need bacteriostatic water for reconstitution",
    expectSourceIds: ["bac-water"],
  },
  {
    locale: "en",
    query: "What is the HPLC purity of your BPC-157?",
    expectSourceIds: ["bpc-157"],
  },
  {
    locale: "en",
    query: "How should I store GHK-Cu?",
    expectSourceIds: ["ghk-cu"],
  },
  {
    locale: "en",
    query: "What vial sizes and prices does CJC-1295 come in?",
    expectSourceIds: ["cjc-1295"],
  },
  {
    locale: "en",
    query: "Is your Semax batch mass-spec confirmed?",
    expectSourceIds: ["semax"],
  },
  // Finnish
  {
    locale: "fi",
    query: "Mitä peptidiä suosittelet jänteiden tutkimukseen?",
    expectSourceIds: ["bpc-157", "bpc-tb-blend"],
  },
  {
    locale: "fi",
    query: "Onko teillä tuotetta ihon ja kollageenin tutkimukseen?",
    expectSourceIds: ["ghk-cu"],
  },
  {
    locale: "fi",
    query: "Mikä on BPC-157:n varastointilämpötila?",
    expectSourceIds: ["bpc-157"],
  },
  // German
  {
    locale: "de",
    query: "Welches Peptid eignet sich für die Sehnenforschung?",
    expectSourceIds: ["bpc-157", "bpc-tb-blend"],
  },
  {
    locale: "de",
    query: "Wie hoch ist die HPLC-Reinheit Ihres Retatrutide?",
    expectSourceIds: ["retatrutide"],
  },
  {
    locale: "de",
    query: "Welche Produkte gibt es für die metabolische Forschung?",
    expectSourceIds: ["retatrutide", "aod-9604"],
  },
  // Swedish
  {
    locale: "sv",
    query: "Vilken peptid rekommenderar ni för senforskning?",
    expectSourceIds: ["bpc-157", "bpc-tb-blend"],
  },
  {
    locale: "sv",
    query: "Vad är renheten för era Selank-prover?",
    expectSourceIds: ["selank"],
  },
  {
    locale: "sv",
    query: "Hur förvaras NAD+?",
    expectSourceIds: ["nad-plus"],
  },
  // Dutch
  {
    locale: "nl",
    query: "Welk peptide is geschikt voor peesonderzoek?",
    expectSourceIds: ["bpc-157", "bpc-tb-blend"],
  },
  {
    locale: "nl",
    query: "Wat is de zuiverheid van jullie GHK-Cu?",
    expectSourceIds: ["ghk-cu"],
  },
  {
    locale: "nl",
    query: "Welke verpakkingsgroottes heeft Melanotan II?",
    expectSourceIds: ["melanotan-ii"],
  },
]

// ── Generated literal-name queries (one phrasing per locale) ───────────────
const LITERAL_PHRASES: Record<ProductLocale, (name: string) => string[]> = {
  en: (name) => [
    `Tell me about ${name}`,
    `What is the purity of ${name}?`,
    `What vial sizes does ${name} come in?`,
  ],
  fi: (name) => [
    `Kerro minulle ${name}-tuotteesta`,
    `Mikä on ${name}-tuotteen puhtaus?`,
    `Mitkä pullokoot ${name}-tuotteesta on saatavilla?`,
  ],
  de: (name) => [
    `Erzähl mir mehr über ${name}`,
    `Wie hoch ist die Reinheit von ${name}?`,
    `Welche Füllgrößen gibt es von ${name}?`,
  ],
  sv: (name) => [
    `Berätta om ${name}`,
    `Vad är renheten för ${name}?`,
    `Vilka flaskstorlekar finns ${name} i?`,
  ],
  nl: (name) => [
    `Vertel me over ${name}`,
    `Wat is de zuiverheid van ${name}?`,
    `Welke flesformaten zijn er van ${name}?`,
  ],
}

const LOCALES: ProductLocale[] = ["en", "fi", "de", "sv", "nl"]

const GENERATED_GOLDEN: GoldenEntry[] = LOCALES.flatMap((locale) =>
  products.flatMap((product) =>
    LITERAL_PHRASES[locale](product.defaultTranslation.name).map<GoldenEntry>((query) => ({
      locale,
      query,
      expectSourceIds: [product.slug],
      note: "literal-name",
    })),
  ),
)

export const GOLDEN: GoldenEntry[] = [...INTENT_GOLDEN, ...GENERATED_GOLDEN]
