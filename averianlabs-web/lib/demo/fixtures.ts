/**
 * Static fixtures used when `BUILD_MODE=demo`.
 *
 * Mirrors the inline fallbacks already present in `app/[locale]/blog/*` so
 * the demo build renders identical copy without needing Sanity or Postgres.
 *
 * Kept deliberately tiny — the demo is meant to show the storefront shell,
 * not the full editorial surface.
 */
import type { BlogPostRecord } from "@/lib/blog/posts"
import type { AuthorRecord } from "@/lib/blog/authors"
import type { GlossaryTermRecord } from "@/lib/glossary/sanity"

export const DEMO_AUTHORS: AuthorRecord[] = [
  {
    id: "author-averia",
    slug: "averia-research-desk",
    name: "Averia Research Desk",
    role: "Editorial team",
    bio: "The Averia research desk writes citation-backed essays on the peptides we sell.",
    avatarUrl: null,
  },
]

export const DEMO_POSTS: BlogPostRecord[] = [
  {
    slug: "bpc-157-overview",
    title: "BPC-157: a 15-amino-acid fragment and what it does in tissue models",
    excerpt:
      "We review the in-vitro and in-vivo literature on BPC-157's role in angiogenesis, fibroblast activity, and the gut–tendon axis.",
    tag: "Recovery",
    publishedAt: "2026-08-12",
    readMin: 9,
    authorSlug: "averia-research-desk",
    relatedSlugs: ["tb-500-thymosin", "ghk-cu-copper"],
    body: [
      "BPC-157 (Body Protection Compound, 15 amino acids, sequence GEPPPGKPADDAGLV) was first isolated from gastric juice in the 1990s and has since accumulated a substantial preclinical literature across tissue-recovery models.",
      "Mechanistically, BPC-157 has been shown in vitro to upregulate VEGFR2 and promote angiogenesis via the eNOS pathway. In rodent tendon models, it accelerates fibroblast outgrowth; in gut models, it protects the mucosa against NSAID-induced damage.",
      "This article summarises the key papers, the assays used to verify mechanism, and where the evidence base is thinnest.",
    ],
  },
  {
    slug: "semaglutide-research",
    title: "Semaglutide: the long-acting GLP-1 analog, mechanism by mechanism",
    excerpt:
      "A walkthrough of the structural modifications that give semaglutide its 7-day half-life, and the assays used to verify it.",
    tag: "Metabolic",
    publishedAt: "2026-07-21",
    readMin: 12,
    authorSlug: "averia-research-desk",
    relatedSlugs: ["tirzepatide-dual-agonist"],
    body: [
      "Semaglutide is a 30-amino-acid peptide with two key structural modifications vs. native GLP-1: an Aib residue at position 2 (DPP-IV resistance) and a C18 diacid side chain on Lys26 (albumin binding → 7-day half-life).",
      "This article walks through each modification, the assays used to confirm pharmacokinetics, and the analytical fingerprint you'd expect to see on a high-purity batch.",
    ],
  },
  {
    slug: "tirzepatide-dual-agonist",
    title: "Tirzepatide and the GIP/GLP-1 dual-agonist story",
    excerpt:
      "How a single peptide binds two receptors — and why that matters in metabolic disease research.",
    tag: "Metabolic",
    publishedAt: "2026-07-04",
    readMin: 8,
    authorSlug: "averia-research-desk",
    relatedSlugs: ["semaglutide-research"],
    body: [
      "Tirzepatide is a 39-amino-acid synthetic peptide featuring a GIP analog conjugated to a GLP-1 analog via a C16 diacid linker.",
    ],
  },
  {
    slug: "ghk-cu-copper",
    title: "GHK-Cu and the renaissance of copper-peptide cosmetic research",
    excerpt:
      "From 1973 to 2026 — the rediscovery of a tripeptide that was always quietly working.",
    tag: "Cosmetic",
    publishedAt: "2026-06-18",
    readMin: 6,
    authorSlug: "averia-research-desk",
    relatedSlugs: ["bpc-157-overview"],
    body: [
      "Gly-His-Lys complexed with Cu²⁺ — a 401.9 Da tripeptide first noted for wound-healing properties in the 1970s.",
    ],
  },
  {
    slug: "tb-500-thymosin",
    title: "TB-500 fragment: what Thymosin β4 actually does in actin sequestration",
    excerpt:
      "The actin-binding story behind the most-studied tissue-recovery peptide fragment.",
    tag: "Recovery",
    publishedAt: "2026-06-02",
    readMin: 7,
    authorSlug: "averia-research-desk",
    relatedSlugs: ["bpc-157-overview"],
    body: ["The TB-500 fragment corresponds to the actin-binding domain of Thymosin β4 (LKKTETQ)."],
  },
  {
    slug: "epithalon-telomerase",
    title: "Epithalon and telomerase: what the 4-amino-acid tetrapeptide actually does",
    excerpt:
      "Pineal-gland research, telomerase expression, and the limits of what a 4-amino-acid tetrapeptide can claim.",
    tag: "Longevity",
    publishedAt: "2026-05-20",
    readMin: 10,
    authorSlug: "averia-research-desk",
    relatedSlugs: [],
    body: ["Ala-Glu-Asp-Gly — a tetrapeptide originally isolated from pineal-gland extract."],
  },
]

export const DEMO_GLOSSARY: GlossaryTermRecord[] = [
  {
    _id: "glossary-hplc",
    term: "HPLC",
    slug: "hplc",
    category: "analytical",
    shortDefinition:
      "High-performance liquid chromatography — the primary purity assay for research peptides.",
    body: [],
    synonyms: ["high-performance liquid chromatography"],
  },
  {
    _id: "glossary-coa",
    term: "COA",
    slug: "coa",
    category: "compliance",
    shortDefinition:
      "Certificate of Analysis — the batch-specific document listing purity, identity, and endotoxin results.",
    body: [],
    synonyms: ["certificate of analysis"],
  },
  {
    _id: "glossary-endotoxin",
    term: "Endotoxin",
    slug: "endotoxin",
    category: "analytical",
    shortDefinition:
      "Lipopolysaccharide (LPS) from Gram-negative bacterial cell walls; measured in EU/mg via LAL assay.",
    body: [],
    synonyms: ["LPS"],
  },
  {
    _id: "glossary-lyophilized",
    term: "Lyophilized",
    slug: "lyophilized",
    category: "chemistry",
    shortDefinition: "Freeze-dried into a stable powder for cold-chain storage and shipping.",
    body: [],
  },
  {
    _id: "glossary-reconstitution",
    term: "Reconstitution",
    slug: "reconstitution",
    category: "chemistry",
    shortDefinition:
      "Dissolving a lyophilized peptide in bacteriostatic water (or another sterile diluent) before use.",
    body: [],
  },
  {
    _id: "glossary-bac-water",
    term: "BAC water",
    slug: "bac-water",
    category: "product",
    shortDefinition:
      "Bacteriostatic water for injection — 0.9% benzyl alcohol, used as the standard reconstitution diluent.",
    body: [],
  },
  {
    _id: "glossary-cold-chain",
    term: "Cold chain",
    slug: "cold-chain",
    category: "logistics",
    shortDefinition: "Temperature-controlled shipping and storage; required for most lyophilized peptides.",
    body: [],
  },
  {
    _id: "glossary-research-use-only",
    term: "Research use only",
    slug: "research-use-only",
    category: "regulatory",
    shortDefinition:
      "Labeling required for compounds sold for laboratory research and in-vitro studies only.",
    body: [],
    synonyms: ["RUO"],
  },
]