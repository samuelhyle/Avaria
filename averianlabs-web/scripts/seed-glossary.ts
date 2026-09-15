/**
 * Glossary seed — creates ~30 starter terms via Sanity.
 *
 * Usage: pnpm tsx scripts/seed-glossary.ts
 *
 * Idempotent: if a term with the same slug exists, it's skipped.
 */

import { sanity } from "../sanity/client"

interface TermSeed {
  term: string
  slug: string
  category: "analytical" | "chemistry" | "compliance" | "logistics" | "product" | "regulatory"
  shortDefinition: string
  body: string
  synonyms?: string[]
}

const SEEDS: TermSeed[] = [
  {
    term: "HPLC",
    slug: "hplc",
    category: "analytical",
    shortDefinition:
      "High-performance liquid chromatography. The primary technique used to verify peptide purity.",
    body: "HPLC separates molecules by passing a pressurized liquid mobile phase through a column packed with stationary phase. For peptides, reverse-phase HPLC with UV detection at 214 nm is the standard identity and purity check. Our minimum acceptance threshold is ≥ 98% by HPLC peak area.",
    synonyms: ["High-performance liquid chromatography"],
  },
  {
    term: "Mass spectrometry",
    slug: "mass-spectrometry",
    category: "analytical",
    shortDefinition:
      "An analytical technique that identifies molecules by measuring their mass-to-charge ratio.",
    body: "MS is paired with HPLC or used standalone (MALDI-TOF, ESI-MS) to confirm the molecular weight of a peptide. Observed mass within 0.1% of theoretical is the standard identity confirmation.",
    synonyms: ["MS", "MALDI", "ESI-MS"],
  },
  {
    term: "Endotoxin",
    slug: "endotoxin",
    category: "analytical",
    shortDefinition:
      "Lipopolysaccharide (LPS) contamination from gram-negative bacteria, measured in EU/mg.",
    body: "Endotoxin levels are measured via the LAL (limulus amebocyte lysate) assay. The accepted threshold for research-use peptides is < 5 EU/mg. Higher endotoxin confounds cell-culture work.",
    synonyms: ["LPS", "LAL"],
  },
  {
    term: "LAL assay",
    slug: "lal-assay",
    category: "analytical",
    shortDefinition:
      "Limulus amebocyte lysate assay — the FDA-recognised method for endotoxin quantitation.",
    body: "LAL reagent clots in the presence of bacterial endotoxin. Kinetic chromogenic LAL is the most sensitive variant and is what we use for every batch above 1 mg.",
  },
  {
    term: "Lyophilization",
    slug: "lyophilization",
    category: "logistics",
    shortDefinition:
      "Freeze-drying. The process used to convert peptide solutions into stable powder.",
    body: "Lyophilized peptides are stable at -20 °C for 24+ months. Reconstituted peptides are stable 2–4 weeks at 4 °C depending on the sequence. We ship every peptide lyophilized unless the customer explicitly orders a pre-reconstituted vial.",
    synonyms: ["freeze-drying", "lyo"],
  },
  {
    term: "Reconstitution",
    slug: "reconstitution",
    category: "logistics",
    shortDefinition:
      "Dissolving a lyophilized peptide in sterile bacteriostatic water (or other solvent) before use.",
    body: "Standard practice is to reconstitute in sterile bacteriostatic water (0.9% benzyl alcohol) for a 1 mg/mL stock. Use the reconstitution calculator to dial in your target concentration.",
  },
  {
    term: "Certificate of Analysis",
    slug: "coa",
    category: "compliance",
    shortDefinition:
      "A signed document confirming the analytical results for a specific batch of product.",
    body: "Each AverianLabs batch ships with a COA listing HPLC purity, mass-spec identity, endotoxin level, manufacture date, expiry, and the lab that performed the testing. COAs are public at /documents/[id].",
    synonyms: ["COA"],
  },
  {
    term: "Safety Data Sheet",
    slug: "sds",
    category: "compliance",
    shortDefinition:
      "Hazard identification, handling, storage, and disposal information for a chemical product.",
    body: "Required by OSHA / REACH for any laboratory chemical. Our SDSes cover handling under BSL-1 conditions, PPE recommendations, and disposal guidance per EU Directive 2008/98/EC.",
    synonyms: ["SDS", "MSDS"],
  },
  {
    term: "Purity",
    slug: "purity",
    category: "analytical",
    shortDefinition: "The percentage of target peptide in a sample, measured by HPLC peak area.",
    body: "Purity is reported as HPLC peak area %. Our minimum spec is 98% for research-grade peptides. Lower purity (95–97%) is acceptable for some applications; under 95% is rejected.",
  },
  {
    term: "CAS number",
    slug: "cas-number",
    category: "chemistry",
    shortDefinition:
      "A unique numerical identifier assigned by the Chemical Abstracts Service to every chemical substance.",
    body: "Useful for cross-referencing safety data and regulatory information. Every AverianLabs peptide has a CAS on the product page.",
    synonyms: ["CAS"],
  },
  {
    term: "Sequence",
    slug: "sequence",
    category: "chemistry",
    shortDefinition:
      "The exact amino-acid order of a peptide, written left-to-right in single-letter code.",
    body: "Every peptide has a sequence which determines structure and activity. Sequences use the standard 20 amino-acid alphabet plus modifications.",
  },
  {
    term: "Molecular weight",
    slug: "molecular-weight",
    category: "chemistry",
    shortDefinition:
      "The mass of one mole of a peptide, expressed in g/mol, calculated from its sequence.",
    body: "For peptides, MW = sum of residue masses + 18 (for water). Used in mass-spec identity confirmation and in reconstitution calculations.",
    synonyms: ["MW", "Da"],
  },
  {
    term: "BPC-157",
    slug: "bpc-157",
    category: "product",
    shortDefinition:
      "Body Protection Compound 157 — a 15-amino-acid fragment of BPC, sequence GEPPPGKPADDAGLV.",
    body: "BPC-157 has been studied in tissue-recovery and gut-mucosa models since the 1990s. Mechanism work centers on VEGFR2 upregulation and eNOS-mediated angiogenesis.",
  },
  {
    term: "TB-500",
    slug: "tb-500",
    category: "product",
    shortDefinition:
      "A synthetic fragment of Thymosin β4, sequence LKKTETQ, studied for actin sequestration.",
    body: "TB-500 corresponds to the actin-binding domain of Thymosin β4. Common in tendon-recovery research models in combination with BPC-157.",
  },
  {
    term: "GHK-Cu",
    slug: "ghk-cu",
    category: "product",
    shortDefinition:
      "A copper-binding tripeptide (Gly-His-Lys + Cu²⁺) first noted for wound-healing properties.",
    body: "GHK-Cu has a renaissance in cosmetic research. The 401.9 Da tripeptide has documented effects on collagen synthesis, angiogenesis, and tissue remodeling.",
  },
  {
    term: "Semaglutide",
    slug: "semaglutide",
    category: "product",
    shortDefinition: "A 30-amino-acid GLP-1 analog with a 7-day half-life from albumin binding.",
    body: "Semaglutide's two key structural modifications vs. native GLP-1: Aib at position 2 (DPP-IV resistance) and a C18 diacid on Lys26 (albumin binding).",
  },
  {
    term: "Tirzepatide",
    slug: "tirzepatide",
    category: "product",
    shortDefinition:
      "A 39-amino-acid synthetic GIP/GLP-1 dual-agonist peptide with a C16 diacid linker.",
    body: "Tirzepatide is the first dual-agonist peptide to reach advanced clinical research. Binds both GIP-R and GLP-1-R.",
  },
  {
    term: "Retatrutide",
    slug: "retatrutide",
    category: "product",
    shortDefinition: "A tri-agonist peptide targeting GIP, GLP-1, and glucagon receptors.",
    body: "Retatrutide adds glucagon-receptor agonism on top of the GIP/GLP-1 dual mechanism, broadening the metabolic research scope.",
  },
  {
    term: "EU research-use regulation",
    slug: "eu-research-use",
    category: "regulatory",
    shortDefinition:
      "The European framework governing the sale and use of research-grade peptides not approved as medicines.",
    body: "Under EU MDR (Regulation 2017/745) and the research-use exemption, peptides sold for in-vitro laboratory research are not medicinal products. Each product page carries the research-use disclaimer.",
  },
  {
    term: "Intended use",
    slug: "intended-use",
    category: "regulatory",
    shortDefinition: "The documented purpose of a product — what it may and may not be used for.",
    body: "For AverianLabs peptides, intended use is strictly laboratory research and in-vitro studies. Human or veterinary consumption is explicitly excluded.",
  },
  {
    term: "Classification",
    slug: "classification",
    category: "regulatory",
    shortDefinition:
      "The regulatory category a substance falls under (research chemical, API, investigational medicinal product, etc.).",
    body: "Our peptides are classified as research-use laboratory chemicals, not APIs. This classification determines labeling, shipping requirements, and permissible use.",
  },
  {
    term: "Market eligibility",
    slug: "eligibility",
    category: "regulatory",
    shortDefinition: "Whether a country permits the sale and import of a research peptide.",
    body: "Some countries (per regulatory drift) restrict certain peptide categories. Eligibility is checked at checkout. See /lab-tests/eligibility for the live matrix.",
  },
  {
    term: "Batch release",
    slug: "batch-release",
    category: "compliance",
    shortDefinition: "The point at which a manufactured batch passes QA and is approved for sale.",
    body: "A batch release is signed by the QA officer after COA, endotoxin, mass-spec, and sterility results are reviewed. Released batches carry a unique code on the label.",
  },
  {
    term: "Peptide bond",
    slug: "peptide-bond",
    category: "chemistry",
    shortDefinition: "The amide bond linking two amino acids in a peptide chain.",
    body: "Formed between the carboxyl group of one residue and the amino group of the next, releasing water. Solid-phase peptide synthesis builds the chain C-to-N terminus.",
  },
  {
    term: "AUC",
    slug: "auc",
    category: "analytical",
    shortDefinition: "Area under the curve — used to quantify HPLC peak purity by integration.",
    body: "HPLC purity is reported as the AUC of the main peak divided by the total AUC of all detected peaks. Typical acceptance: main peak ≥ 98%.",
    synonyms: ["area under the curve"],
  },
  {
    term: "Cmax",
    slug: "cmax",
    category: "analytical",
    shortDefinition:
      "Peak plasma concentration of a substance after administration — used in PK modeling.",
    body: "Cmax is one of the standard pharmacokinetic endpoints. Reported alongside Tmax and AUC in published studies.",
  },
  {
    term: "Subcutaneous",
    slug: "subcutaneous",
    category: "chemistry",
    shortDefinition: "Beneath the skin — common route of administration for peptide injectables.",
    body: "Subcutaneous injection (SC) routes substances into the fatty tissue just below the dermis. Slower absorption than IV but faster than oral for most peptides.",
    synonyms: ["SC"],
  },
  {
    term: "Purity threshold",
    slug: "purity-threshold",
    category: "compliance",
    shortDefinition: "The minimum HPLC purity below which a batch is rejected.",
    body: "Our acceptance threshold is ≥ 98% for primary catalog peptides and ≥ 95% for accessory peptides. Lower than this and the batch is destroyed.",
  },
  {
    term: "Storage temperature",
    slug: "storage-temperature",
    category: "logistics",
    shortDefinition: "The temperature at which a peptide must be stored to maintain stability.",
    body: "Lyophilized peptides: -20 °C for long-term, 4 °C for short-term. Reconstituted: 4 °C for 2–4 weeks. Avoid freeze-thaw cycles.",
  },
  {
    term: "Research-use only disclaimer",
    slug: "research-disclaimer",
    category: "compliance",
    shortDefinition:
      "A mandatory statement that a product is intended for laboratory research only.",
    body: "Every product page, COA, SDS, and email footer carries the research-use disclaimer. It is not a marketing slogan — it is a regulatory requirement.",
  },
  {
    term: "Purity specification",
    slug: "purity-spec",
    category: "product",
    shortDefinition: "The documented purity range a specific product SKU is tested against.",
    body: "Listed on each product page and on the COA. Acceptance criteria differ by SKU: 98% for primary catalog, 95% for accessories.",
  },
]

async function main() {
  console.log("🌱 Seeding Sanity glossary terms…")
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ""
  if (!projectId) {
    console.error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Aborting.")
    process.exit(1)
  }
  let created = 0
  let skipped = 0
  for (const seed of SEEDS) {
    const existing = await sanity.fetch<{ _id: string } | null>(
      `*[_type == "glossaryTerm" && slug.current == $slug][0]{ _id }`,
      { slug: seed.slug },
    )
    if (existing) {
      skipped++
      continue
    }
    await sanity.create({
      _type: "glossaryTerm",
      term: seed.term,
      slug: { _type: "slug", current: seed.slug },
      category: seed.category,
      shortDefinition: seed.shortDefinition,
      body: [
        {
          _type: "block",
          _key: seed.slug,
          style: "normal",
          markDefs: [],
          children: [{ _type: "span", _key: `${seed.slug}-s`, marks: [], text: seed.body }],
        },
      ],
      synonyms: seed.synonyms ?? [],
    })
    created++
    console.log(`  ✓ ${seed.term}`)
  }
  console.log(
    `✅ Done. Created ${created}, skipped ${skipped}. (${SEEDS.length} total in dataset "${dataset}")`,
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
