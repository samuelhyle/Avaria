/**
 * `lib/calculator/saturation.ts` — solubility ceilings for the catalog.
 *
 * Most research peptides have a published "max working concentration" in
 * aqueous solution. Past this ceiling they form gels, fail to fully
 * dissolve, or crash out within hours. The on-page calculator surfaces a
 * saturation warning whenever `mg/mL > ceiling`.
 *
 * The numbers below come from the catalogue product specs (Eurofins /
 * Biolab / Synlab sheets) and the published literature. Where a peptide
 * doesn't have a public ceiling we default to a conservative 10 mg/mL.
 */

export interface SaturationProfile {
  slug: string
  /** Practical upper limit in mg/mL. Above this, plan a dilution. */
  ceilingMgPerMl: number
  /** One-line human note, surfaced on the saturation banner. */
  note?: string
}

const FALLBACK_CEILING = 10

const TABLE: Record<string, SaturationProfile> = {
  "bac-water": { slug: "bac-water", ceilingMgPerMl: 1000, note: "Solvent — no peptide ceiling applies." },
  "bpc-157": { slug: "bpc-157", ceilingMgPerMl: 5, note: "BPC-157 precipitates as a translucent gel above ~5 mg/mL." },
  "bpc-tb-blend": { slug: "bpc-tb-blend", ceilingMgPerMl: 5 },
  selank: { slug: "selank", ceilingMgPerMl: 5, note: "Selank tolerates up to ~5 mg/mL in sterile water; slightly less in BAC water." },
  semax: { slug: "semax", ceilingMgPerMl: 5 },
  retatrutide: { slug: "retatrutide", ceilingMgPerMl: 10, note: "Retatrutide remains soluble up to ~10 mg/mL in BAC water." },
  tirzepatide: { slug: "tirzepatide", ceilingMgPerMl: 20 },
  "ghk-cu": { slug: "ghk-cu", ceilingMgPerMl: 3, note: "GHK-Cu is the most finicky — copper(II) precipitates above ~3 mg/mL." },
  "nad-plus": { slug: "nad-plus", ceilingMgPerMl: 100, note: "NAD+ tolerates up to 100 mg/mL. Above this, viscosity makes draws inaccurate." },
  "cjc-1295": { slug: "cjc-1295", ceilingMgPerMl: 5 },
  "aod-9604": { slug: "aod-9604", ceilingMgPerMl: 5 },
  "hgh-frag-176-191": { slug: "hgh-frag-176-191", ceilingMgPerMl: 5, note: "Fragment 176-191 is hydrophobic — dissolve with a few drops of BAC water first." },
  "melanotan-i": { slug: "melanotan-i", ceilingMgPerMl: 5 },
  "melanotan-ii": { slug: "melanotan-ii", ceilingMgPerMl: 5 },
  "mots-c": { slug: "mots-c", ceilingMgPerMl: 5 },
  klow: { slug: "klow", ceilingMgPerMl: 5 },
  glutathione: { slug: "glutathione", ceilingMgPerMl: 50 },
  ipamorelin: { slug: "ipamorelin", ceilingMgPerMl: 5 },
  "tesamorelin": { slug: "tesamorelin", ceilingMgPerMl: 5 },
}

export function getCeilingFor(slug?: string | null): SaturationProfile {
  if (slug && TABLE[slug]) return TABLE[slug]!
  return { slug: slug ?? "default", ceilingMgPerMl: FALLBACK_CEILING }
}

export interface SaturationWarning {
  level: "ok" | "caution" | "above"
  ceiling: SaturationProfile
  ratio: number // concentration / ceiling
}

export function checkSaturation(
  concentrationMgPerMl: number,
  slug?: string | null,
): SaturationWarning {
  const ceiling = getCeilingFor(slug)
  if (!Number.isFinite(concentrationMgPerMl) || concentrationMgPerMl <= 0) {
    return { level: "ok", ceiling, ratio: 0 }
  }
  const ratio = concentrationMgPerMl / ceiling.ceilingMgPerMl
  const level = ratio > 1 ? "above" : ratio > 0.75 ? "caution" : "ok"
  return { level, ceiling, ratio }
}
