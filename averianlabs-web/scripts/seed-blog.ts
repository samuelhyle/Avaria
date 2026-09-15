import { createClient } from "next-sanity"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"
const token = process.env.SANITY_API_TOKEN

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-01-01",
  useCdn: false,
  token,
})

const blogPosts = [
  {
    _type: "blogPost",
    slug: { _type: "slug", current: "bpc-157-dosage-reconstitution-guide" },
    title: "BPC-157 Dosage & Reconstitution: A Complete Research Protocol Guide",
    excerpt:
      "Step-by-step guide to reconstituting BPC-157 for laboratory research. Covers recommended solvent volumes, storage conditions, stability windows, and HPLC verification expectations.",
    tag: "Reconstitution",
    publishedAt: new Date().toISOString(),
    readMin: 8,
    content: [
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "BPC-157 (Body Protection Compound-157) is a synthetic 15-amino-acid pentadecapeptide widely studied in tissue-recovery and gut-mucosa research models. Proper reconstitution is critical for maintaining peptide integrity and ensuring reproducible results in your laboratory protocols.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "What You Need Before Reconstitution" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Before beginning reconstitution, ensure you have: sterile bacteriostatic water (0.9% benzyl alcohol), insulin syringes (typically 1 mL with 29-31G needles), alcohol wipes, and a clean laboratory workspace. All materials should be at room temperature before proceeding.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Step-by-Step Reconstitution Protocol" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "1. Clean the vial stopper with an alcohol wipe and allow to dry.\n2. Draw the appropriate volume of bacteriostatic water into your syringe.\n3. Slowly inject the water down the side wall of the vial — avoid direct jetting onto the peptide powder.\n4. Gently swirl (do not shake) until the solution is clear and homogeneous.\n5. Store the reconstituted vial at 2-8°C and use within 30 days for optimal stability.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Recommended Solvent Volumes" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "For a 5 mg vial of BPC-157, adding 1 mL of bacteriostatic water yields a concentration of 5 mg/mL (5000 µg/mL). For a 10 mg vial, adding 2 mL yields the same concentration. This concentration is commonly used in research protocols requiring precise volumetric dosing.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Storage & Stability" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Lyophilized BPC-157 is stable at -20°C for up to 24 months. After reconstitution, store at 2-8°C and use within 30 days. Avoid freeze-thaw cycles. Always verify the batch-specific Certificate of Analysis (COA) for the exact stability data for your lot.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Verifying Purity After Reconstitution" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "AverianLabs provides batch-specific HPLC purity data and endotoxin reports with every order. If you require independent verification, you can submit a sample to an ISO 17025-certified lab such as Eurofins Biolab or Synlab. Our COAs include the batch code, manufacturing date, expiry, and full analytical panel.",
          },
        ],
        style: "normal",
      },
    ],
  },
  {
    _type: "blogPost",
    slug: { _type: "slug", current: "retatrutide-vs-semaglutide-research-comparison" },
    title: "Retatrutide vs Semaglutide: Key Differences for Metabolic Research",
    excerpt:
      "A detailed comparison of Retatrutide (triple agonist) and Semaglutide (GLP-1 agonist) for laboratory research. Covers receptor affinity, molecular structure, and research applications.",
    tag: "Comparison",
    publishedAt: new Date().toISOString(),
    readMin: 10,
    content: [
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Retatrutide and Semaglutide are both synthetic peptide analogs studied in metabolic research, but they differ significantly in their mechanism of action, receptor targets, and research applications. This comparison helps researchers choose the right compound for their experimental design.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Molecular Structure & Classification" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Semaglutide is a 31-amino-acid GLP-1 receptor agonist with an Aib substitution at position 2 and a C-18 fatty diacid side chain at Lys26. It is classified as a single-receptor agonist targeting the GLP-1 pathway.\n\nRetatrutide is a 39-amino-acid lipid-conjugated peptide that acts as a unimolecular triple agonist targeting GIP, GLP-1, and glucagon receptors simultaneously. This triple mechanism is the key differentiator in research settings.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Receptor Affinity & Mechanism" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Semaglutide selectively binds the GLP-1 receptor, activating cAMP-mediated insulin secretion pathways. Retatrutide engages three distinct receptor systems: GIP (glucose-dependent insulinotropic peptide), GLP-1, and glucagon receptors. This multi-receptor engagement is studied in models where combined metabolic signaling is of interest.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Research Applications" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "Semaglutide is primarily studied in GLP-1 pathway models, insulin signaling, and appetite-regulation research. Retatrutide is studied in triple-agonist metabolic models, lipid metabolism, and energy expenditure research. Both compounds require careful handling and storage per their COA specifications.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [{ _type: "span", text: "Purity & Quality Standards" }],
        style: "h2",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "At AverianLabs, both Retatrutide and Semaglutide are tested to ≥98% HPLC purity with endotoxin levels below 5 EU/mg. Each batch comes with a full Certificate of Analysis including mass-spec identity confirmation. All products are for research use only.",
          },
        ],
        style: "normal",
      },
    ],
  },
]

async function main() {
  console.log("Seeding blog posts to Sanity...")

  for (const post of blogPosts) {
    try {
      const result = await client.create(post)
      console.log(`Created: ${result.title} (${result._id})`)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("already exists")) {
        console.log(`Skipped (already exists): ${post.title}`)
      } else {
        console.error(`Failed to create ${post.title}:`, err)
      }
    }
  }

  console.log("Done!")
}

main().catch(console.error)
